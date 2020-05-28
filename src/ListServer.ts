import axios from "axios";

import urlSearchParams from "@ungap/url-search-params";
import {APIErrors} from "./resources/APIErrors";
import {APITasks, IAPITaskDef} from "./resources/APITasks";
import {APIAbortController} from "./APIAbortController";
import {ClientSummaryInfo} from "./ClientSummaryInfo"
import {FSIServerClientInterface, IProgressOptions} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IStringAnyMap, IStringStringMap} from "./FSIServerClientUtils";
import {TaskController} from "./TaskController";
import {TaskProgress} from "./TaskProgress";
import {FSIServerClient} from "./index";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {LogLevel} from "./LogLevel";
import {IMetaData} from "./MetaDataClient";


const URLSearchParams = urlSearchParams;

export type ListEntryType = "file" | "directory";
export type ListSortDirectionValue = "asc" | "desc";
export type ListSortTypeFilterValue = "all" | "file" | "directory";

export enum ImportStatus {
    none,
    imported,
    queued,
    error,
    reimport,
    flat
}

export interface IAddEntryOptions {
    basePath?: string,
    progressMod?: number
}


export interface IListEntry {
    _listData: IListData,
    id?: number,
    src: string, // file name
    path: string, // full path of the file
    size: number, // in bytes
    width: number, // in px
    height: number, // in px
    lastModified: number, // unix time stamp
    type: ListEntryType,
    importStatus?: ImportStatus,
    metaData?: IMetaData,
    connectorType?: string
}

export interface IListEntryDownload extends IListEntry {
    fileName: string,
    duration: string,
    progress: string,
    startDate: string,
    status: string
}

export interface IListEntryUpload extends IListEntry {
    mime: string,
    file: File | null
}

export interface IListDataSummary {
    _baseDir: string,
    dir: string,
    connectorType: string,
    entryCount: number,
    imageCount: number,
    directoryCount: number,
    completeCount: number,
    lastModified: number,
    clientInfo: ClientSummaryInfo
}

export interface ILoopData {
    note: string,
    maxDepth: number,
    checkConnectorType: boolean,
    blackList: { [key: string]: boolean }
    validConnectorTypes: { [key: string]: boolean }
    canceled:boolean
}

export type ListSortValue =
    "FILENAME"
    | "FILESIZE"
    | "LASTMODIFIED"
    | "WIDTH"
    | "HEIGHT"
    | "RESOLUTION"
    | "IMPORTSTATUS";

export interface IListData {
    summary: IListDataSummary,
    entries: IListEntry[]
}

export interface IFNListError {
    ctx: any,
    fn: (err: Error) => void
}

interface IAddEntryRequiredList {

    imageCount: number,
    directoryCount: number,
    entries: IListEntry[],
    entrySources: string[]
}

interface IAddEntriesData {
    type: string,
    pos: number,
    length: number,
    paths: string[],
    entries: IStringAnyMap[],
    requiredConnectors: IStringStringMap,
    requiredLists: { [key: string]: IAddEntryRequiredList },
    requiredListsCount: number,
    lists: IListData[],
    percentFactor: number
}

export interface IListOptions extends IProgressOptions {
    template?: string,
    baseDir?: string,
    limit?: string,
    headers?: string,
    recursive?: boolean,
    maxRecursiveDepth?: number,
    dropEntries?: boolean,
    readInternalConnectors?: boolean,
    validConnectorTypes?: string | string[],
    typeFilter?: ListSortTypeFilterValue,
    sort?: ListSortValue,
    sortOrder?: ListSortDirectionValue,
    fnDirFilter?: (listData: IListData, entry: IListEntry) => Promise<boolean>,
    fnFileFilter?: (listData: IListData, entry: IListEntry) => Promise<boolean>,
    continueOnError?: boolean,
    blackList?: string[],
    items?: string[],
    generateDirProgress?: boolean

}

const EntryNumberDefaults: { [key: string]: any; } = {
    height: 0,
    id: 0,
    importStatus: 0,
    lastModified: 0,
    size: 0,
    width: 0,
};

export class ListServer {

    private readonly baseURL: string;
    private readonly client: FSIServerClient;
    private readonly com: FSIServerClientInterface;

    constructor(private readonly classInit: IAPIClassInit, private readonly taskController: TaskController) {
        this.client = classInit.client;
        this.com = classInit.com;

        this.baseURL = this.client.getServerBaseQuery();
    }

    public static GET_EMPTY_LIST_DATA(path: string = "", connectorType: string = "none"): IListData {
        return {
            entries: [],
            summary: {
                _baseDir: "",
                clientInfo: new ClientSummaryInfo(),
                completeCount: 0,
                connectorType,
                dir: path,
                directoryCount: 0,
                entryCount: 0,
                imageCount: 0,
                lastModified: 0,
            }
        };
    }

    public static CLONE_LIST_ENTRY(entry: IListEntry): IListEntry {
        return Object.assign({}, entry);
    }

    private static isValidConnectorType(loopData: ILoopData, type: string | undefined): boolean {
        let ret: boolean;
        if (!loopData.checkConnectorType) {
            ret = true;
        } else {
            if (type === undefined) {
                type = "undefined";
            }
            ret = (loopData.validConnectorTypes[type]);
        }

        return ret;
    }

    public read(path: string, options: IListOptions = {}): Promise<IListData> {

        path = FSIServerClientUtils.NORMALIZE_PATH(path);

        if (!options.fnProgress && this.client.getProgressFunction()) {
            options.fnProgress = this.client.getProgressFunction();
        }

        if (options.fnProgress !== undefined || options._fnQueueProgress !== undefined) {
            options._taskProgress = new TaskProgress();
            options._taskProgress.currentTask = this.com.taskSupplier.get(APITasks.readListServer, [path]);
            options._taskProgress.clientSummary = new ClientSummaryInfo();
        }

        const loopData: ILoopData = {
            blackList: {},
            checkConnectorType: true,
            maxDepth: 0,
            note: "",
            validConnectorTypes: {},
            canceled: false

        };

        if (options.validConnectorTypes === undefined) {
            options.validConnectorTypes = FSIServerClient.connectorTypesDefault;
        }

        if (typeof (options.validConnectorTypes) === "string") {
            if (options.validConnectorTypes === "*") {
                loopData.checkConnectorType = false;
            } else {
                loopData.validConnectorTypes[options.validConnectorTypes] = true;
            }

        } else {
            const connectorTypes: { [key: string]: boolean } = {};

            for (const cType of options.validConnectorTypes) {
                connectorTypes[cType] = true;
            }

            loopData.validConnectorTypes = connectorTypes;
        }

        if (options.blackList) {
            let on: string;
            const blackListNormalized: { [key: string]: boolean } = {};

            for (const blItem of options.blackList) {
                on = FSIServerClientUtils.NORMALIZE_PATH(blItem);
                blackListNormalized[on] = true;
            }
            loopData.blackList = blackListNormalized;
        }


        this.callProgress(LogLevel.trace, options, APITasks.readListServer, [path], 0, 100);

        const baseDir = (options.baseDir) ? options.baseDir : path;

        return this.doRead(path, baseDir, options, 0, loopData, 0, 100);
    }

    private static  dirFilterEntries = async (ld: IListData, options: IListOptions): Promise<void> => {
        if (options.fnDirFilter) {

            const collectEntries: boolean = !options.dropEntries;

            for (let i = 0; i < ld.entries.length; i++) {
                const theEntry: IListEntry = ld.entries[i];

                if (theEntry.type !== "directory") break;

                if (!await options.fnDirFilter(ld, theEntry)) {

                    ld.summary.directoryCount--;
                    ld.summary.entryCount--;

                    if (collectEntries){
                        ld.entries.splice(i, 1);
                        i--;
                    }

                }
            }
        }
    };

    private static fileFilterEntries = async (ld: IListData, options: IListOptions): Promise<void> => {
        if (options.fnFileFilter) {

            const collectEntries: boolean = !options.dropEntries;

            for (let i = 0; i < ld.entries.length; i++) {
                const theEntry: IListEntry = ld.entries[i];

                if (!await options.fnFileFilter(ld, theEntry)) {

                    if (theEntry.type === "file") ld.summary.imageCount--;
                    else ld.summary.directoryCount--;

                    ld.summary.entryCount--;

                    if (collectEntries) {
                        ld.entries.splice(i, 1);
                        i--;
                    }
                }
            }
        }
    };


    private getSubdirectories = async (
        path: string,
        baseDir: string,
        subDirsToRead: string[],
        ld: IListData,
        options: IListOptions,
        progressSize: number,
        progressStart: number,
        depth: number,
        loopData: ILoopData


    ): Promise<void> => {

        const collectEntries: boolean = !options.dropEntries;
        const prgSize: number = (subDirsToRead.length === 0) ? 0 : progressSize / subDirsToRead.length;

        let src = subDirsToRead.pop();
        let i = 0;

        while (src) {
            APIAbortController.THROW_IF_ABORTED(options.abortController);

            const subDirPath = path + src;
            const prgStart: number = progressStart + prgSize * i;

            this.callProgress(LogLevel.trace, options, APITasks.readSubDir, [subDirPath, depth],
                prgStart, 100);


            await this.doRead(subDirPath, baseDir, options,
                depth + 1, loopData, prgStart, prgSize)
            .then ( (ldSub: IListData) => {

                // ld is the listData of the current(!) dir
                ld.summary.entryCount       += ldSub.summary.entryCount;
                ld.summary.directoryCount   += ldSub.summary.directoryCount;
                ld.summary.imageCount       += ldSub.summary.imageCount;
                ld.summary.completeCount    += ldSub.summary.completeCount;

                if (collectEntries){
                    ld.entries = ld.entries.concat(ldSub.entries);
                }

                ListServer.addClientSummaryInfo(ld.summary.clientInfo, ldSub.summary.clientInfo);
            })
            .catch( (err) => {

                if (this.com.isAbortError(err) || (!options.continueOnError)) {

                    if (axios.isCancel(err)){
                        return err;
                    }
                    else throw err;
                }

                if (options._fnQueueError !== undefined) {
                    options._fnQueueError.fn.call(options._fnQueueError.ctx, err);
                }

                this.taskController.error(err);

            });

            i++;
            src = subDirsToRead.pop();
        }

    };



    public async doRead(path: string, baseDir: string, options: IListOptions, depth: number = 0, loopData: ILoopData,
                  progressStart: number, progressSize: number): Promise<IListData> {


        path = FSIServerClientUtils.NORMALIZE_PATH(path);

        const isRootDir: boolean = (depth === 0 && path === "/");

        loopData.maxDepth = Math.max(loopData.maxDepth, depth);

        // check black list entries
        if (options.blackList !== undefined && loopData.blackList[path]) {

            this.callProgress(LogLevel.trace, options, APITasks.skipDirBlackList, [path]);

            return new Promise((resolve) => {
                    return resolve(ListServer.GET_EMPTY_LIST_DATA(path));
                }
            );
        }


        const template: string = options.template || "interface_thumbview_default.json";

        const q = new URLSearchParams("type=list");
        q.set("tpl", template);
        if (options.limit) {
            q.set("limit", options.limit);
        }
        if (options.sort) {
            q.set("sort", options.sort);
        }
        if (options.sortOrder) {
            q.set("sortorder", options.sortOrder);
        }

        if (options.headers) {
            q.set("headers", options.headers);
        }

        const maxRecursiveDepth: number = (
            !options.maxRecursiveDepth ||
            isNaN(options.maxRecursiveDepth) ||
            options.maxRecursiveDepth < 0
        ) ? this.client.getMaxRecursiveDepth() : options.maxRecursiveDepth;


        let typeFilter: string = options.typeFilter || "all";

        if (typeFilter !== "all") {
            if (typeFilter !== "directory") {
                typeFilter = "file";
            }
            q.set("typefilter", typeFilter);
        }

        if (options.items) {
            q.set("items", options.items.join(","));
        }

        q.set("source", path);

        const subDirsToRead: string[] = [];

        return this.com.getJSON(
            this.client.getServerBaseQueryPath() + q.toString(),
            {def: APIErrors.list, content: [path]},
            undefined,
            options
        )
            .then(response => {

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                const body: IStringAnyMap = response;

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (body.summary === undefined || body.entries === undefined) {
                    throw this.com.err.get(APIErrors.list, [path], APIErrors.invalidServerReply);
                }

                const ld: IListData = body as IListData;
                ld.summary._baseDir = baseDir;
                ld.summary.clientInfo = new ClientSummaryInfo();


                // last entry in json is always empty, remove it
                ld.entries.pop();

                this.initListData(ld, options);


                if (ld.summary.connectorType === undefined) {
                    ld.summary.connectorType = "undefined";
                }

                if (depth === 0 && !isRootDir) {
                    // check internal connector and validate connector type against listOptions

                    if (!options.readInternalConnectors && path.indexOf("_") === 0) {
                        this.callProgress(LogLevel.debug, options, APITasks.skipInternalConnector,
                            [path]);
                        return ListServer.GET_EMPTY_LIST_DATA(ld.summary.connectorType, ld.summary.dir);
                    } else if (!ListServer.isValidConnectorType(loopData, ld.summary.connectorType)) {

                        this.callProgress(LogLevel.debug, options, APITasks.skipConnectorType,
                            [path, ld.summary.connectorType]);

                        return ListServer.GET_EMPTY_LIST_DATA(ld.summary.connectorType, ld.summary.dir);
                    }
                }

                return ld;

            })
            .then ( async (ld) => {
                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (ld.entries.length > 0 && options.fnDirFilter) {
                    await ListServer.dirFilterEntries(ld, options)
                }



                return ld;

            })
            .then ( ld => {
                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (ld.entries.length > 0 && options.recursive) {

                    if (maxRecursiveDepth !== undefined && depth >= maxRecursiveDepth) {

                        this.callProgress(LogLevel.debug, options, APITasks.skipDir, [path, maxRecursiveDepth]);


                        if (loopData.note === "") {
                            loopData.note = this.com.taskSupplier.get(APITasks.skipDirNote, [maxRecursiveDepth]).getMessage();
                        }

                        return ld;
                    } else {


                        const nEnd = ld.entries.length;

                        for (let i = 0; i < nEnd; i++) {

                            if (i % 50 === 0) APIAbortController.THROW_IF_ABORTED(options.abortController);

                            if (ld.entries[i].type === "directory") {

                                if (isRootDir) {
                                    if (!options.readInternalConnectors && ld.entries[i].src.indexOf("_") === 0) {
                                        this.callProgress(LogLevel.debug, options, APITasks.skipInternalConnector,
                                            [ld.entries[i].path]);
                                    } else if (!ListServer.isValidConnectorType(loopData, ld.entries[i].connectorType)) {
                                        this.callProgress(LogLevel.debug, options, APITasks.skipConnectorType,
                                            [ld.entries[i].path, ld.entries[i].connectorType]);
                                    } else {
                                        subDirsToRead.push(ld.entries[i].src);
                                    }
                                } else {
                                    subDirsToRead.push(ld.entries[i].src);
                                }
                            }
                            else {
                                break;
                            }
                        }

                        return ld;
                    }
                }
                else return ld;
            })
            .then ( async (ld) => {

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (ld.entries.length > 0 && options.fnFileFilter) {
                    await ListServer.fileFilterEntries(ld, options);
                }

                return ld;

            })
            .then(async  (ld) => {
                APIAbortController.THROW_IF_ABORTED(options.abortController);

                ListServer.updateClientSummary(ld, options);

                if (options.dropEntries) ld.entries = [];

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (subDirsToRead.length > 0) {

                   await this.getSubdirectories(path, baseDir, subDirsToRead, ld, options, progressSize, progressStart, depth, loopData);

                    if (depth === 0) {
                        if (loopData.note === "") {
                            loopData.note = "complete";
                        }
                    }

                    return ld;

                } else {
                    return ld;
                }

            })
            .then(ld => {

                ld.summary.clientInfo.note      = loopData.note;
                ld.summary.clientInfo.maxDepth  = loopData.maxDepth;

                if (depth === 0) {
                    this.callProgress(LogLevel.trace, options, APITasks.readListServer, [path], 100, 100);
                    this.taskController.resetSubTask();
                }

                return ld;
            })


}


    public addEntries(paths: string[], options: IListOptions): Promise<IListData[]> {

        if (options.fnProgress !== undefined || options._fnQueueProgress !== undefined) {
            options._taskProgress = new TaskProgress();
            options._taskProgress.currentTask = this.com.taskSupplier.get(APITasks.addEntries, [paths.length]);
        }

        const data: IAddEntriesData = {
            entries: [],
            length: paths.length,
            lists: [],
            paths,
            percentFactor: (paths.length === 0) ? 1 : 50 / paths.length,
            pos: 0,
            requiredConnectors: {},
            requiredLists: {},
            requiredListsCount: 0,
            type: "paths"
        };

        const self = this;

        return new Promise<IListData[]>((resolve, reject) => {
            setTimeout(() => {
                self.addNextEntry(data, options, {}, resolve, reject);
            }, 0);
        });
    }


    public addEntryObjects(entries: IStringAnyMap[], options: IListOptions, addOptions: IAddEntryOptions = {}): Promise<IListData[]> {

        if (options.fnProgress !== undefined || options._fnQueueProgress !== undefined) {
            options._taskProgress = new TaskProgress();
            options._taskProgress.currentTask = this.com.taskSupplier.get(APITasks.addEntries, [entries.length]);
        }


        if (addOptions.basePath && addOptions.basePath.length > 0) {
            addOptions.basePath = FSIServerClientUtils.NORMALIZE_PATH(addOptions.basePath);
        }

        const data: IAddEntriesData = {
            entries,
            length: entries.length,
            lists: [],
            paths: [],
            percentFactor: (entries.length === 0) ? 1 : 50 / entries.length,
            pos: 0,
            requiredConnectors: {},
            requiredLists: {},
            requiredListsCount: 0,
            type: "entries"
        };

        const self = this;

        return new Promise<IListData[]>((resolve, reject) => {
            setTimeout(() => {
                self.addNextEntry(data, options, addOptions, resolve, reject);
            }, 0);
        });
    }

    public directoryContains(path: string, files: string[], directories: string[], options: IListOptions = {}): Promise<boolean> {

        const self = this;

        const find = (names: string[], ld: IListData, type: string): boolean => {

            for (const nam of names) {
                let found: boolean = false;

                for (const entry of ld.entries) {
                    if (entry.src === nam && type === entry.type) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    // console.log("NOT found: " + type + " \"" + nam + "\"");
                    return false;
                }
            }

            return true;
        };

        return new Promise((resolve): void => {

            self.read(path, options)
                .then((ld: IListData) => {
                    if (ld.entries.length === 0) {
                        return resolve(false);
                    }
                    if (ld.entries.length < (files.length + directories.length)) {
                        return false;
                    }

                    if (!find(files, ld, "file")) {
                        return resolve(false);
                    }
                    if (!find(directories, ld, "directory")) {
                        return resolve(false);
                    }

                    resolve(true);
                })
                .catch(() => {
                    resolve(false);
                });
        });
    }


    private initListData(ld: IListData, options: IListOptions): void {
        const dir: string = ld.summary.dir;

        if (options.dropEntries){
            ld.entries.forEach((entry: IStringAnyMap) => {
                entry.path = dir + entry.src;
                entry.size = parseInt(entry.size, 10);
                entry.importStatus = parseInt(entry.importstatus, 10);
                delete entry.importstatus;
            });
        }
        else {
            ld.entries.forEach((entry: IStringAnyMap) => {
                entry.path = dir + entry.src;

                entry._listData = ld;

                entry.lastModified = entry.lastmodified;
                delete entry.lastmodified;
                entry.importStatus = entry.importstatus;
                delete entry.importstatus;

                for (const o of Object.keys(EntryNumberDefaults)) {
                    if (entry[o] === undefined) {
                        entry[o] = EntryNumberDefaults[o];
                    } else {
                        entry[o] = parseInt(entry[o], 10);
                    }
                }
            });
        }

    }

    private callProgress(level: number, options: IListOptions, apiTaskDef: IAPITaskDef, content: any[],
                         pos: number = 0, length: number = 0): void {

        this.taskController.onStepProgress(level, options, apiTaskDef, content, pos, length);
    }

    private getEntryInfo(path: string, options?: IListOptions): Promise<IListEntry | null> {

        const q = new URLSearchParams("type=info");

        q.set("renderer", "noredirect");
        q.set("source", path);
        q.set("tpl", "info.json");

        const url: string = this.client.getServerBaseQueryPath() + q;

        return this.com.getJSON(
            url,
            {def: APIErrors.addEntry, content: [path]},
            undefined,
            options
        )
            .then(response => {

                const entry: IListEntry = response as IListEntry;
                const dir: string = FSIServerClientUtils.GET_PARENT_PATH(entry.src);
                entry.path = entry.src;
                entry.src = entry.src.substr(dir.length);

                if (entry.size === undefined) {
                    entry.size = 0;
                    entry.type = "directory";
                } else {
                    entry.type = "file";
                }

                return entry;
            })
            .catch(err => {
                throw err;
            })
    }

    private getEntryFromPath(data: IAddEntriesData, options?: IListOptions): Promise<IListEntry | null> {
        return this.getEntryInfo(data.paths[data.pos], options);
    }


    private getConnectorTypeMap(items: string[] = [], options: IListOptions): Promise<IStringStringMap> {
        return new Promise((resolve) => {

            const listOptions: IListOptions = {
                abortController: options.abortController,
                readInternalConnectors: true,
                recursive: false,

            };

            if (items.length > 0) {
                listOptions.items = items;
            }

            const map: IStringStringMap = {};

            this.read("", listOptions)
                .then(list => {


                    for (const entry of list.entries) {
                        if (entry.connectorType !== undefined) {
                            map[entry.src] = entry.connectorType;
                        }
                    }

                    return resolve(map);
                });
        });
    }


    private doAddNextEntry(data: IAddEntriesData, options: IListOptions, addOptions?: IAddEntryOptions): Promise<void> {

        return new Promise(async (resolve, reject) => {

            let entry: IListEntry | null = null;

            try {
                if (data.type === "entries") {
                    const map: IStringAnyMap = data.entries[data.pos];

                    if (!map || !map.src) {
                        return reject(new Error("Invalid entry"));
                    }

                    // search result item, src contains full path
                    if (map.src.indexOf("/") !== -1) {
                        map.path = decodeURIComponent(map.src);
                        const fileAndPath = FSIServerClientUtils.FILE_AND_PATH(map.path);
                        map.src = fileAndPath.dir;
                    } else {
                        if (map.fullsrc === undefined && addOptions && addOptions.basePath !== undefined) {
                            map.path = map.fullsrc = addOptions.basePath + map.src;
                        } else {
                            map.path = decodeURIComponent(map.fullsrc);
                        }
                    }

                    if (!map.path) {
                        return reject(new Error("Invalid entry"));
                    }

                    if (!addOptions || !addOptions.progressMod || data.pos % addOptions.progressMod === 0) {
                        this.callProgress(LogLevel.trace, options, APITasks.addingEntry, [data.pos + 1,
                            data.length, map.path], data.pos * data.percentFactor, 100);
                    }


                    entry = data.entries[data.pos] as IListEntry;

                } else {
                    this.callProgress(LogLevel.trace, options, APITasks.addingEntry, [data.pos + 1,
                        data.length, data.paths[data.pos]], data.pos * data.percentFactor, 100);

                    entry = await this.getEntryFromPath(data, options);
                }
            } catch (err) {

                if (!options.continueOnError) {
                    return reject(err);
                } else {
                    if (options._fnQueueError !== undefined) {
                        await options._fnQueueError.fn.call(options._fnQueueError.ctx, err);
                    }
                    this.taskController.error(err, "ERROR: ");
                }
            }

            if (entry !== null) {
                let parentPath: string;

                if (!addOptions || !addOptions.progressMod || data.pos % addOptions.progressMod === 0) {
                    this.callProgress(LogLevel.trace, options, APITasks.addingEntry, [(data.pos + 1), data.length, entry.path],
                        (data.pos + 1) * data.percentFactor, 100);
                }

                if (entry.type === "file") {
                    const pf = FSIServerClientUtils.FILE_AND_PATH(entry.path);
                    parentPath = pf.path;
                } else {
                    parentPath = FSIServerClientUtils.GET_PARENT_PATH(entry.path);
                }

                const connectorName = FSIServerClientUtils.GET_BASE_PATH(entry.path);
                if (!data.requiredConnectors[connectorName]) {
                    data.requiredConnectors[connectorName] = connectorName;
                }

                if (data.requiredLists[parentPath] === undefined) {
                    data.requiredListsCount++;
                    data.requiredLists[parentPath] = {
                        directoryCount: 0,
                        entries: [],
                        entrySources: [],
                        imageCount: 0
                    };
                }

                if (entry.type === "file") {
                    data.requiredLists[parentPath].imageCount++;
                } else {
                    data.requiredLists[parentPath].directoryCount++;
                }
                data.requiredLists[parentPath].entries.push(entry);
                data.requiredLists[parentPath].entrySources.push(entry.src);


            }

            return resolve();

        });


    }

    private addNextEntry(data: IAddEntriesData, options: IListOptions, addOptions: IAddEntryOptions, fnResolve: (obj: IListData[]) => void, fnReject: (err: Error) => void): void {

        const self = this;

        try {

            if (data.pos >= data.length) {
                data.pos = 0;
                data.length = data.requiredListsCount;

                const items: string[] = [];
                for (const key of Object.keys(data.requiredConnectors)) {
                    items.push(key);
                }

                this.getConnectorTypeMap(items, options)
                    .then((map) => {
                        data.requiredConnectors = map;
                        this.listNextEntry(data, options, fnResolve, fnReject);
                    })
                    .catch((err: Error) => {
                        return fnReject(err);
                    });

            } else {
                this.doAddNextEntry(data, options, addOptions)
                    .then(() => {
                        if (data.pos % 100 === 0) {
                            data.pos++;
                            setTimeout(() => {
                                self.addNextEntry(data, options, addOptions, fnResolve, fnReject);
                            }, 0);

                        } else {
                            data.pos++;
                            this.addNextEntry(data, options, addOptions, fnResolve, fnReject);
                        }

                    })
                    .catch(err => {
                        return fnReject(err);
                    });
            }
        } catch (err) {
            return fnReject(err);
        }
    }

    private listNextEntry(data: IAddEntriesData, options: IListOptions, fnResolve: (obj: IListData[]) => void, fnReject: (err: Error) => void): void {

        data.percentFactor = (data.requiredListsCount === 0) ? 1 : 50 / data.requiredListsCount;

        let n: number = 0;

        if (data.requiredListsCount === 0) {
            return fnResolve(data.lists);
        } else {
            for (const path of Object.keys(data.requiredLists)) {

                try {
                    this.callProgress(LogLevel.trace, options, APITasks.addingEntryList, [(n + 1), data.requiredListsCount, path],
                        50 + n * data.percentFactor, 100);

                    const curListOptions: IListOptions = Object.assign({}, options);
                    curListOptions.limit = "0,1";
                    curListOptions.recursive = false;
                    curListOptions.readInternalConnectors = true;


                    const connector = FSIServerClientUtils.GET_BASE_PATH(path);

                    if (data.requiredConnectors[connector] === undefined) {
                        return fnReject(new Error("Unknown connector \"" + connector + "\""));
                    }

                    const ld: IListData = ListServer.GET_EMPTY_LIST_DATA();
                    ld.summary.connectorType = data.requiredConnectors[connector];
                    ld.summary.dir = ld.summary._baseDir = path;

                    ld.summary.imageCount = data.requiredLists[path].imageCount;
                    ld.summary.directoryCount = data.requiredLists[path].directoryCount;
                    ld.entries = data.requiredLists[path].entries;
                    ld.summary.entryCount = ld.entries.length;

                    data.lists.push(ld);

                    this.initListData(ld, options);
                    ListServer.updateClientSummary(ld, options);

                } catch (err) {

                    if (!options.continueOnError) {
                        return fnReject(err);
                    } else {
                        if (options._fnQueueError !== undefined) {
                            options._fnQueueError.fn.call(options._fnQueueError.ctx, err);
                        }
                        this.taskController.error(err, "ERROR: ");
                    }
                }

                n++;

                this.callProgress(LogLevel.trace, options, APITasks.addingEntryList, [n, data.requiredListsCount, path],
                    50 + n * data.percentFactor, 100);

                if (n === data.requiredListsCount) {
                    this.taskController.resetSubTask();

                    return fnResolve(data.lists);
                }
            }
        }
    }

    private static addClientSummaryInfo(infoMain: ClientSummaryInfo, infoAdd: ClientSummaryInfo): void{

        infoMain.directoryCount     += infoAdd.directoryCount;
        infoMain.fileCount          += infoAdd.fileCount;
        infoMain.entryCount         += infoAdd.entryCount;


        for (const state in infoMain.importStates){
            infoMain.importStates[state] += infoAdd.importStates[state];
        }

        infoMain.totalSize += infoAdd.totalSize;

    }

    private static updateClientSummary(ld: IListData, options: IListOptions): void {

        ld.summary.clientInfo.directoryCount    = ld.summary.directoryCount;
        ld.summary.clientInfo.fileCount         = ld.summary.imageCount;
        ld.summary.clientInfo.entryCount        = ld.summary.entryCount;


        let sz = 0;
        let entries: number = 0;
        for (const entry of ld.entries) {
            entries++;


            if (entries % 50 === 0) {
                APIAbortController.THROW_IF_ABORTED(options.abortController);
            }

            if (entry.type === "file") {
                if (!isNaN(entry.size)) {
                    sz += entry.size;
                }

                if (entry.importStatus !== undefined) {
                    ld.summary.clientInfo.importStates[entry.importStatus]++;
                }
            }
        }

        ld.summary.clientInfo.totalSize += sz;

        if (options.generateDirProgress && options._taskProgress && options._taskProgress.clientSummary) {
            ListServer.addClientSummaryInfo(options._taskProgress.clientSummary, ld.summary.clientInfo);
        }

    }
}
