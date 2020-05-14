import urlSearchParams from "@ungap/url-search-params";
import {APIErrors, IAPIErrorDef} from "./resources/APIErrors";
import {APITasks} from "./resources/APITasks";
import {APIAbortController} from "./APIAbortController";
import {APITask} from "./APITask";
import {FSIServerClientInterface} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IPathAndDir} from "./FSIServerClientUtils";
import {Queue} from "./Queue";
import {TaskController} from "./TaskController";
import {FSIServerClient} from "./index";
import {IHTTPOptions} from "./utils/IHTTPOptions";
import {IListData, IListEntry, IListOptions} from "./ListServer";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {IAPIErrorData} from "./APIError";
import {QueueProgress} from "./QueueProgress";
import {LogLevel} from "./LogLevel";

const URLSearchParams = urlSearchParams;
const regDirName: RegExp = /[\\/?*<>"|]/;

export interface ICopyOptions extends IHTTPOptions {
    overwrite?: boolean,
    fnRename?: (entry: IListEntry, subPath: string, tries: number) => string,
    autoRename?: boolean,
    autoRenameRetries?: number
}

export class FileOps {

    private baseURL: string;
    private readonly client: FSIServerClient;
    private readonly com: FSIServerClientInterface;

    constructor(private readonly classInit: IAPIClassInit, private readonly taskController: TaskController) {
        this.client = classInit.client;
        this.com = classInit.com;


        this.baseURL = this.client.getServerBaseQuery();
    }

    private static isValidDirName(name: string): boolean {
        return !name.match(regDirName);
    }

    private static getInvalidDirNameCharacters(name: string): string {
        let ret = "";
        const matches = name.match(regDirName);
        if (matches && typeof (matches) === "object" && matches.length > 0) {
            ret = matches[0];
        }

        return ret;
    }

    private static getCopyEntryTargetPath(baseSourcePath: string, entry: IListEntry, newPath: string): string {
        let ret: string;
        const pdSource = FSIServerClientUtils.FILE_AND_PATH(entry.path);
        newPath = FSIServerClientUtils.NORMALIZE_PATH(newPath);

        const subDir: string = FSIServerClientUtils.GET_SUB_DIR(baseSourcePath, pdSource.path);
        const targetDir = FSIServerClientUtils.JOIN_PATH(newPath, subDir);

        if (entry.type === "file") ret = targetDir +  pdSource.dir;
        else ret = FSIServerClientUtils.JOIN_PATH(targetDir, pdSource.dir);

        return ret;
    }

    public createDirectory(path: string, httpOptions: IHTTPOptions = {}): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(httpOptions.abortController)) {
            return this.com.getAbortPromise();
        }


        path = FSIServerClientUtils.NORMALIZE_PATH(path);
        path = path.replace(/\/$/, "");

        const pathAndDir: IPathAndDir = FSIServerClientUtils.EXTRACT_LAST_DIR(path);

        if (!FileOps.isValidDirName(pathAndDir.dir)) {
            return this.taskController.getErrorPromise(APIErrors.createDir, [path], APIErrors.invalidDirName, [FileOps.getInvalidDirNameCharacters(pathAndDir.dir)]);
        }

        const url = this.client.getServicePath('directory') + "/" + encodeURI(path);

        return this.com.putJsonBoolean(url, null,
            {def: APIErrors.createDir, content: [path]}, null, httpOptions);
    }

    public rename(oldPath: string, newPath: string, service: string, copyOptions: ICopyOptions = {}): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(copyOptions.abortController)) {
            return this.com.getAbortPromise();
        }

        if (service !== "directory" && service !== "file") {
            return this.taskController.getErrorPromise(
                APIErrors.rename, [oldPath, newPath],
                APIErrors.invalidServiceName, [service]);
        }

        if (service === "file") {
            oldPath = FSIServerClientUtils.NORMALIZE_FILE_PATH(oldPath);
            newPath = FSIServerClientUtils.NORMALIZE_FILE_PATH(newPath);
        } else {
            oldPath = FSIServerClientUtils.NORMALIZE_PATH(oldPath);
            newPath = FSIServerClientUtils.NORMALIZE_PATH(newPath);
        }

        const pd: IPathAndDir = FSIServerClientUtils.FILE_AND_PATH(newPath);

        if (!FileOps.isValidDirName(pd.dir)) {

            return this.taskController.getErrorPromise(
                APIErrors.rename, [oldPath, newPath],
                APIErrors.invalidNewName, [FileOps.getInvalidDirNameCharacters(pd.dir)]);
        }

        if (oldPath === newPath) {
            return FSIServerClientInterface.GET_TRUE_PROMISE();
        } else {

            const url = this.client.getServicePath(service) + "/" + encodeURI(oldPath);

            const query: URLSearchParams = new URLSearchParams();
            query.set("cmd", "move");
            query.set("to", newPath);
            if (copyOptions.overwrite) {
                query.set("overwrite", "true");
            }

            return this.taskController.postJsonBoolean(url, query,
                {def: APIErrors.rename, content: [oldPath, newPath]}, null, copyOptions);
        }
    }

    public move(oldPath: string, newPath: string, service: string): Promise<boolean> {
        return this.rename(oldPath, newPath, service);
    }

    public delete(path: string, service: string, httpOptions: IHTTPOptions): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(httpOptions.abortController)) {
            return this.com.getAbortPromise();
        }

        if (service === "directory") {
            path = FSIServerClientUtils.NORMALIZE_PATH(path);
        } else {
            path = FSIServerClientUtils.NORMALIZE_FILE_PATH(path);
        }

        const url = this.client.getServicePath(service) + "/" + encodeURI(path);

        const mainErrorDef: IAPIErrorDef = (service === "file") ? APIErrors.deleteFile : APIErrors.deleteDir;
        return this.com.deleteJsonBoolean(url,
            {def: mainErrorDef, content: [path]}, null, httpOptions);
    }

    public reImport(path: string, service: string, image: boolean = true, metaData: boolean = true, httpOptions: IHTTPOptions = {}): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(httpOptions.abortController)) {
            return this.com.getAbortPromise();
        }

        const query: URLSearchParams = new URLSearchParams();
        query.set("cmd", "reimport");

        const options: string[] = [];
        if (image) {
            options.push("image");
        }
        if (metaData) {
            options.push("metadata");
        }

        if (options.length === 0) {
            return this.taskController.getErrorPromise(APIErrors.reImportNothing);
        }

        query.set("options", options.join(","));

        const url = this.client.getServicePath(service) + "/" + encodeURI(path);

        const mainErrorDef: IAPIErrorDef = (service === "file") ? APIErrors.reImportFile : APIErrors.reImportDir;

        return this.taskController.postJsonBoolean(url, query, {def: mainErrorDef, content: [path]},
            null, httpOptions);
    }

    public reImportDir(path: string, image: boolean = true, metaData: boolean = true, httpOptions?: IHTTPOptions): Promise<boolean> {
        const pdSource = FSIServerClientUtils.FILE_AND_PATH(path);

        if (pdSource.error) {
            return this.taskController.getErrorPromise(APIErrors.reImportDir, [pdSource.error]);
        }

        return this.reImport(path, "directory", image, metaData, httpOptions);
    }

    public reImportFile(path: string, image: boolean = true, metaData: boolean = true, httpOptions?: IHTTPOptions): Promise<boolean> {
        const pdSource = FSIServerClientUtils.FILE_AND_PATH(path);

        if (pdSource.error) {
            return this.taskController.getErrorPromise(APIErrors.reImportFile, [pdSource.error]);
        }

        return this.reImport(path, "file", image, metaData, httpOptions);
    }

    public copyFile(path: string, toPath: string, copyOptions: ICopyOptions = {}): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(copyOptions.abortController)) {
            return this.com.getAbortPromise();
        }

        const pdSource = FSIServerClientUtils.FILE_AND_PATH(path);
        const pdTarget = FSIServerClientUtils.FILE_AND_PATH(toPath);
        let err: IAPIErrorData | undefined;

        if (pdSource.error) {
            err = {
                content: pdSource.errorContent,
                def: pdSource.error,
            };

        } else if (pdTarget.error) {
            err = {
                content: pdTarget.errorContent,
                def: pdTarget.error,
            };
        }

        if (err) {
            return this.taskController.getErrorPromise(APIErrors.copyFile, [path, toPath], err.def, err.content);
        }

        const url = this.client.getService("file") + "/" + encodeURI(path);

        const query: URLSearchParams = new URLSearchParams();
        query.set("cmd", "copy");
        query.set("to", toPath);
        if (copyOptions.overwrite === true) {
            query.set("overwrite", "true");
        }


        return this.taskController.postJsonBoolean(url, query,
            {def: APIErrors.copyFile, content: [path, toPath]}, null, copyOptions);
    }

    public copyDirectory(path: string, toPath: string, includingDir: boolean = true,
                         listOptions: IListOptions, queue?: Queue): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(listOptions.abortController)) {
            return this.com.getAbortPromise();
        }

        const self = this;

        let qPrg: QueueProgress | undefined;
        if (queue) {
            qPrg = queue.getProgressData();
        }

        path = FSIServerClientUtils.NORMALIZE_PATH(path);
        toPath = FSIServerClientUtils.NORMALIZE_PATH(toPath);

        const mainTask: APITask = this.taskController.setCurrentTask(LogLevel.debug, APITasks.copyDir, [path, toPath]);

        if (qPrg && queue) {
            qPrg.currentTask = mainTask;
            qPrg.task.length = 2;
            queue.onProgress(qPrg);
        }

        const ret: Promise<boolean> = new Promise((resolve, reject) => {

            const pdPath: IPathAndDir = FSIServerClientUtils.EXTRACT_LAST_DIR(path);

            // 1) create the requested target dir
            const pathAndDirTarget: IPathAndDir = FSIServerClientUtils.EXTRACT_LAST_DIR(toPath);

            if (!FileOps.isValidDirName(pathAndDirTarget.dir) || pathAndDirTarget.dir.length < 1 || pathAndDirTarget.path.length < 2) {
                return reject(self.com.err.get(APIErrors.copyDir, [path, toPath], APIErrors.invalidTargetPath));
            }

            if (includingDir) {
                toPath = FSIServerClientUtils.NORMALIZE_PATH(toPath + pdPath.dir);
            }


            const promise: Promise<boolean> = self.client.createDirectory(toPath,
                {overwrite: true, abortController: listOptions.abortController}, self.taskController);


            promise.then(() => {

                    // 2) get content from source dir

                    const listPromise: Promise<object> = self.client.listServer(path, listOptions);


                    listPromise.then(body => {
                        return body as IListData;
                    })
                        .then(ld => {

                            APIAbortController.THROW_IF_ABORTED(listOptions.abortController);

                            const entries: IListEntry[] = ld.entries;


                            if (qPrg && queue) {
                                qPrg.task.length = entries.length + 2;
                                qPrg.task.pos = 2;
                            }

                            const nLast: number = entries.length - 1;
                            for (let i = 0, p: Promise<boolean | void> = Promise.resolve(true); i < entries.length; i++) {

                                APIAbortController.THROW_IF_ABORTED(listOptions.abortController);


                                p = p.then(() => new Promise((resolveInner) => {

                                    APIAbortController.THROW_IF_ABORTED(listOptions.abortController);

                                    const entry: IListEntry = entries[i];
                                    const targetPath: string = FileOps.getCopyEntryTargetPath(path, entry, toPath);

                                    if (entries[i].type === "file") {
                                        self.taskController.setCurrentSubTask(LogLevel.debug,
                                            APITasks.copyFile, [entries[i].path, targetPath]);
                                    } else {
                                        self.taskController.setCurrentSubTask(LogLevel.debug,
                                            APITasks.createDir, [targetPath]);
                                    }


                                    if (qPrg && queue) {
                                        qPrg.task.pos = 2 + i;
                                        qPrg.currentTask = self.taskController.getCurrentTask();
                                        queue.onProgress(qPrg);
                                    }

                                    self.copyEntry(entry, targetPath, listOptions)
                                        .then(() => {

                                            resolveInner(true);

                                            if (i === nLast) { // all entries copied
                                                self.taskController.resetSubTask();
                                                resolve(true);
                                            }
                                        })
                                        .catch(err => {
                                            reject(err);
                                        })
                                }))
                            }

                        })
                        .catch(err => {
                            return reject(err);
                        })
                }
            )
                .catch(err => {
                    return reject(err);
                });
        });


        if (qPrg) {
            qPrg.currentTask = this.taskController.getCurrentTask();
        }

        return ret;
    }

    private copyEntry(entry: IListEntry, targetPath: string, listOptions: IListOptions): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(listOptions.abortController)) {
            return this.com.getAbortPromise();
        }


        if (entry.type === "file") {
            return this.copyFile(entry.path, targetPath, listOptions);
        } else {
            return this.createDirectory(targetPath, listOptions);
        }
    }
}
