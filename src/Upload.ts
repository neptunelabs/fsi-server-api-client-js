import {AxiosRequestConfig} from "axios";
import {default as fs, ReadStream} from "fs";
import URLSearchParams from "@ungap/url-search-params";
import {APIErrors} from "./resources/APIErrors";
import {APIHTTPErrorCodes} from "./resources/APIHTTPErrorCodes";
import {APITasks, IAPITaskDef} from "./resources/APITasks";
import {APIAbortController} from "./APIAbortController";
import {APIError} from "./APIError";
import {FileOps} from "./FileOps";
import {FSIServerClientInterface, IOverwriteReply, IProgressOptions, IPromptReply} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IPathAndDir, IStringAnyMap, IStringStringMap} from "./FSIServerClientUtils";
import {TaskController} from "./TaskController";
import {TaskProgress} from "./TaskProgress";
import {FSIServerClient} from "./index";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {IListEntryUpload, IListOptions} from "./ListServer";
import {LogLevel} from "./LogLevel";

const modeNode: boolean = FSIServerClientUtils.GET_MODE_NODE();

export interface IUploadOptions extends IProgressOptions {
    fileName?: string,
    flattenTargetPath?: boolean,
    overwriteExisting?: boolean,
    downloadProgress?: boolean
}

interface IDOMFileNeLa extends File {
    size: number,
    stream: any
}

interface IHeaderValues {
    [key: string]: any
}

export class Upload {

    private readonly baseURL: string;
    private readonly client: FSIServerClient;
    private readonly com: FSIServerClientInterface;


    constructor(private readonly classInit: IAPIClassInit, private taskController: TaskController) {

        this.client = classInit.client;
        this.com = classInit.com;

        this.baseURL = this.client.getServerBaseQuery();
    }


    public store(source: string | IListEntryUpload, targetPath: string, options: IUploadOptions = {}): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(options.abortController)) {
            return this.com.getAbortPromise();
        }

        const self = this;
        let sourcePath: string;
        let entry: IListEntryUpload | null;
        let file: IDOMFileNeLa | null;

        if (typeof (source) === "string") {
            sourcePath = source;
            entry = null;
            file = null;
        } else {
            sourcePath = source.path;
            entry = source;
            file = entry.file as IDOMFileNeLa
        }

        const rejectWithError = (reject: (arg: any) => void, err: APIError): void => {

            if (this.com.isAbortError(err)) {
                return reject(self.com.err.get(APIErrors.upload, [sourcePath], APIErrors.userAborted));
            } else {
                const mainError = self.com.err.get(APIErrors.upload, [sourcePath]);
                mainError.setSubError(err);
                return reject(mainError);
            }
        };

        if (options.fnProgress !== undefined || options._fnQueueProgress !== undefined) {
            options._taskProgress = new TaskProgress();
            options._taskProgress.currentTask = this.com.taskSupplier.get(APITasks.uploadFile, [sourcePath]);
        }

        if (entry && entry.type === "directory" && options.flattenTargetPath) {
            this.taskController.setCurrentTask(LogLevel.trace, APITasks.skipUploadDirFlatten, [sourcePath]);
            return FSIServerClientInterface.GET_TRUE_PROMISE();
        }

        targetPath = FSIServerClientUtils.NORMALIZE_PATH(targetPath);

        const pd: IPathAndDir = FSIServerClientUtils.FILE_AND_PATH(sourcePath);

        let mimeType: string | false = this.com.lookupMimeType(pd.dir);
        if (!mimeType) {
            mimeType = "application/unknown";
        }

        const fileName: string = (options.fileName) ? options.fileName : pd.dir;

        let relPath: string = "";
        if (!options.flattenTargetPath) {
            relPath = FSIServerClientUtils.MAKE_RELATIVE_PATH(pd.path);
        }

        const targetDir = FSIServerClientUtils.NORMALIZE_PATH(targetPath + relPath);
        const finalPath: string = targetDir + fileName;


        const onCreateDirError = async (httpStatus: number): Promise<IOverwriteReply> => {
            if (httpStatus === 409) {
                self.callProgress(LogLevel.trace, options, APITasks.skipUploadDir, [finalPath]);
                return {
                    continue: true,
                    reply: ""
                };
            } else {
                return {
                    continue: false,
                    reply: ""
                };
            }
        };

        if (entry && entry.type === "directory") {

            this.taskController.setCurrentTask(LogLevel.debug, APITasks.createDir, [finalPath]);
            return new FileOps(this.classInit, this.taskController).createDirectory(finalPath,
                {
                    abortController: options.abortController,
                    handleIgnoredError: onCreateDirError,
                    ignoreErrors: {409: true}
                });
        } else {
            this.taskController.setCurrentTask(LogLevel.debug, APITasks.uploadFile, [sourcePath]);
        }

        return new Promise(async (resolve, reject): Promise<any> => {

            let headersPromise: Promise<IHeaderValues>;
            if (entry && file) {
                headersPromise = self.getHeadersFromEntry(entry, mimeType);
            } else {
                headersPromise = self.getHeadersFromFile(sourcePath, mimeType);
            }

            APIAbortController.THROW_IF_ABORTED(options.abortController);

            headersPromise.then(headers => {
                APIAbortController.THROW_IF_ABORTED(options.abortController);

                let existPromise: Promise<any>;

                if (!options.overwriteExisting || options.fnPrompt) {

                    const q = new URLSearchParams();

                    q.set("Filename", fileName);
                    q.set("Dir", targetDir);
                    q.set("Lastmodified", headers['Last-Modified']);
                    q.set("Filesize", headers['Content-Length']);

                    existPromise = this.com.iAxios.post(
                        self.client.getServicePath("postupload"),
                        q,
                        this.com.getAxiosRequestConfig(options)
                    );

                } else {
                    existPromise = new Promise((resolveExists) => {
                        return resolveExists({data: {statuscode: 102}});
                    });
                }

                existPromise
                    .then(async (response) => {
                        APIAbortController.THROW_IF_ABORTED(options.abortController);
                        const data: IStringAnyMap | null = (response.data) ? response.data : null;

                        if (!data || (data.statuscode !== 202 && data.statuscode !== 404)) {

                            if (data && data.statuscode) {

                                if (data.statuscode === 102) {

                                    let reply: string = "";
                                    if (options.fnPrompt) {
                                        const res: IPromptReply = await self.com.getOverwriteReply(options, finalPath,
                                            this.taskController);
                                        reply = res.reply;
                                    }

                                    if ((!reply && !options.overwriteExisting) || reply === "skip") {
                                        self.callProgress(LogLevel.trace, options, APITasks.skipUpload, [finalPath]);
                                        return resolve(false);
                                    } else if (reply === "cancel") {
                                        reject(self.com.err.get(APIErrors.userAborted));
                                    }

                                } else {
                                    return reject(self.com.err.get(APIErrors.upload, [sourcePath],
                                        APIErrors.httpErrorShort, [APIHTTPErrorCodes.GET_CODE(data.statuscode)]));
                                }
                            } else {

                                if (response.status > 399) {
                                    return reject(self.com.err.get(APIErrors.upload, [sourcePath],
                                        APIErrors.httpErrorShort, [APIHTTPErrorCodes.GET_CODE(response.status)]));
                                }

                                return reject(self.com.err.get(APIErrors.invalidServerReply));
                            }
                        }

                        let stream: ReadStream;

                        if (entry && file) {
                            stream = file as any;
                        } // from dropped file in browser
                        else { // node local file
                            stream = fs.createReadStream(sourcePath);
                            stream.on("error", err => {
                                return reject(self.com.err.get(APIErrors.upload, [sourcePath],
                                    APIErrors.anyError, [err.message]));
                            });
                        }

                        // start file upload
                        this.uploadFile(sourcePath, finalPath, stream, headers, options)
                            .then(() => {
                                return resolve(true);
                            })
                            .catch(err => {
                                return rejectWithError(reject, err);
                            });
                    })
                    .catch(err => {
                        return rejectWithError(reject, err);
                    });
                // end exists promise
            })
                .catch(err => {
                    return rejectWithError(reject, err);
                });
            // end headers promise
        });
    }

    private callProgress(level: number, theOptions: IListOptions, apiTaskDef: IAPITaskDef, content: any[],
                         pos: number = 0, length: number = 0): void {
        if (theOptions._taskProgress) {
            theOptions._taskProgress.bytesTotal = length;
            theOptions._taskProgress.bytesDone = pos;
        }

        this.taskController.onStepProgress(level, theOptions, apiTaskDef, content, pos, length);
    }

    private getHeadersFromFile(sourcePath: string, theMimeType: string | false): Promise<IHeaderValues> {

        return new Promise((resolve, reject) => {

            fs.stat(sourcePath, (error, stat) => {

                if (error) {
                    return reject(this.com.err.get(APIErrors.anyError, [error.message]));
                } else {
                    resolve({
                        "Accept": null,
                        "Content-Length": stat.size,
                        "Content-Type": theMimeType,
                        "Last-Modified": Math.floor(stat.mtimeMs),
                    });
                }
            });
        });
    }

    private getHeadersFromEntry(theEntry: IListEntryUpload, mime: string | false): Promise<IHeaderValues> {

        return new Promise((resolve) => {
            resolve({
                "Accept": null,
                "Content-Length": theEntry.size,
                "Content-Type": theEntry.mime || mime,
                "Last-Modified": theEntry.lastModified,
            });
        });
    }

    private uploadFile(sourcePath: string, path: string, stream: any, headers: IStringStringMap,
                       options: IListOptions): Promise<boolean> {

        const self = this;
        const url = self.client.getServicePath("image") + "/" + encodeURIComponent(path);
        const bSafeHeaders: boolean = !modeNode;
        const bytesTotal: number = parseInt(headers["Content-Length"], 10);
        if (bSafeHeaders) {
            delete headers["Content-Length"];
        }

        const setProgress = (done: number, total: number): void => {
            if (options._taskProgress) {
                options._taskProgress.bytesTotal = done;
                options._taskProgress.bytesDone = total;
            }
        };

        const onProgress = (done: number, total: number): void => {
            self.callProgress(-1, options, APITasks.uploadFile, [sourcePath],
                done, total);
        };


        const config: AxiosRequestConfig = this.com.getAxiosRequestConfig(options, headers);
        config.onUploadProgress = (progressEvent: ProgressEvent): void => {
            onProgress(progressEvent.loaded, progressEvent.total);
        };


        setProgress(0, bytesTotal);

        return new Promise((resolve, reject) => {

            this.com.iAxios.put(url, stream, config)
                .then((res) => {

                    setProgress(bytesTotal, bytesTotal);
                    if (res.status > 399) {
                        reject(self.com.err.get(APIErrors.httpErrorShort, [APIHTTPErrorCodes.GET_CODE(res.status)]));
                    } else {
                        resolve(true);
                    }


                })
                .catch(err => {
                    reject(err);
                });
        });
    }
}
