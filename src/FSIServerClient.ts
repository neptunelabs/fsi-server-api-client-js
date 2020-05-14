import {ConsolePrompt} from "./ConsolePrompt";
import {QueueProgress} from "./QueueProgress";
import {TaskProgress} from "./TaskProgress";
import {InputChecks as chk} from "./InputChecks";
import {FSIServerClientInterface} from "./FSIServerClientInterface";
import {
    ListServer,
    ImportStatus,
    IAddEntryOptions,
    IListData,
    IListEntry,
    IListEntryUpload,
    IListOptions
} from "./ListServer";
import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";
import {TaskController} from "./TaskController";
import {ITranslations} from "./resources/TranslatableTemplate";
import {Queue, IQueueOptions} from "./Queue";
import {APIAbortController} from "./APIAbortController";
import {Login, ILoginReply} from "./Login";
import {APITasks, IAPITaskDef} from "./resources/APITasks";
import {APIErrors} from "./resources/APIErrors";
import {ListLocal} from "./ListLocal";
import {FileOps, ICopyOptions} from "./FileOps";
import {MetaDataClient, IMetaData, IMetaDataOptions} from "./MetaDataClient";
import {FSIServerClientUtils, IStringAnyMap} from "./FSIServerClientUtils";
import {Download, IDownloadOptions} from "./Download";
import {Upload, IUploadOptions} from "./Upload";
import {APIHTTPErrorCodes} from "./resources/APIHTTPErrorCodes";
import {IProgressFunction} from "./utils/IProgressFunction";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {IPromptFunction} from "./utils/IPromptFunction";
import {IHTTPOptions} from "./utils/IHTTPOptions";
import {IOptions} from "./utils/IOptions";
import {LogLevel} from "./LogLevel";
import {IArchiveType} from "./utils/IArchiveType";

const modeNode: boolean = FSIServerClientUtils.GET_MODE_NODE();


export default class FSIServerClient {

    // public exported constants
    public static readonly LogLevel = LogLevel;
    public static readonly ImportStatus = ImportStatus;
    public static readonly ArchiveType = IArchiveType;
    public static readonly utils = FSIServerClientUtils;
    // only defined in browsers, generated by webpack DefinePlugin in webpack.config.js
    public static readonly version = process.env.FSISERVERCLIENTVERSION;

    public static readonly connectorTypesAll: string = "*";
    public static readonly connectorTypesDefault: string[] = ["STORAGE", "MULTIRESOLUTION", "STATIC"];
    public static readonly connectorTypesImage: string[] = ["STORAGE", "MULTIRESOLUTION"];

    public static defaultProgress: IProgressFunction = {
        ctx: global,
        fn: FSIServerClient.DEFAULT_PROGRESS_FUNCTION
    };
    public static defaultPrompt: IPromptFunction = {
        ctx: global,
        fn: ConsolePrompt.GET
    };

    private maxRecursiveDepth: number = 255;
    private readonly com: FSIServerClientInterface;
    private fnProgress?: IProgressFunction;
    private fnPrompt?: IPromptFunction;
    private iAxios: AxiosInstance;
    private currentUser: string = "anonymous";
    private readonly taskController: TaskController;
    private clientId: number = Math.round(100000 * Math.random());
    private queueId: number = 1;
    private readonly classInit: IAPIClassInit;
    private static regExValidFileExtension = /(\.jpg|\.jpeg|\.tif|\.tiff|\.png|\.gif|\.bmp)$/;

    constructor(private readonly host: string) {

        chk.HOST(host);
        this.host = host + '/fsi/';

        this.com = new FSIServerClientInterface(this, LogLevel.warn);

        this.classInit = {
            client: this,
            com: this.com
        };

        this.taskController = new TaskController(this.classInit, "client #" + this.clientId);


        this.iAxios = axios.create({headers: {"Accept": "application/json"}});
        this.iAxios.defaults.validateStatus = (): boolean => {
            return true;
        };
    }

    public static DEFAULT_PROGRESS_FUNCTION(prg: QueueProgress | TaskProgress): void {

        let msg: string = "<" + prg.timeElapsed + "> ";
        const qPrg: QueueProgress = prg as QueueProgress;

        try {

            if (qPrg.task) {
                msg += "step " + qPrg.pos + "/" + qPrg.length + ": ";
                msg += qPrg.currentTask.getMessage() + " - task progress: " + qPrg.task.percent.toFixed(1) + "% progress: ";
                msg += qPrg.percent.toFixed(1) + "%, ETA TASK: " + qPrg.task.eta;
            } else {
                msg += prg.currentTask.getMessage() + " - progress: " + prg.percent.toFixed(1);
            }
        } catch (e) {
            console.error(e);
        }

        if (prg.bytesTotal) {
            msg += " " + prg.bytesDone + " / " + prg.bytesTotal + " bytes";
        }
        if (qPrg.task && qPrg.task.bytesTotal) {
            msg += " File: " + qPrg.task.bytesDone + " / " + qPrg.task.bytesTotal + " bytes";
        }

        console.log(msg);
    }

    public static HAS_VALID_IMAGE_FILE_EXTENSION(path: string, ignoreCase: boolean = true): boolean {
        chk.PATH(path);
        chk.BOOL(ignoreCase, "ignoreCase");

        let res: boolean = false;

        if (path && typeof (path.match) === "function") {
            if (ignoreCase) {
                path = path.toLowerCase();
            }

            const match: any[] | null = path.match(FSIServerClient.regExValidFileExtension);
            res = (match !== null);
        }

        return res;
    }

    public static VALIDATE_TRANSLATION(translation: { [key: string]: any }): boolean {
        chk.OBJ(translation, "translation");

        return FSIServerClientInterface.VALIDATE_TRANSLATION(translation);
    }

    public static FN_FILE_FILTER_VALID_IMAGES(listData: IListData, entry: IListEntry): Promise<boolean> {
        return new Promise((resolve) => {
            return resolve(FSIServerClient.HAS_VALID_IMAGE_FILE_EXTENSION(entry.src));
        });
    }

    public setProgressFunction(fnProgress: IProgressFunction | undefined): void {
        chk.FN_CTX_OR_UNDEFINED(fnProgress, "fnProgress");

        this.fnProgress = fnProgress;
    }

    public getProgressFunction(): IProgressFunction | undefined {
        return this.fnProgress;
    }

    public setPromptFunction(fnPrompt: IPromptFunction | undefined): void {
        chk.FN_CTX_OR_UNDEFINED(fnPrompt, "fnPrompt");
        this.fnPrompt = fnPrompt;
    }

    public getPromptFunction(): IPromptFunction | undefined {
        return this.fnPrompt;
    }

    public setLogLevel(level: LogLevel): void {
        chk.NUM(level, "level", LogLevel.trace, LogLevel.none);

        this.com.setLogLevel(level);
    }

    public getLogLevel(): LogLevel {
        return this.com.getLogLevel();
    }

    public setTranslations(translations: ITranslations): void{
        chk.OBJ(translations, "translations");

        this.com.setTranslations(translations);
    }

    public getTranslations(): ITranslations | undefined {
        return this.com.getTranslations();
    }

    public setMaxRecursiveDepth(n: number): number {
        if (!isNaN(n) && n > -1) {
            this.maxRecursiveDepth = n;
        }
        return this.maxRecursiveDepth;
    }

    public getMaxRecursiveDepth(): number {
        return this.maxRecursiveDepth;
    }

    public getServerBaseQuery(): string {
        return this.host + this.getServerBaseQueryPath();
    }

    public getServerBaseQueryPath(): string {
        return "server?";
    }

    public getServerBaseURL(): string {
        return this.host + "server";
    }


    public getService(serviceEndpoint: string): string {
        return this.host + 'service/' + serviceEndpoint.toLocaleLowerCase();
    }


    public getServicePath(serviceEndpoint: string): string {
        return 'service/' + serviceEndpoint;
    }

    public getHost(): string {
        return this.host;
    }

    public setCurrentUser(user: string): void {
        this.currentUser = user || "anonymous";
    }

    public getCurrentUser(): string {
        return this.currentUser;
    }

    public setSessionCookie(sessionCookie: string): void {
        this.com.setSessionCookie(sessionCookie);
    }

    public getSessionCookie(): string | null {
        return this.com.sessionCookie;
    }

    public getNewQueueId(): number {
        return this.queueId++;
    }

    public createQueue(options: IQueueOptions = {}): Queue {
        chk.OBJ(options, "options");
        if (options.fnProgress === undefined && this.fnProgress) {
            options.fnProgress = this.fnProgress;
        }

        return new Queue(this.classInit, options);
    }

    public isAbortError(err: any): boolean {
        return this.com.isAbortError(err);
    }

    public getNewAbortController(): APIAbortController {
        return this.com.getNewAbortController();
    }


    //region commands
    public login(username: string, password: string, options?: IOptions, taskController?: TaskController): Promise<ILoginReply> {
        chk.LOGIN(username, password);

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.login, [this.host, username]);

        return taskController.wrapObjPromise(
            new Login(this.classInit, taskController).authenticate(username, password, options)) as Promise<ILoginReply>;
    }

    public logout(options?: IOptions, taskController?: TaskController): Promise<boolean> {

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.logout, [this.host]);

        let ret: Promise<boolean>;

        if (modeNode && !this.com.bLoggedIn) {
            ret = taskController.getErrorPromise(APIErrors.logoutNotLoggedIn);
        } else {

            ret = taskController.wrapBoolPromise(
                new Login(this.classInit, taskController).logout(options));
        }

        return ret;
    }


    public listServer(path: string, options: IListOptions = {}, taskController?: TaskController): Promise<IListData> {
        chk.LIST_SERVER(path, options);

        taskController = this.initTaskController(taskController);

        taskController.setCurrentTask(LogLevel.debug, APITasks.readListServer, ["/" + path]);

        return taskController.wrapObjPromise(
            new ListServer(this.classInit, taskController).read(path, options)) as Promise<IListData>;

    }

    public listLocal(path: string, options: IListOptions = {}, taskController?: TaskController): Promise<IListData> {
        chk.PATH(path);
        chk.OBJ(options, "options");

        taskController = this.initTaskController(taskController);

        return taskController.wrapObjPromise(
            new ListLocal(this.classInit, taskController).read(path, options)) as Promise<IListData>;
    }

    public createDirectory(path: string, copyOptions?: ICopyOptions, taskController?: TaskController): Promise<boolean> {
        chk.PATH(path);

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.createDir, [path]);


        if (copyOptions && copyOptions.overwrite) {
            if (!copyOptions.ignoreErrors) {
                copyOptions.ignoreErrors = {};
            }

            copyOptions.ignoreErrors = {409: true};
        }

        return taskController.wrapBoolPromise(
            new FileOps(this.classInit, taskController).createDirectory(path, copyOptions)
        );
    }

    public renameFile(oldPath: string, newPath: string, copyOptions?: ICopyOptions, taskController?: TaskController): Promise<boolean> {
        taskController = this.initTaskController(taskController);
        return this.rename(oldPath, newPath, "file", copyOptions, false, taskController);
    }

    public renameDirectory(oldPath: string, newPath: string, copyOptions?: ICopyOptions, taskController?: TaskController): Promise<boolean> {
        taskController = this.initTaskController(taskController);
        return this.rename(oldPath, newPath, "directory", copyOptions, false, taskController);
    }

    public moveFile(oldPath: string, newPath: string, copyOptions?: ICopyOptions, taskController?: TaskController): Promise<boolean> {
        taskController = this.initTaskController(taskController);
        return this.rename(oldPath, newPath, "file", copyOptions, true, taskController);
    }

    public moveDirectory(oldPath: string, newPath: string, copyOptions?: ICopyOptions, taskController?: TaskController): Promise<boolean> {
        taskController = this.initTaskController(taskController);
        return this.rename(oldPath, newPath, "directory", copyOptions, true, taskController);
    }

    public reImportDir(path: string, image: boolean = true, metaData: boolean = true,
                       httpOptions?: IHTTPOptions, taskController?: TaskController): Promise<number> {
        chk.PATH(path);
        chk.RE_IMPORT(image, metaData);

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.reImportDir, [path]);

        return taskController.wrapNumberPromise(
            new FileOps(this.classInit, taskController).reImportDir(path, image, metaData, httpOptions));
    }

    public reImportFile(path: string, image: boolean = true, metaData: boolean = true,
                        httpOptions?: IHTTPOptions, taskController?: TaskController): Promise<number> {
        chk.PATH(path);
        chk.RE_IMPORT(image, metaData);

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.reImportFile, [path]);

        return taskController.wrapNumberPromise(
            new FileOps(this.classInit, taskController).reImportFile(path, image, metaData, httpOptions));
    }

    public deleteFile(path: string, httpOptions?: IHTTPOptions, taskController?: TaskController): Promise<boolean> {
        chk.PATH(path);

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.deleteFile, [path]);

        return this.delete(path, "file", httpOptions);
    }

    public deleteDirectory(path: string, httpOptions?: IHTTPOptions, taskController?: TaskController): Promise<boolean> {
        chk.PATH(path);

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.deleteDir, [path]);

        return this.delete(path, "directory", httpOptions);
    }

    public getMetaData(path: string, options: IMetaDataOptions = {}, taskController?: TaskController): Promise<IMetaData> {
        chk.PATH(path);
        chk.OBJ(options, "options");

        taskController = this.initTaskController(taskController);

        return taskController.wrapMetaPromise(
            new MetaDataClient(this.classInit, taskController).get(path, options));
    }

    public setMetaData(path: string, data: IMetaData, service: string = "file",
                       options: IMetaDataOptions = {}, taskController?: TaskController): Promise<boolean> {
        chk.META_DATA(path, data, service);

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new MetaDataClient(this.classInit, taskController).set(path, service, data, "saveMetaData", options));
    }

    public deleteMetaData(path: string, data: IMetaData, service: string = "file",
                          options: IMetaDataOptions = {}, taskController?: TaskController): Promise<boolean> {
        chk.META_DATA(path, data, service);

        taskController = this.initTaskController(taskController);


        return taskController.wrapBoolPromise(
            new MetaDataClient(this.classInit, taskController).delete(path, service, data, options));
    }

    public restoreMetaData(path: string, data: IMetaData, service: string = "file", options: IMetaDataOptions = {},
                           taskController?: TaskController): Promise<boolean> {
        chk.META_DATA(path, data, service);

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new MetaDataClient(this.classInit, taskController).restore(path, service, data, options));
    }

    public sendServiceCommand(src: string, service: string, commands: string,
                              options: IHTTPOptions = {}, taskController?: TaskController): Promise<boolean> {

        chk.PATH(src, "src");
        chk.PATH(service, "service");
        chk.PATH(commands, "command");
        chk.OBJ(options, "options");

        service = service.toLocaleLowerCase();

        const self = this;
        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.sendServiceCommand, [commands, service, src]);

        return new Promise((resolve, reject) => {

            let url: string = self.getService(service);
            if (src) {

                if (service === "jobqueue"){
                    const q = new URLSearchParams(commands);
                    q.set("id", src);
                    commands = q.toString();
                }
                else {
                    url += "/" + encodeURIComponent(src);
                }
            }


            self.httpPost(url, commands, options)
                .then((res) => {

                    if (res && res.data && res.data.statuscode === 200) {
                        resolve(true);
                    } else {
                        reject(self.com.err.get(APIErrors.invalidServerReply));
                    }
                })
                .catch(reject);
        });
    }

    public changePassword(currentPassword: string, newPassWord: string,
                          options: IHTTPOptions = {}, taskController?: TaskController): Promise<boolean> {
        chk.PATH(currentPassword, "currentPassword");
        chk.PATH(newPassWord, "newPassWord");
        chk.OBJ(options, "options");

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.changePassWord, [this.getCurrentUser()]);

        return taskController.wrapBoolPromise(
            new Login(this.classInit, taskController).changePassword(currentPassword, newPassWord, options));
    }

    public changeUser(user: string, options: IHTTPOptions = {}, taskController?: TaskController): Promise<boolean> {
        chk.PATH(user, "user");
        chk.OBJ(options, "options");

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.changeUser, [user]);

        return new Login(this.classInit, taskController).changeUser(user, options);
    }

    public getUserList(options: IHTTPOptions = {}, taskController?: TaskController): Promise<string[]> {
        chk.OBJ(options, "options");

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.getUserList);

        return taskController.wrapObjPromise(
            new Login(this.classInit, taskController).getUserList(options)) as Promise<string[]>;
    }


    public copyDirectory(path: string, toPath: string, listOptions: IListOptions = {},
                         taskController?: TaskController, queue?: Queue,): Promise<boolean> {
        chk.COPY(path, toPath, listOptions);

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new FileOps(this.classInit, taskController).copyDirectory(path, toPath, true, listOptions, queue));

    }

    public copyDirectoryContent(path: string, toPath: string, listOptions: IListOptions = {},
                                taskController?: TaskController, queue?: Queue): Promise<boolean> {
        chk.COPY(path, toPath, listOptions);

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new FileOps(this.classInit, taskController).copyDirectory(path, toPath, false, listOptions, queue));
    }

    public copyFile(path: string, toPath: string, copyOptions?: ICopyOptions, taskController?: TaskController): Promise<boolean> {
        chk.PATH(path);
        chk.PATH(toPath, "toPath");

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.copyFile, [path, toPath]);

        return taskController.wrapBoolPromise(
            new FileOps(this.classInit, taskController).copyFile(path, toPath, copyOptions));
    }


    public addEntries(paths: string[], options: IListOptions = {}, taskController?: TaskController): Promise<IListData[]> {
        chk.STRING_ARRAY(paths, "paths");
        chk.OBJ(options, "options");

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.addEntries, [paths.length]);

        return taskController.wrapObjPromise(
            new ListServer(this.classInit, taskController).addEntries(paths, options)) as Promise<IListData[]>;

    }


    public addEntryObjects(entries: IStringAnyMap[], options: IListOptions = {},
                           addOptions: IAddEntryOptions = {}, taskController?: TaskController): Promise<IListData[]> {
        chk.OBJECT_ARRAY(entries, "paths");
        chk.OBJ(options, "options");
        chk.OBJ(addOptions, "addOptions");

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug, APITasks.addEntries, [entries.length]);

        return taskController.wrapObjPromise(
            new ListServer(this.classInit, taskController).addEntryObjects(entries, options, addOptions)) as Promise<IListData[]>;
    }


    public download(pathOrEntry: string | IListEntry, targetPath: string,
                    options?: IDownloadOptions, taskController?: TaskController): Promise<boolean> {
        chk.OBJECT_OR_STRING(pathOrEntry, "pathOrEntry");
        chk.PATH(targetPath, "targetPath");

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new Download(this.classInit, taskController).save(pathOrEntry, targetPath, options));
    }

    public downloadICCProfile(pathOrEntry: string | IListEntry, targetPath: string,
                              options?: IDownloadOptions, taskController?: TaskController): Promise<boolean> {
        chk.OBJECT_OR_STRING(pathOrEntry, "pathOrEntry");
        if (modeNode) {
            chk.PATH(targetPath, "targetPath");
        }

        if (!options) {
            options = {};
        }
        options.getICCProfile = true;

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new Download(this.classInit, taskController).save(pathOrEntry, targetPath, options));
    }

    public upload(source: string | IListEntryUpload, targetPath: string,
                  options: IUploadOptions = {}, taskController?: TaskController): Promise<boolean> {
        chk.OBJECT_OR_STRING(source, "pathOrEntry");
        chk.PATH(targetPath, "targetPath");
        chk.OBJ(options, "options");

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new Upload(this.classInit, taskController).store(source, targetPath, options));
    }

    public directoryContains(path: string, files: string[] = [], directories: string[] = [],
                             options: IOptions = {}, taskController?: TaskController): Promise<boolean> {
        chk.PATH(path);
        chk.STRING_ARRAY_OR_EMPTY_ARRAY(files, "files");
        chk.STRING_ARRAY_OR_EMPTY_ARRAY(directories, "directories");

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new ListServer(this.classInit, taskController).directoryContains(path, files, directories, options));
    }

    public getAxiosRequestConfigUserAgent(options?: IHTTPOptions, headers?: IStringAnyMap): AxiosRequestConfig {
        const ret = this.getAxiosRequestConfig(options, headers);
        if (modeNode) {
            if (!ret.headers) ret.headers = {};
            ret.headers['User-Agent'] = FSIServerClientUtils.USERAGENT;
        }

        return ret;
    }

    public getAxiosRequestConfig(options?: IHTTPOptions, headers?: IStringAnyMap): AxiosRequestConfig {
        const ret: AxiosRequestConfig = {};

        if (options) {
            if (options.abortController) {
                ret.cancelToken = options.abortController.getAxiosCancelToken();
            }
            if (options.responseType) {
                ret.responseType = options.responseType;
            }
        }

        if (headers) {
            ret.headers = headers;
        }

        return ret;
    }


    public httpHead(url: string, options?: IHTTPOptions, headers?: IStringAnyMap): Promise<AxiosResponse> {
        return this.request(this.iAxios.head(url, this.getAxiosRequestConfigUserAgent(options, headers)));
    }

    public httpGet(url: string, options?: IHTTPOptions, headers?: IStringAnyMap): Promise<AxiosResponse> {
        return this.request(this.iAxios.get(url, this.getAxiosRequestConfigUserAgent(options, headers)));
    }

    public httpDelete(url: string, options?: IHTTPOptions, headers?: IStringAnyMap): Promise<AxiosResponse> {
        return this.request(this.iAxios.delete(url, this.getAxiosRequestConfigUserAgent(options, headers)));
    }

    public httpPost(url: string, payload: any, options?: IHTTPOptions, headers?: IStringAnyMap): Promise<AxiosResponse> {
        return this.request(this.iAxios.post(url, payload, this.getAxiosRequestConfigUserAgent(options, headers)));
    }

    public httpPut(url: string, payload: any, options?: IHTTPOptions, headers?: IStringAnyMap): Promise<AxiosResponse> {
        return this.request(this.iAxios.put(url, payload, this.getAxiosRequestConfigUserAgent(options, headers)));
    }

    public async hash(str: string): Promise<string> {
        return new Login(this.classInit, this.taskController).getSha256Hash(str);
    }

    public formatTimePeriod(ms: number, includeMS: boolean = false, bHuman: boolean = true): string {

        return FSIServerClientUtils.FORMAT_TIME_PERIOD(ms, includeMS, bHuman, this.com.getTranslations().timePeriods);
    }


    private rename(oldPath: string, newPath: string, strService: string,
                   copyOptions: ICopyOptions = {}, move: boolean = false,
                   taskController: TaskController
    ): Promise<boolean> {
        chk.RENAME(oldPath, newPath);
        chk.SERVICE_FD(strService);
        chk.BOOL(move, "move");

        oldPath = FSIServerClientUtils.NORMALIZE_PATH(oldPath);
        newPath = FSIServerClientUtils.NORMALIZE_PATH(newPath);

        let taskDef: IAPITaskDef;
        if (strService === "file") {
            taskDef = (move) ? APITasks.moveFile : APITasks.renameFile;
        } else {
            taskDef = (move) ? APITasks.moveDir : APITasks.renameDir;
        }

        taskController = this.initTaskController(taskController);
        taskController.setCurrentTask(LogLevel.debug,
            taskDef,
            [oldPath, newPath]);

        return taskController.wrapBoolPromise(
            new FileOps(this.classInit, taskController).rename(oldPath, newPath, strService, copyOptions));

    }

    private delete(path: string, strService: string,
                   httpOptions: IHTTPOptions = {}, taskController?: TaskController): Promise<boolean> {
        chk.PATH(path);
        chk.SERVICE_FD(strService);

        taskController = this.initTaskController(taskController);

        return taskController.wrapBoolPromise(
            new FileOps(this.classInit, taskController).delete(path, strService, httpOptions));
    }

    //endregion

    private request(p: Promise<AxiosResponse>): Promise<AxiosResponse> {

        return new Promise((resolve, reject) => {
            p
                .then(res => {
                    if (res.status > 399) {
                        reject(this.com.err.get(APIErrors.httpErrorShort, [APIHTTPErrorCodes.GET_CODE(res.status)]));
                    } else {
                        resolve(res);
                    }

                })
                .catch(reject)

        });
    }

    private initTaskController(taskController: TaskController | undefined): TaskController {
        if (!taskController) {
            taskController = this.taskController;
            taskController.reset();
        }

        return taskController;
    }
}
