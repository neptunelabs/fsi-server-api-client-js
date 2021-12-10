import {AxiosRequestConfig} from "axios";
import {default as fs} from "fs";
import urlSearchParams from "@ungap/url-search-params";
import {APIErrors, IAPIErrorDef} from "./resources/APIErrors";
import {APITasks, IAPITaskDef} from "./resources/APITasks";
import {APIAbortController} from "./APIAbortController";
import {FSIServerClientInterface, IProgressOptions, IPromptReply} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IPathAndDir, IStringStringMap} from "./FSIServerClientUtils";
import {IListData, IListEntry, IListEntryDownload, IListOptions} from "./ListServer";
import {TaskController} from "./TaskController";
import {TaskProgress} from "./TaskProgress";
import {FSIServerClient} from "./index";
import {IArchiveType} from "./utils/IArchiveType";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {LogLevel} from "./LogLevel";

const URLSearchParams = urlSearchParams;
const modeNode: boolean = FSIServerClientUtils.GET_MODE_NODE();

export interface IRenderOptions {
    width?: number,
    height?: number,
    format?: string,
    ditherer?: string,
    effects?: string,
    quality?: number,
    maxColors?: number,
    overlays?: string,
    quantizer?: string,
    renderer?: string,
    colorspace?: string,
    backgroundColor?: string,
    bottom?: number,
    left?: number,
    top?: number,
    right?: number,
    pixelbottom?: number,
    pixelleft?: number,
    pixeltop?: number,
    pixelright?: number,
    rect?: string,
    referencewidth?: number,
    referenceheight?: number,
}

export interface IFnOnDownloadID {
    ctx: any,
    fn: (id: string) => void
}

export interface IDownloadOptions extends IProgressOptions {
    fileName?: string,
    fnRename?: (entry: IListEntry) => string,
    replaceFileExtension?: boolean,
    flattenTargetPath?: boolean,
    renderOptions?: IRenderOptions,
    renderingQuery?: string,
    overwriteExisting?: boolean,
    getICCProfile?: boolean,
    archiveType?: IArchiveType,
    createArchiveOnly?: boolean,
    fnOnArchiveID?: IFnOnDownloadID,
    _downloadFiles?: string[],
    queued?: boolean,
    downloadProgress?: boolean,
    scheduleDate?: number,
    archiveName?: string
}

interface IFileAccess {
    writeable: boolean,
    exists: boolean,
    err: Error | undefined
}

export class Download {
    private readonly baseURL: string;
    private readonly client: FSIServerClient;
    private readonly com: FSIServerClientInterface;

    constructor(private readonly classInit: IAPIClassInit, private taskController: TaskController) {
        this.client = classInit.client;
        this.com = classInit.com;

        this.baseURL = this.client.getServerBaseQuery();
    }

    public save(pathOrEntry: string | IListEntry, targetPathArg: any, options: IDownloadOptions = {}): Promise<boolean> {

        let targetPath: string = (typeof(targetPathArg) !== "string")?"":targetPathArg;

        const self = this;
        const taskDef: IAPITaskDef = (modeNode) ? APITasks.downloadFile : APITasks.preparingFile;
        const downloadAbortController: APIAbortController = this.com.getNewAbortController();
        let streamTempName: string = "";
        let streamFinalName: string = "";
        let success: boolean = true;

        const setSubTaskTemporary = (): void => {
            if (options._taskProgress) {
                options._taskProgress.temporary = true;
            }
        };


        const path: string = (typeof (pathOrEntry) === "string") ? pathOrEntry : pathOrEntry.path;

        if (options.fnProgress !== undefined || options._fnQueueProgress !== undefined) {
            options._taskProgress = new TaskProgress();
            options._taskProgress.currentTask = this.com.taskSupplier.get(APITasks.downloadFile, [path]);
        }


        targetPath = FSIServerClientUtils.NORMALIZE_PATH(targetPath);

        let logPath: string = path;
        if (options.getICCProfile) {
            logPath += ".icc";
        }

        const onProgress = (loaded: number, total: number): void => {

            self.taskController.onStepProgress(-1, options, APITasks.downloadFile, [logPath], loaded, total);

            if (options._taskProgress) {
                options._taskProgress.bytesTotal = total;
                options._taskProgress.bytesDone = loaded;
            }

            if (options._taskProgress && options.fnProgress) {
                options.fnProgress.fn.call(
                    options.fnProgress.ctx,
                    options._taskProgress
                );
            }
        };

        this.taskController.setCurrentTask(0, taskDef, [logPath]);

        APIAbortController.THROW_IF_ABORTED(options.abortController);

        if (!modeNode || options.archiveType) {
            return this.addFileToDownload(path, options);
        }


        let stream: fs.WriteStream;

        const mainPromise = new Promise<boolean>((resolve, reject) => {

            APIAbortController.THROW_IF_ABORTED(options.abortController);

            const rejectWithError = (err: Error | null, cnt: any[] = [], errDef: IAPIErrorDef = APIErrors.anyError): void => {

                if (err) {
                    return reject(err);
                } else {
                    return reject(self.com.err.get(APIErrors.downloadFile, [path],
                        errDef, cnt));
                }
            };

            const pf: IPathAndDir = FSIServerClientUtils.FILE_AND_PATH(path);
            if (pf.error !== undefined) {
                rejectWithError(null, [pf.errorContent], pf.error);
            }


            if (options.fileName) {
                pf.dir = options.fileName;
            }


            let mkDirPromise: Promise<void>;

            if (!options.flattenTargetPath) {
                targetPath = FSIServerClientUtils.JOIN_PATH(targetPath, pf.path);

                mkDirPromise = new Promise((resolveMkDir, rejectMkDir) => {
                    try {
                        fs.mkdirSync(targetPath, {recursive: true});

                        resolveMkDir();
                    } catch (err) {
                        rejectMkDir(err)
                    }
                });
            } else {
                mkDirPromise = new Promise((resolveMkDir) => {
                    return resolveMkDir();
                });
            }

            targetPath = FSIServerClientUtils.NORMALIZE_PATH(targetPath);

            const createStream = async (headers: IStringStringMap): Promise<void> => {


                if (options.getICCProfile === true) {
                    pf.dir += ".icc";
                } else if ((options.renderingQuery || options.renderOptions !== undefined)
                    && typeof (headers["content-type"]) === "string") {

                    const val: string | null = headers["content-type"];
                    let ext: string | false = false;
                    if (val) {
                        ext = self.com.lookupMimeExtension(val);
                    }


                    if (ext && ext.length > 0) {
                        if (!options.replaceFileExtension) {
                            pf.dir += "." + ext;
                        } else {
                            pf.dir = FSIServerClientUtils.REPLACE_FILE_EXTENSION(pf.dir, ext);
                        }
                    }
                }

                // check overwrite
                let reply: string = "";

                streamFinalName = targetPath + pf.dir;
                streamTempName = targetPath + pf.dir + ".tmp";


                const getFileAccess = (thePath: string): IFileAccess => {

                    const ret: IFileAccess = {
                        err: undefined,
                        exists: true,
                        writeable: false
                    };

                    try {
                        fs.accessSync(thePath, fs.constants.W_OK);
                        ret.writeable = true;
                    } catch (err:any) {

                        if (err.code !== 'ENOENT') { // error is not "file does not exist"
                            ret.exists = true;
                            ret.err = err;
                        } else {
                            ret.writeable = true;
                            ret.exists = false;
                        }
                    }

                    if (ret.writeable && ret.exists) {
                        try {
                            const stat: fs.Stats = fs.statSync(thePath);

                            if (stat.isDirectory()) {
                                ret.writeable = false;
                                ret.err = self.com.err.get(APIErrors.downloadFile, [path],
                                    APIErrors.isDirectory, [thePath]);
                            }
                        } catch (err:any) {
                            ret.err = err;
                        }
                    }

                    return ret;
                };


                const accessFinal: IFileAccess = getFileAccess(streamFinalName);
                if (!accessFinal.writeable) {
                    return reject(accessFinal.err);
                }

                const accessTemp: IFileAccess = getFileAccess(streamTempName);
                if (!accessTemp.writeable) {
                    return reject(accessFinal.err);
                }


                if (accessFinal.exists && !options.overwriteExisting) {
                    if (options.fnPrompt) {
                        const res: IPromptReply = await self.com.getOverwriteReply(options, targetPath + pf.dir, this.taskController);
                        reply = res.reply;
                    }

                    if (!reply || reply === "skip") {
                        setSubTaskTemporary();
                        self.callProgress(LogLevel.trace, options, APITasks.skipDownload, [targetPath + pf.dir]);

                        // abort the axios download request
                        downloadAbortController.abort();

                        return resolve(false);
                    } else if (reply === "cancel") {
                        return reject(self.com.err.get(APIErrors.userAborted));
                    }
                }

                // create file stream
                try {
                    stream = fs.createWriteStream(streamTempName);
                } catch (err) {
                    return reject(err);
                }


                stream.on("close", (): void => {

                    if (success) {

                        const lmDate: string | null = headers["last-modified"];
                        if (lmDate) {
                            const lm: number = Math.floor(new Date(lmDate).getTime());

                            if (!isNaN(lm)) {
                                // set last modified from server
                                fs.utimesSync(streamTempName, new Date(), new Date(lmDate));
                            }
                        }

                        // rename .tmp in final name
                        fs.rename(streamTempName, streamFinalName, (err) => {
                            if (err) {
                                return reject(err);
                            } else {
                                return resolve(true);
                            }
                        });
                    } else {
                        fs.unlink(streamTempName, (err) => {
                            if (err) {
                                self.taskController.errorNative(err);
                            }
                        });
                    }
                });

                stream.on("error", (err) => {
                    stream.close();
                    return reject(err);
                });
            };


            mkDirPromise.then(() => {

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                const url: string = self.getDownloadURL(path, options);

                const config: AxiosRequestConfig = this.com.getAxiosRequestConfig(
                    {abortController: downloadAbortController}, {Accept: "*/*"});
                config.responseType = "stream";

                this.com.getResponse(
                    url,
                    undefined,
                    config
                )
                    .then(async response => {

                        APIAbortController.THROW_IF_ABORTED(options.abortController);

                        if (options._taskProgress) {
                            options._taskProgress.bytesTotal = parseInt(response.headers["content-length"], 10);
                            options._taskProgress.bytesDone = 0;
                        }

                        await createStream(response.headers);

                        if (stream) {
                            response.data.pipe(stream);

                            let timeLast: number = FSIServerClientUtils.NOW();
                            const totalSize:number = parseInt(response.headers['content-length']);
                            let downloaded: number = 0;

                            response.data.on('data', (chunk: ArrayBuffer) => {
                                downloaded += chunk.byteLength;

                                const now = FSIServerClientUtils.NOW();

                                if (now - timeLast > 500) {
                                    timeLast = now;
                                    onProgress(downloaded, totalSize);
                                }

                                if (APIAbortController.IS_ABORTED(options.abortController)) {
                                    rejectWithError(self.com.err.get(APIErrors.userAborted));
                                }
                            });

                            response.data.on('end', () => {
                                onProgress(downloaded, totalSize);
                            });

                            response.data.on('error', (err: Error) => {
                                stream.close();
                                return rejectWithError(err);
                            });
                        }
                    })
                    .catch(err => {
                        return rejectWithError(err);
                    });
            })
                .catch(err => {
                    return rejectWithError(err);
                });
        });

        return new Promise((resolveMain, rejectMain) => {

            mainPromise
                .then(resolveMain)
                .catch((err: Error) => {
                    success = false;
                    // abort the axios download request if any
                    downloadAbortController.abort();
                    rejectMain(err);
                });
        });
    }

    public createAndDownloadArchive(options: IDownloadOptions): Promise<string> {

        const self: any = this;

        return new Promise((resolve, reject) => {

            self.createDownloadArchive(options, true)
                .then((downloadID: string) => {

                    if (!downloadID) {
                        return resolve("");
                    } else {
                        self.downloadArchive(options, downloadID)
                            .then(() => {

                                if (downloadID === "file") {
                                    resolve(downloadID);
                                } else {
                                    self.client.delete("_downloads/" + FSIServerClient.ENCODE_PATH(downloadID), "file")
                                        .then(() => {
                                            resolve(downloadID);
                                        })
                                        .catch(reject);
                                }
                            })
                            .catch(reject);
                    }
                })
                .catch(reject);
        });
    }

    public createDownloadArchive(options: IDownloadOptions, waitForCompletion: boolean): Promise<string> {
        const self: any = this;

        return new Promise((resolve, reject) => {
            if (!options._downloadFiles || options._downloadFiles.length < 1) {
                return resolve("");
            }

            const files: string[] = options._downloadFiles;

            let archiveName: string;
            let archiveFileName: string;
            let watchQuery: URLSearchParams;
            let listURL: string;
            let downloadID: string | undefined;
            let entryCountChecked: number = 0;

            const setSubTaskTemporary = (): void => {
                if (options._taskProgress) {
                    options._taskProgress.temporary = true;
                }
            };

            const waitForArchive = (): void => {

                if (downloadID === undefined) {

                    setSubTaskTemporary();
                    self.callProgress(LogLevel.trace, options, APITasks.waitDownload,
                        [archiveFileName],
                        0, 100);

                    this.com.getJSON(
                        listURL,
                        undefined

                    )
                    .then(body => {

                        if (body) {
                            const ld: IListData = body as IListData;

                            if (ld.summary.entryCount > 0 && ld.summary.entryCount !== entryCountChecked) {
                                ld.entries.pop();
                                entryCountChecked = ld.summary.entryCount;


                                for (const ldEntry of ld.entries) {
                                    const entry: IListEntryDownload = ldEntry as IListEntryDownload;
                                    if (entry.fileName === archiveFileName && entry.src) {
                                        downloadID = entry.src;
                                        watchQuery.set("items", downloadID);
                                        return waitForArchive();
                                    }
                                }
                            }
                        }

                        setTimeout(waitForArchive, 500);

                    })
                    .catch(reject);

            } else {

                if (!waitForCompletion) {
                    return resolve(downloadID);
                }

                this.com.postJSON(
                    "server",
                    watchQuery,
                    undefined,
                    undefined,
                    options)
                    .then(body => {

                        const ld: IListData = body as IListData;

                        if (ld.entries.length > 0) {

                            const entry: IListEntryDownload = ld.entries[0] as IListEntryDownload;

                            if (entry.src === downloadID) {

                                let progress: number = parseFloat(entry.progress);
                                if (isNaN(progress)) {
                                    progress = 0;
                                }

                                setSubTaskTemporary();
                                self.callProgress(LogLevel.trace, options, APITasks.waitDownload,
                                    [archiveFileName], progress, 100);

                                if (entry.status === "1" && entry.progress === "100") {
                                    return resolve(downloadID);
                                }
                            }
                        }

                        setTimeout(waitForArchive, 250);

                    })
                    .catch(reject);
                }
            };


            if (files.length === 1 && !options.archiveType) {
                resolve("file");
            } else {

                const ql: URLSearchParams = new URLSearchParams();
                ql.set("source", "_downloads");
                ql.set("type", "list");
                ql.set("tpl", "interface_thumbview_downloads.json");
                ql.set("sort", "CREATIONDATE");
                ql.set("sortorder", "desc");
                ql.set("headers", "webinterface");
                listURL = this.client.getServerBaseQueryPath() + ql.toString();

                archiveName = options.archiveName || "API_" + Math.round(1000000 * Math.random()) + "_" + FSIServerClientUtils.NOW();

                archiveFileName = archiveName + "." + options.archiveType as string;

                watchQuery = new URLSearchParams();
                watchQuery.set("type", "list");
                watchQuery.set("tpl", "interface_thumbview_downloads.json");
                watchQuery.set("source", "_downloads");
                watchQuery.set("headers", "webinterface");

                const q: URLSearchParams = new URLSearchParams();
                q.set("cmd", "createAndStart");
                q.set("name", archiveName);
                q.set("appendFileExtension", options.replaceFileExtension ? "false" : "true");
                q.set("archiveType", options.archiveType as string);
                if (options.scheduleDate) {
                    q.set("scheduleDate", options.scheduleDate.toString());
                }

                let renderingQuery: string = "";

                if (options.renderingQuery) {
                    renderingQuery = options.renderingQuery;
                } else if (options.renderOptions) {
                    const qe = new URLSearchParams();
                    qe.set("type", "image");

                    const map: IStringStringMap = options.renderOptions as IStringStringMap;

                    for (const key of Object.keys(map)) {
                        qe.append(key, map[key]);
                    }

                    renderingQuery = qe.toString();
                }

                if (renderingQuery && renderingQuery.length > 0) {
                    q.set("renderingQuery", renderingQuery);
                }

                for (const file of files) {
                    q.append("file", file);
                }

                return this.com.postJSON(
                    self.client.getServicePath("jobqueue"),
                    q,
                    undefined,
                    undefined,
                    options
                )
                .then(body => {


                    if (!body || !body.statuscode || body.statuscode !== 200) {
                        return reject(self._com.err.get(APIErrors.invalidServerReply));
                    }

                    if (body.id) { // FSI Server since 2019/10
                        downloadID = "" + body.id;
                        watchQuery.set("items", downloadID);
                    }

                    if (waitForCompletion) {
                        setSubTaskTemporary();
                        self.callProgress(LogLevel.trace, options, APITasks.waitDownload,
                            [archiveFileName],
                            0, 100);
                    }

                    waitForArchive();

                })
                .catch(reject);
            }
        });
    }

    private callProgress(level: number, options: IListOptions, apiTaskDef: IAPITaskDef, content: any[],
                         pos: number = 0, length: number = 0): void {

        this.taskController.onStepProgress(level, options, apiTaskDef, content, pos, length);
    }

    private getDownloadURL(path: string, options: IDownloadOptions, forSaving: boolean = false): string {

        let url: string;
        if (options.getICCProfile === true) {
            url = this.client.getServicePath("icc") + "/" + FSIServerClient.ENCODE_PATH(path);
        } else {

            let renderingQuery: string = "";
            if (options.renderingQuery) {
                renderingQuery = options.renderingQuery;
                if (forSaving) {
                    renderingQuery += "&save=1";
                }
            } else if (options.renderOptions) {
                const q = new URLSearchParams();
                const map: IStringStringMap = options.renderOptions as IStringStringMap;

                for (const key of Object.keys(map)) {
                    q.append(key, map[key]);
                }

                q.set("type", "image");
                q.set("source", path);
                if (forSaving) {
                    q.set("save", "1");
                }

                renderingQuery = q.toString();
            }

            if (!renderingQuery) {
                url = this.client.getServicePath("file") + "/" + FSIServerClient.ENCODE_PATH(path);
            } else {
                url = this.client.getServerBaseQueryPath() + renderingQuery;
            }
        }

        if (forSaving) {
            url = this.client.getHost() + url;
        }

        return url;
    }


    private addFileToDownload(path: string, options: IDownloadOptions = {}): Promise<boolean> {

        const self = this;

        return new Promise((resolve, reject) => {

            if (!options._downloadFiles) {
                options._downloadFiles = [];
            }
            options._downloadFiles.push(path);

            if (!modeNode && !options.queued) {
                self.downloadArchive(options)
                .then( () => {
                    resolve(true);
                })
                .catch( (err) => {
                    reject(err);
                })
            }
            else resolve(true);
        })
    }

    private downloadArchive(options: IDownloadOptions, downloadID: string = ""): Promise<boolean> {

        const self: any = this;

        return new Promise((resolve, reject) => {

            if (!options._downloadFiles || options._downloadFiles.length < 1) {
                delete options._downloadFiles;
                return resolve(true);
            }

            const files: string[] = options._downloadFiles;
            delete options._downloadFiles;

            const downloadURL = (url: string): void => {

                let openedWindow: Window | null;

                if (window) {
                    openedWindow = window.open(url, "_blank");

                    if (!openedWindow) {
                        reject(new Error("failed to open download window. Popup forbidden?"));
                    }

                    const intervalClose: NodeJS.Timeout = setInterval(() => {

                        if (openedWindow && openedWindow.closed) {
                            clearInterval(intervalClose);
                            return resolve(true);
                        }
                    }, 100);
                }
            };


            if (files.length === 1) {
                downloadURL(self.getDownloadURL(files[0], options, true));
            } else if (downloadID) {
                let url: string = self.client.getService("file");
                url += "/_downloads/" + downloadID;

                downloadURL(url);
            }
        });
    }
}
