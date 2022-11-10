import bytes from "bytes";
import {APIErrors, IAPIErrorDef} from "./resources/APIErrors";
import {APITasks, IAPITaskDef} from "./resources/APITasks";
import {APIAbortController} from "./APIAbortController";
import {APIError} from "./APIError";
import {ClientSummaryInfo} from "./ClientSummaryInfo";
import {Download, IDownloadOptions} from "./Download";
import {FileOps, ICopyOptions} from "./FileOps";
import {
  FSIServerClientInterface,
  IMapStringMethodArguments,
  IOverwriteReply,
  IProgressOptions,
  IPromptReply
} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IStringAnyMap} from "./FSIServerClientUtils";
import {InputChecks as chk} from "./InputChecks";
import {ListLocal} from "./ListLocal";
import {IMetaData, IMetaDataOptions, MetaDataClient} from "./MetaDataClient";
import {QueueItem} from "./QueueItem";
import {TaskController} from "./TaskController";
import {TaskProgress} from "./TaskProgress";
import {APITask} from "./APITask";
import {FSIServerClient, ListServer} from "./index";
import {IOptions} from "./utils/IOptions";
import {IProgressFunction} from "./utils/IProgressFunction";
import {IPromptFunction} from "./utils/IPromptFunction";
import {IAddEntryOptions, IListData, IListEntry, IListEntryUpload, IListOptions} from "./ListServer";
import {LogLevel} from "./LogLevel";
import {QueueProgress} from "./QueueProgress";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {IHTTPOptions} from "./utils/IHTTPOptions";
import {IUploadOptions} from "./Upload";

const modeNode: boolean = FSIServerClientUtils.GET_MODE_NODE();

interface IMapStringMethod {
  [key: string]: IMapStringMethodArguments
}

interface IBatchTask {
  taskName: string,
  running: boolean,
  position: number,
  revPosition: number,
  length: number,
  lockProgress: boolean
}

export interface IQueueOptions extends IOptions {
  continueOnError?: boolean,
  fnProgress?: IProgressFunction | false,
  fnPrompt?: IPromptFunction | false
}

export interface IBatchContent {
  clientInfo: ClientSummaryInfo,
  connectorTypes: { [key: string]: number },
  entries: IListEntry[],
  lists: IListData[],
}

export class Queue {

  private readonly client: FSIServerClient;
  private readonly com: FSIServerClientInterface;
  private readonly abortController: APIAbortController;
  private results: any[] = [];
  private readonly queueMethods: IMapStringMethod = {};
  private readonly queueProgress: QueueProgress;
  private currentBatch: IBatchContent = {
    clientInfo: new ClientSummaryInfo(),
    connectorTypes: {},
    entries: [],
    lists: []
  };
  private readonly options: IQueueOptions = {
    continueOnError: false
  };
  private nQueuePos: number = 0;
  private arQueueItems: QueueItem[] = [];
  private iCurrentItem: QueueItem;
  private bRunning: boolean = false;
  private bError: boolean = false;
  private canceled: boolean = false;
  private aborted: boolean = false;
  private arErrors: Error[] = [];
  private readonly fnProgress: IProgressFunction;
  private readonly fnPrompt: IPromptFunction | undefined;
  private batchTask: IBatchTask;
  private readonly taskController: TaskController;
  private readonly queueId: number;

  constructor(private readonly classInit: IAPIClassInit, opts?: IQueueOptions) {

    this.client = classInit.client;
    this.com = classInit.com;

    this.queueId = this.client.getNewQueueId();

    this.taskController = new TaskController(this.classInit, "queue #" + this.queueId);

    if (opts !== undefined) {
      this.options = opts;
    }
    if (this.options.continueOnError === undefined) {
      this.options.continueOnError = false;
    }

    if (this.options.fnProgress === false || this.options.fnProgress === undefined) {
      this.fnProgress = {
        ctx: this,
        fn: Queue.defaultProgress
      };
    } else {
      this.fnProgress = this.options.fnProgress;
    }

    if (this.options.fnPrompt) {
      this.fnPrompt = this.options.fnPrompt;
    } else if (this.options.fnPrompt === undefined) {
      this.fnPrompt = this.options.fnPrompt = this.client.getPromptFunction();
    } else if (!this.options.fnPrompt) {
      this.fnPrompt = undefined
    }


    this.queueProgress = new QueueProgress(this);
    this.iCurrentItem = this.queueProgress.currentItem;

    this.abortController = this.com.getNewAbortController();

    this.batchTask = {
      length: 0,
      lockProgress: false,
      position: 0,
      revPosition: 0,
      running: false,
      taskName: ""
    };

    const client = this.client;

    this.queueMethods = {
      "addDirectoryContent": {"ctx": this, "fn": this.runAddDirectoryContent},
      "addEntries": {"ctx": this, "fn": this.runAddEntries},
      "addEntryObjects": {"ctx": this, "fn": this.runAddEntryObjects},
      "batchCopy": {"ctx": this, "fn": this.runBatchCopy},
      "batchDelete": {"ctx": this, "fn": this.runBatchDelete},
      "batchDownload": {"ctx": this, "fn": this.runBatchDownLoad},
      "batchGetMetaData": {"ctx": this, "fn": this.runBatchGetMetaData},
      "batchMove": {"ctx": this, "fn": this.runBatchMove},
      "batchReimport": {"ctx": this, "fn": this.runBatchReimport},
      "batchRename": {"ctx": this, "fn": this.runBatchRename},
      "batchSendServiceCommands": {"ctx": this, "fn": this.runBatchSendServiceCommands},
      "batchSetMetaData": {"ctx": this, "fn": this.runBatchSetMetaData},
      "batchUpload": {"ctx": this, "fn": this.runBatchUpload},
      "changePassword": {"ctx": client, "fn": client.changePassword},
      "changeUser": {"ctx": client, "fn": client.changeUser},
      "clearList": {"ctx": this, "fn": this.runClearList},
      "copyDirectory": {"ctx": client, "fn": client.copyDirectory},
      "copyDirectoryContent": {"ctx": client, "fn": client.copyDirectoryContent},
      "copyFile": {"ctx": client, "fn": client.copyFile},
      "createDirectory": {"ctx": client, "fn": client.createDirectory},
      "deleteDirectory": {"ctx": client, "fn": client.deleteDirectory},
      "deleteFile": {"ctx": client, "fn": client.deleteFile},
      "deleteMetaData": {"ctx": client, "fn": client.deleteMetaData},
      "download": {"ctx": client, "fn": client.download},
      "downloadICCProfile": {"ctx": client, "fn": client.downloadICCProfile},
      "getMetaData": {"ctx": client, "fn": client.getMetaData},
      "getUserList": {"ctx": client, "fn": client.getUserList},
      "listLocal": {"ctx": client, "fn": client.listLocal},
      "listServer": {"ctx": client, "fn": client.listServer},
      "logBatchContent": {"ctx": this, "fn": this.runLogBatchContent},
      "logBatchContentSummary": {"ctx": this, "fn": this.runLogBatchContentSummary},
      "login": {"ctx": client, "fn": client.login},
      "logout": {"ctx": client, "fn": client.logout},
      "moveFile": {"ctx": client, "fn": client.moveFile},
      "moveDirectory": {"ctx": client, "fn": client.moveDirectory},
      "reImportDir": {"ctx": client, "fn": client.reImportDir},
      "reImportFile": {"ctx": client, "fn": client.reImportFile},
      "renameDirectory": {"ctx": client, "fn": client.renameDirectory},
      "renameFile": {"ctx": client, "fn": client.renameFile},
      "restoreMetaData": {"ctx": client, "fn": client.restoreMetaData},
      "runCustomTask": {"ctx": this, "fn": this.runCustomTask},
      "sendServiceCommand": {"ctx": client, "fn": client.sendServiceCommand},
      "setMetaData": {"ctx": client, "fn": client.setMetaData},
      "upload": {"ctx": client, "fn": client.upload}
    };
  }


  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private static defaultProgress(): void {
  }

  private static doRunLogBatchContent(self: Queue): boolean {

    const logLevel: LogLevel = LogLevel.info;

    if (self.currentBatch.entries.length > 0) {


      const nTotal: number = self.currentBatch.entries.length;

      for (let i = 0; i < nTotal; i++) {

        self.abortController.throwIfAborted();

        const entry: IListEntry = self.currentBatch.entries[i];

        let line: string = (i + 1) + "/" + nTotal + " " + entry.type.toUpperCase() + ": " + entry.path;

        if (entry.type === "file") {
          line += " " + self.com.taskSupplier.getLocaleFloat(bytes(entry.size,
            {thousandsSeparator: ",", unitSeparator: " "}));

          line += " importState: " + entry.importStatus;

        }

        self.taskController.log(logLevel, line);

        if (entry.metaData) {
          self.taskController.log(logLevel, entry.metaData.toString());
        }

      }

    } else {
      self.taskController.logTask(LogLevel.info, APITasks.queueEmpty);
    }

    self.taskController.onPromiseOk();

    self.onSingleStepBatchDone();


    return true;
  }

  private static doRunLogBatchContentSummary(self: Queue): boolean {

    if (self.currentBatch.clientInfo.entryCount > 0) {

      const level: LogLevel = LogLevel.info;
      self.taskController.log(level, self.com.taskSupplier.get(APITasks.queueContentSummary).getMessage());
      self.taskController.log(level, "Entries: " + self.com.taskSupplier.niceInt(self.currentBatch.clientInfo.entryCount));
      self.taskController.log(level, "Files: " + self.com.taskSupplier.niceInt(self.currentBatch.clientInfo.fileCount));
      self.taskController.log(level, "Directories: " + self.com.taskSupplier.niceInt(self.currentBatch.clientInfo.directoryCount));

      let sz: string = bytes(self.currentBatch.clientInfo.totalSize);
      sz += " (" + self.com.taskSupplier.niceInt(self.currentBatch.clientInfo.totalSize) + " bytes)";

      self.taskController.log(level, "Total size: " + sz);

      for (let i: number = 0; i < 6; i++) {
        self.taskController.log(level, "Import state " + i + ": "
          + self.com.taskSupplier.niceInt(self.currentBatch.clientInfo.importStates[i]));
      }

    } else {
      self.taskController.logTask(LogLevel.info, APITasks.queueEmpty);
    }

    self.onSingleStepBatchDone();

    return true;
  }

  //region command methods
  public login(username: string, password: string, options: IOptions = {}): void {
    chk.LOGIN(username, password);
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("login", [username, password, options, this.taskController]);
  }

  public logout(options: IOptions = {}): void {
    chk.IS_OBJECT(options, "options");
    this.setDefaultOptionFunction(options);

    this.addTask("logout", [options, this.taskController]);
  }

  public changePassword(currentPassword: string, newPassWord: string, options: IHTTPOptions = {}): void {
    chk.PATH(currentPassword, "currentPassword");
    chk.PATH(newPassWord, "newPassWord");
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("changePassword", [currentPassword, newPassWord, options, this.taskController]);
  }

  public changeUser(user: string, options: IHTTPOptions = {}): void {
    chk.PATH(user, "user");
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("changeUser", [user, options, this.taskController]);
  }

  public getUserList(options: IHTTPOptions = {}): void {
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("getUserList", [options, this.taskController]);
  }

  public listServer(path: string, options: IListOptions = {}): void {
    chk.LIST_SERVER(path, options);
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("listServer", [path, options, this.taskController]);
  }

  public listLocal(path: string, options: IListOptions = {}): void {
    chk.PATH(path);
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("listLocal", [path, options, this.taskController]);
  }

  public createDirectory(path: string, copyOptions: ICopyOptions = {}): void {
    chk.PATH(path);
    chk.IS_OBJECT(copyOptions, "copyOptions");

    this.setDefaultOptionFunction(copyOptions);

    this.addTask("createDirectory", [path, copyOptions, this.taskController]);
  }

  public renameFile(oldPath: string, newPath: string, copyOptions: ICopyOptions = {}): void {
    chk.RENAME(oldPath, newPath);
    chk.IS_OBJECT(copyOptions, "copyOptions");

    this.setDefaultOptionFunction(copyOptions);
    this.addTask("renameFile", [oldPath, newPath, copyOptions, this.taskController]);
  }

  public renameDirectory(oldPath: string, newPath: string, copyOptions: ICopyOptions = {}): void {
    chk.RENAME(oldPath, newPath);
    chk.IS_OBJECT(copyOptions, "copyOptions");

    this.setDefaultOptionFunction(copyOptions);
    this.addTask("renameDirectory", [oldPath, newPath, copyOptions, this.taskController]);
  }

  public reImportDir(path: string, image: boolean = true, metaData: boolean = true, httpOptions: IHTTPOptions = {}): void {
    chk.PATH(path);
    chk.RE_IMPORT(image, metaData);
    chk.IS_OBJECT(httpOptions, "httpOptions");

    this.setDefaultOptionFunction(httpOptions);
    this.addTask("reImportDir", [path, image, metaData, httpOptions, this.taskController]);
  }

  public reImportFile(path: string, image: boolean = true, metaData: boolean = true, httpOptions: IHTTPOptions = {}): void {
    chk.PATH(path);
    chk.RE_IMPORT(image, metaData);
    chk.IS_OBJECT(httpOptions, "httpOptions");

    this.setDefaultOptionFunction(httpOptions);
    this.addTask("reImportFile", [path, image, metaData, httpOptions, this.taskController]);
  }

  public deleteFile(path: string, httpOptions: IHTTPOptions = {}): void {
    chk.PATH(path);
    chk.IS_OBJECT(httpOptions, "httpOptions");

    this.setDefaultOptionFunction(httpOptions);
    this.addTask("deleteFile", [path, httpOptions, this.taskController]);
  }

  public deleteDirectory(path: string, httpOptions: IHTTPOptions = {}): void {
    chk.PATH(path);
    chk.IS_OBJECT(httpOptions, "httpOptions");

    this.setDefaultOptionFunction(httpOptions);
    this.addTask("deleteDirectory", [path, httpOptions, this.taskController]);
  }

  public getMetaData(path: string, options: IMetaDataOptions = {}): void {
    chk.GET_META_DATA(path, options);
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("getMetaData", [path, options, this.taskController]);
  }

  public setMetaData(path: string, data: IMetaData, service: string = "file", options: IMetaDataOptions = {}): void {
    chk.META_DATA(path, data, service);
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("setMetaData", [path, data, service, options, this.taskController]);
  }

  public sendServiceCommand(src: string, service: string, command: string,
                            options: IHTTPOptions = {}): void {
    chk.PATH(src, "src");
    chk.PATH(service, "service");
    chk.PATH(command, "command");
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("sendServiceCommand", [src, service, command, options, this.taskController]);
  }

  public deleteMetaData(path: string, data: IMetaData, service: string = "file", options: IMetaDataOptions = {}): void {
    chk.META_DATA(path, data, service);
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("setMetaData", [path, data, service, options, this.taskController]);
  }

  public restoreMetaData(path: string, data: IMetaData, service: string = "file", options: IMetaDataOptions = {}): void {
    chk.META_DATA(path, data, service);
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("setMetaData", [path, data, service, options, this.taskController]);
  }

  public copyDirectory(path: string, toPath: string, listOptions: IListOptions = {}): void {
    chk.COPY(path, toPath, listOptions);
    this.setDefaultOptionFunction(listOptions);
    this.addTask("copyDirectory", [path, toPath, listOptions, this.taskController, this]);
  }

  public copyDirectoryContent(path: string, toPath: string, listOptions: IListOptions = {}): void {
    chk.COPY(path, toPath, listOptions);
    this.setDefaultOptionFunction(listOptions);
    this.addTask("copyDirectoryContent", [path, toPath, listOptions, this.taskController, this]);
  }

  public copyFile(path: string, toPath: string, copyOptions: ICopyOptions = {}): void {
    chk.PATH(path);
    chk.PATH(toPath, "toPath");
    chk.IS_OBJECT(copyOptions, "copyOptions");

    this.setDefaultOptionFunction(copyOptions);
    this.addTask("copyFile", [path, toPath, copyOptions, this.taskController]);
  }

  public moveFile(path: string, toPath: string, copyOptions: ICopyOptions = {}): void {
    chk.PATH(path);
    chk.PATH(toPath, "toPath");
    chk.IS_OBJECT(copyOptions, "copyOptions");

    this.setDefaultOptionFunction(copyOptions);
    this.addTask("moveFile", [path, toPath, copyOptions, this.taskController]);
  }

  public moveDirectory(path: string, toPath: string, copyOptions: ICopyOptions = {}): void {
    chk.PATH(path);
    chk.PATH(toPath, "toPath");
    chk.IS_OBJECT(copyOptions, "copyOptions");

    this.setDefaultOptionFunction(copyOptions);
    this.addTask("moveDirectory", [path, toPath, copyOptions, this.taskController]);
  }


  public download(pathOrEntry: string | IListEntry, targetPath: string, options: IDownloadOptions = {}): void {
    chk.OBJECT_OR_STRING(pathOrEntry, "pathOrEntry");
    chk.PATH(targetPath, "targetPath");
    chk.IS_OBJECT(options, "options");
    if (options && options.archiveType) chk.ARCHIVE_TYPE(options.archiveType);

    this.setDefaultOptionFunction(options);
    this.addTask("download", [pathOrEntry, targetPath, options, this.taskController]);
  }

  public downloadICCProfile(pathOrEntry: string | IListEntry, targetPath: string, options: IDownloadOptions = {}): void {
    chk.OBJECT_OR_STRING(pathOrEntry, "pathOrEntry");
    chk.PATH(targetPath, "targetPath");
    chk.IS_OBJECT(options, "options");
    if (options && options.archiveType) chk.ARCHIVE_TYPE(options.archiveType);

    this.setDefaultOptionFunction(options);
    this.addTask("downloadICCProfile", [pathOrEntry, targetPath, options, this.taskController]);
  }

  public upload(sourcePath: string, targetPath: string, options: IUploadOptions = {}): void {
    chk.PATH(sourcePath, "sourcePath");
    chk.PATH(targetPath, "targetPath");
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);
    this.addTask("upload", [sourcePath, targetPath, options, this.taskController]);
  }

  public abort(): boolean {
    return this.abortController.abort();
  }

  public logBatchContentSummary(): void {
    this.addTask("logBatchContentSummary");
  }

  public addDirectoryContent(): void {
    this.addTask("addDirectoryContent", [{}]);
  }

  public addEntries(paths: string[], options: IListOptions = {recursive: true}): void {
    chk.STRING_ARRAY(paths, "paths");
    chk.IS_OBJECT(options, "options");

    this.addTask("addEntries", [paths, options]);
  }

  public addEntryObjects(entries: IStringAnyMap[], options: IListOptions = {}, addOptions: IAddEntryOptions = {}): void {
    chk.OBJECT_ARRAY(entries, "paths");
    chk.IS_OBJECT(options, "options");
    chk.IS_OBJECT(addOptions, "addOptions");

    this.addTask("addEntryObjects", [entries, options, addOptions]);
  }

  public batchRename(fnRename: (entry: IListEntry) => Promise<string>): void {
    chk.IS_FN(fnRename, "fnRename");

    this.addTask("batchRename", [fnRename]);
  }

  public batchMove(newPath: string): void {
    chk.PATH(newPath);

    this.addTask("batchMove", [newPath]);
  }

  public batchReimport(image: boolean = true, metaData: boolean = true, httpOptions?: IHTTPOptions): void {
    chk.RE_IMPORT(image, metaData);

    this.addTask("batchReimport", [image, metaData, httpOptions]);
  }

  public batchGetMetaData(options: IMetaDataOptions = {}): void {
    chk.IS_OBJECT(options, "options");

    this.addTask("batchGetMetaData", [options]);
  }

  public batchSetMetaData(data: IMetaData | ((entry: IListEntry) => Promise<IMetaData | null>),
                          options: IMetaDataOptions = {}): void {
    chk.FN_OBJECT_OR_FUNCTION(data, "data");
    chk.IS_OBJECT(options, "options");

    this.addTask("batchSetMetaData", [data, "saveMetaData", options]);
  }

  public batchDeleteMetaData(data: IMetaData | ((entry: IListEntry) => Promise<IMetaData | null>),
                             options: IMetaDataOptions = {}): void {
    chk.FN_OBJECT_OR_FUNCTION(data, "data");
    chk.IS_OBJECT(options, "options");

    this.addTask("batchSetMetaData", [data, "deleteMetaData", options]);
  }

  public batchRestoreMetaData(data: IMetaData | ((entry: IListEntry) => Promise<IMetaData | null>),
                              options: IMetaDataOptions = {}): void {
    chk.FN_OBJECT_OR_FUNCTION(data, "data");
    chk.IS_OBJECT(options, "options");

    this.addTask("batchSetMetaData", [data, "restoreMetaData", options]);
  }

  public batchCopy(targetPath: string, options: ICopyOptions = {}): void {
    chk.PATH(targetPath, "targetPath");
    chk.IS_OBJECT(options, "options");

    this.addTask("batchCopy", [targetPath, options]);
  }

  public batchDelete(options: IHTTPOptions = {}): void {
    chk.IS_OBJECT(options, "options");
    this.addTask("batchDelete", [options]);
  }

  public batchDownload(targetPath: string, options: IDownloadOptions = {}): void {
    chk.PATH(targetPath, "targetPath");
    chk.IS_OBJECT(options, "options");

    this.addTask("batchDownload", [targetPath, options]);
  }

  public batchDownloadICCProfiles(targetPath: string, options: IDownloadOptions = {}): void {
    chk.PATH(targetPath, "targetPath");
    chk.IS_OBJECT(options, "options");

    options.getICCProfile = true;

    this.addTask("batchDownload", [targetPath, options]);
  }

  public batchUpload(targetPath: string, options: IUploadOptions = {}): void {
    chk.PATH(targetPath, "targetPath");
    chk.IS_OBJECT(options, "options");

    this.addTask("batchUpload", [targetPath, options]);
  }

  public batchSendServiceCommands(service: string, command: string, options: IHTTPOptions = {}): void {
    chk.STRING(service, "service");
    chk.STRING(command, "command");
    chk.IS_OBJECT(options, "options");

    this.addTask("batchSendServiceCommands", [service, command, options]);
  }

  public logBatchContent(): void {
    this.addTask("logBatchContent");
  }

  public clearList(): void {
    this.addTask("clearList");
  }

  public runCustom(scope: any,
                   fn: (
                     client: FSIServerClient,
                     queue: Queue,
                     fnProgress: (taskDescription: string, pos: number, length: number) => void,
                     ...args: any[]
                   ) => Promise<boolean>,
                   ...args: any[]
  ): void {

    chk.IS_OBJECT(scope, "scope");
    chk.IS_FN(fn, "fn");

    if (typeof (args) !== "object" || typeof (args.concat) !== "function") args = [];

    args.unshift(fn);
    args.unshift(scope);

    this.addTask("runCustomTask", args);
  }

  //endregion

  public getAborted(): boolean {
    return this.canceled;
  }

  public addItemsFromDataTransferItemList(dataTransferItemList: DataTransferItemList,
                                          options: IListOptions = {}): Promise<IListData | boolean> {
    chk.IS_OBJECT(dataTransferItemList, "dataTransferItemList");
    chk.IS_OBJECT(options, "options");

    this.setDefaultOptionFunction(options);

    if (this.bRunning) {
      return this.taskController.getErrorPromise(APIErrors.queueRunning);
    }

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.readDataTransfer);
    this.queueProgress.currentTask = this.taskController.getCurrentTask();
    this.queueProgress.timeStart = FSIServerClientUtils.NOW();
    this.queueProgress.length = 1;
    this.queueProgress.pos = 1;
    this.queueProgress.percent = 0;
    this.queueProgress.task.pos = 0;
    this.queueProgress.task.length = 1;
    this.queueProgress.task.percent = 0;
    this.batchTask.position = 0;

    this.addProgressCallbacks(options);

    const self = this;
    return new Promise<IListData>((resolve, reject) => {
      new ListLocal(self.classInit, this.taskController).addItemsFromDataTransferItemList(dataTransferItemList, options)
        .then(ld => {
          self.appendListData(ld);
          resolve(ld);
        })
        .catch(reject)
    })
  }

  public onProgress(prg: QueueProgress): void {

    this.batchTask.length = prg.task.length;
    this.batchTask.position = prg.task.pos;


    if (this.batchTask.length < 1 || this.batchTask.position === this.batchTask.length) {
      this.queueProgress.task.percent = 100;
    } else {
      this.queueProgress.task.percent = 100 * this.batchTask.position / this.batchTask.length;
    }

    this.runProgress(prg);
  }

  public getProgressData(): QueueProgress {
    return this.queueProgress;
  }

  public onTaskProgress(tPrg: TaskProgress | QueueProgress): void {

    if (this.canceled) return;

    this.queueProgress.currentTask.setSubTaskInstance(tPrg.currentTask);
    this.queueProgress.task.currentTask = tPrg.currentTask;

    if (this.batchTask.length > 0) { // tPrg.percent is only sub progress of this task
      this.queueProgress.task.percent = 100 * (this.batchTask.position + tPrg.percent / 100) / this.batchTask.length;
    } else {
      this.queueProgress.task.percent = tPrg.percent;
    }

    if (tPrg.bytesTotal) {
      this.queueProgress.bytesDone = this.queueProgress.bytesDoneBefore + tPrg.bytesDone;
      this.queueProgress.task.bytesTotal = tPrg.bytesTotal;
      this.queueProgress.task.bytesDone = tPrg.bytesDone;
      this.queueProgress.task.bytesPerSecond = tPrg.bytesPerSecond;

      if (this.queueProgress.timeElapsed > 0) {
        this.queueProgress.bytesPerSecond = this.queueProgress.bytesDone / this.queueProgress.timeElapsed * 1000;
      }
    }

    this.queueProgress.task.clientSummary = tPrg.clientSummary;

    if (tPrg.logLevel > -1) {
      this.taskController.log(tPrg.logLevel, this.queueProgress.currentTask.getMessage());
    }

    this.runProgress(this.queueProgress);

  }

  public addProgressCallbacks(lo: IListOptions | null): void {
    if (lo !== null) {

      // add progress callback for subdirectories
      lo._fnQueueProgress = {
        ctx: this,
        fn: this.onTaskProgress
      };
      lo._fnQueueError = {
        ctx: this,
        fn: this.addError
      };
    }
  }

  public getExecutionDurationMS(): number {
    return this.queueProgress.timeElapsed;
  }

  public getExecutionDuration(): string {
    return this.com.taskSupplier.niceTimeInterval(this.queueProgress.timeElapsed);
  }

  public getErrors(): Error[] {
    return this.arErrors;
  }

  public getCurrentBatchContent(): IBatchContent | null {
    return this.currentBatch;
  }

  public addTask(cmd: string, args: any[] | null = null): void {

    if (args === null) {
      args = [];
    }

    const qItem: QueueItem = new QueueItem(this, this.queueProgress.length, cmd, args);
    this.arQueueItems.push(qItem);
  }

  public getResults(): any {
    return this.results;
  }

  public reset(clearQueueCommands: boolean = true, clearItems: boolean = true): void {

    if (!this.bRunning) {

      this.taskController.reset();

      this.nQueuePos = 0;
      this.results = [];

      this.arErrors = [];
      if (clearItems) {
        this.doClearList();
      }
      if (clearQueueCommands) {
        this.arQueueItems = [];
      }

      this.queueProgress.length = this.arQueueItems.length;
      this.queueProgress.percent = 0;

      this.canceled = this.aborted = false;
      this.bError = false;
    }
  }

  public getRunning(): boolean {
    return (this.bRunning && !this.canceled);
  }

  public run(): Promise<boolean> {

    if (this.bRunning) {
      return this.taskController.getErrorPromise(APIErrors.queueRunning);
    } else {

      this.reset(false, false);

      this.queueProgress.timeStart = FSIServerClientUtils.NOW();
      this.taskController.logTask(LogLevel.info, APITasks.queueStart, [this.queueProgress.length]);

      this.bRunning = true;

      this.results = new Array(this.queueProgress.length);

      const self = this;
      return new Promise((resolve, reject) => {
        self.runNext(resolve, reject);
      });
    }
  }

  public async runWithResult(): Promise<any[]> {
    await this.run()

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {
      })
      .finally(() => {
        this.logErrors();

      });

    return this.getResults();
  }

  public logErrors(): void {
    const errors = this.getErrors();

    if (errors.length > 0) {
      for (const err of errors) {
        this.taskController.log(LogLevel.error, "- " + err.message);
      }
    }
  }

  public callProgress(): void {
    if (this.bRunning) this.runProgress(this.queueProgress);
  }

  private checkAborted(): void {

    if (!this.aborted && this.abortController.getAborted()) {
      const err: APIError = this.com.err.get(APIErrors.userAborted);
      this.addError(err);
      this.error(err);
      this.canceled = this.aborted = true;
    }
  }

  private async continueOnError(err: APIError | Error): Promise<boolean> {

    const aborted: boolean = this.com.isAbortError(err as APIError);
    let ret: boolean;

    if (!aborted && this.fnPrompt) {

      const errKeys: string = (err instanceof APIError) ? err.getKeys() : err.message;

      let res: IPromptReply | undefined = (errKeys) ? this.taskController.getUserDecision(errKeys) : undefined;

      if (res === undefined) {
        const def: IAPIErrorDef | undefined = (err instanceof APIError) ? err.getMainErrorDef() : undefined;
        const msg: string = (err instanceof APIError) ? err.getMessage(true) : err.message;
        const buttons: string[] = (def && def.buttons) ? def.buttons : ["yes", "always", "no"];
        const tskDef: IAPITaskDef = (def && def.noContinueText === true) ? APITasks.any : APITasks.continueAfterError;
        const questionTask: APITask = this.com.taskSupplier.get(tskDef, [msg]);


        res = await this.com.prompt(
          this.options,
          questionTask,
          errKeys,
          buttons,
          this.taskController
        );

        this.queueProgress.adjustTimeStart(res.time);
      }

      ret = (res.reply !== "no" && res.reply !== "cancel");
      if (!ret) {
        this.canceled = true;
      }
    } else {
      ret = (this.options.continueOnError === true && !aborted);
      this.canceled = !ret;
    }

    return ret;
  }

  private runClearList(): Promise<boolean> {
    this.doClearList();

    return new Promise((resolve) => {
      return resolve(true);
    });
  }

  private doClearList(): void {
    this.currentBatch.connectorTypes = {};
    this.currentBatch.entries = [];
    this.currentBatch.clientInfo = new ClientSummaryInfo();
    this.currentBatch.lists = [];
  }

  private error(error: APIError): void {
    this.taskController.error(error);
  }

  private runProgress(prg: QueueProgress): void {
    prg.calcTotal();
    this.fnProgress.fn.call(this.fnProgress.ctx, prg);
  }

  private runSingleBatchTask(fn: (args: any) => boolean): Promise<boolean> {
    const self = this;

    this.batchTask.length = 1;
    this.batchTask.position = 0;
    this.queueProgress.task.percent = 0;

    this.queueProgress.currentTask = this.taskController.getCurrentTask();
    this.runProgress(this.queueProgress);
    this.batchTask.position = 1;
    this.queueProgress.task.percent = 100;

    self.batchTask.running = true;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const res: boolean = fn(self);
          return resolve(res);
        } catch (err) {
          reject(err);
        }
      }, 0);
    });
  }

  private onSingleStepBatchDone(): void {
    this.queueProgress.task.pos = this.queueProgress.length;
    this.queueProgress.task.percent = 100;
    this.runProgress(this.queueProgress);
  }

  private runLogBatchContent(): Promise<boolean> {
    this.taskController.setCurrentTask(LogLevel.info, APITasks.logBatchContent);
    return this.runSingleBatchTask(Queue.doRunLogBatchContent);
  }

  private runLogBatchContentSummary(): Promise<boolean> {
    this.taskController.setCurrentTask(LogLevel.trace, APITasks.logBatchContentSummary);
    return this.runSingleBatchTask(Queue.doRunLogBatchContentSummary);
  }

  private onBatchStart(taskName: string): void {

    this.queueProgress.currentTask = this.taskController.getCurrentTask();

    this.runProgress(this.queueProgress);

    const nLength = this.currentBatch.entries.length;
    this.queueProgress.task.length = nLength;

    this.batchTask = {
      length: nLength,
      lockProgress: false,
      position: 0,
      revPosition: nLength - 1,
      running: true,
      taskName
    };
  }

  private beforeBatchTask(): void {
    this.queueProgress.bDone = false;
    this.queueProgress.currentTask = this.taskController.getCurrentTask();
    this.runProgress(this.queueProgress);
  }

  private batchNext(): void {
    this.abortController.throwIfAborted();

    this.queueProgress.bDone = true;
    this.batchTask.position++;
    this.batchTask.revPosition--;

    this.queueProgress.task.pos = this.batchTask.position;

    if (!this.batchTask.lockProgress) {
      if (this.batchTask.length < 1 || this.batchTask.position === this.batchTask.length) {
        this.queueProgress.task.percent = 100;
      } else {
        this.queueProgress.task.percent = 100 * this.batchTask.position / this.batchTask.length;
      }
    } else {
      this.queueProgress.task.percent = 0;
    }

    this.runProgress(this.queueProgress);
  }

  private onBatchFinished(): void {
    this.resetByteProgress();

    this.taskController.resetSubTask();
  }

  private resetByteProgress(): void {
    this.queueProgress.bytesTotal = this.queueProgress.task.bytesTotal =
      this.queueProgress.bytesDone = this.queueProgress.task.bytesDone =
        this.queueProgress.bytesDoneBefore = 0;
  }

  private setDefaultOptionFunction(opts: IProgressOptions): void {

    opts.abortController = this.abortController;

    if (!opts.fnProgress && this.options.fnProgress) {
      opts.fnProgress = {
        ctx: this,
        fn: this.onTaskProgress
      };
    }

    if (!opts.fnPrompt && this.fnPrompt) {
      opts.fnPrompt = this.fnPrompt;
    }
  }

  private runBatchDownLoad(targetPath: string, options: IDownloadOptions = {}): Promise<boolean | string> {
    const self = this;

    const taskDef: IAPITaskDef = (modeNode) ? APITasks.batchDownload : APITasks.batchDownloadBrowser;
    this.queueProgress.bytesTotal = -1;

    if (!options.getICCProfile && !options.renderOptions) {
      this.queueProgress.bytesTotal = self.currentBatch.clientInfo.totalSize;
    }

    this.taskController.setCurrentTask(LogLevel.debug, taskDef,
      [this.currentBatch.entries.length, targetPath]);
    this.onBatchStart("batchDownload");

    if (!modeNode && !options.createArchiveOnly) {
      this.batchTask.lockProgress = true;
    }

    this.setDefaultOptionFunction(options);

    return new Promise((resolve, reject) => {
      if (this.batchContainsLocalFiles()) {
        return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchDownload"]));
      } else {
        self.nextBatchDownload(self, targetPath, options, resolve, reject);
      }
    });
  }

  private nextBatchDownload(
    self: Queue,
    targetPath: string,
    options: IDownloadOptions,
    fnResolve: (success: boolean | string) => void,
    fnReject: (err: Error) => void
  ): void {

    const pos: number = self.batchTask.position;

    if (pos < self.batchTask.length) {
      this.queueProgress.bytesDoneBefore = this.queueProgress.bytesDone;

      const bc: IBatchContent = self.currentBatch;
      const entry: IListEntry = bc.entries[self.batchTask.position];

      if (entry.type !== "file" && !options.archiveType) {
        self.batchNext();
        return self.nextBatchDownload(self, targetPath, options, fnResolve, fnReject);
      }

      self.queueProgress.task.bytesDone = 0;
      self.queueProgress.task.bytesTotal = (this.queueProgress.bytesTotal === -1) ? 0 : entry.size;


      if (options.fnRename) {
        options.fileName = options.fnRename(entry);
      }

      const orgQueued: boolean | undefined = options.queued;
      options.queued = true;
      const promise: Promise<boolean | string> = self.client.download(entry, targetPath, options, this.taskController);

      self.beforeBatchTask();

      promise
        .then(() => {
          self.queueProgress.task.bytesDone = self.queueProgress.task.bytesTotal;
          self.batchNext();
          self.nextBatchDownload(self, targetPath, options, fnResolve, fnReject);
        })
        .catch(async err => {
          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchDownload(self, targetPath, options, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        })
        .finally(() => {
          if (orgQueued === undefined) {
            delete options.queued;
          } else {
            options.queued = orgQueued;
          }
        });
    } else {

      if (!modeNode || options.createArchiveOnly) {

        this.batchTask.length = 1;
        this.batchTask.position = 0;
        this.queueProgress.task.percent = 0;

        const download: Download = new Download(self.classInit, this.taskController);
        let promise: Promise<string>;

        if (options.createArchiveOnly) {
          promise = download.createDownloadArchive(options, false);
        } else {
          promise = download.createAndDownloadArchive(options);
        }

        promise
          .then((downloadID) => {

            if (options.fnOnArchiveID) {
              options.fnOnArchiveID.fn.call(options.fnOnArchiveID.ctx, downloadID);
            }

            this.onBatchFinished();
            fnResolve(downloadID);
          })
          .catch(fnReject);
      } else {

        this.onBatchFinished();
        fnResolve(true);
      }
    }
  }

  private runBatchUpload(targetPath: string, options: IUploadOptions = {}): Promise<boolean> {
    const self = this;

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.batchUpload,
      [this.currentBatch.entries.length, targetPath]);
    this.onBatchStart("batchUpload");

    this.queueProgress.bytesTotal = this.currentBatch.clientInfo.totalSize;

    this.setDefaultOptionFunction(options);

    return new Promise((resolve, reject) => {

      if (self.batchContainsNonLocalFiles()) {
        return reject(self.com.err.get(APIErrors.batchNonLocalFiles, ["batchUpload"]));
      } else {
        self.nextBatchUpload(self, targetPath, options, resolve, reject);
      }
    });
  }

  private nextBatchUpload(
    self: Queue,
    targetPath: string,
    options: IUploadOptions,
    fnResolve: (success: boolean) => void,
    fnReject: (err: Error) => void
  ): void {

    const pos: number = self.batchTask.position;

    if (pos < self.batchTask.length) {

      this.queueProgress.bytesDoneBefore = this.queueProgress.bytesDone;


      const bc: IBatchContent = self.currentBatch;
      const entry: IListEntryUpload = bc.entries[self.batchTask.position] as IListEntryUpload;

      if (entry.type !== "file" && entry.type !== "directory") {
        self.batchNext();
        return self.nextBatchUpload(self, targetPath, options, fnResolve, fnReject);
      }

      self.queueProgress.task.bytesDone = 0;
      self.queueProgress.task.bytesTotal = entry.size;

      const promise: Promise<boolean> = self.client.upload(entry, targetPath, options, self.taskController);

      self.beforeBatchTask();

      promise
        .then(() => {
          self.queueProgress.task.bytesDone = self.queueProgress.task.bytesTotal;
          self.batchNext();
          self.nextBatchUpload(self, targetPath, options, fnResolve, fnReject);
          return;
        })
        .catch(async err => {


          if (await self.continueOnError(err)) {
            self.batchNext();
            self.addError(err);
            self.error(err);
            self.nextBatchUpload(self, targetPath, options, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        });
    } else {
      this.onBatchFinished();
      fnResolve(true);
    }
  }

  private runBatchReimport(image: boolean = true, metaData: boolean = true, httpOptions: IHTTPOptions = {}): Promise<number> {
    const self = this;

    this.setDefaultOptionFunction(httpOptions);

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.batchReImport,
      [this.currentBatch.entries.length]);
    this.onBatchStart("batchReImport");

    return new Promise((resolve, reject) => {
      if (this.batchContainsLocalFiles()) {
        return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchReImport"]));
      } else {
        self.nextBatchReImport(self, image, metaData, httpOptions, 0, resolve, reject);
      }
    });
  }

  private nextBatchReImport(
    self: Queue,
    image: boolean,
    metaData: boolean,
    httpOptions: IHTTPOptions,
    count: number,
    fnResolve: (totalCount: number) => void,
    fnReject: (err: Error) => void
  ): void {

    const pos: number = self.batchTask.position;

    if (pos < self.batchTask.length) {
      const bc: IBatchContent = self.currentBatch;

      const entry: IListEntry = bc.entries[self.batchTask.position];
      const basePath: string = entry._listData.summary.dir;
      const curName: string = entry.src;
      const service: string = (entry.type === "file") ? "file" : "directory";

      let promise: Promise<boolean>;
      if (service === "file") {
        promise = self.client.reImportFile(basePath + curName, image, metaData, httpOptions, this.taskController);
      } else {
        promise = self.client.reImportDir(basePath + curName, image, metaData, httpOptions, this.taskController);
      }

      self.beforeBatchTask();

      promise.then(() => {
        count++;
        self.batchNext();
        self.nextBatchReImport(self, image, metaData, httpOptions, count, fnResolve, fnReject);
      })
        .catch(async err => {

          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchReImport(self, image, metaData, httpOptions, count, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        });
    } else { // reimport done
      this.onBatchFinished();
      fnResolve(count);
    }
  }

  private runBatchMove(newPath: string): Promise<boolean> {

    const self = this;
    newPath = FSIServerClientUtils.NORMALIZE_PATH(newPath);

    const fnRename = (entry: IListEntry): Promise<string> => {
      return new Promise((resolve) => {


        const reg = new RegExp("^" + FSIServerClientUtils.ESCAPE_REG_EX(entry._listData.summary._baseDir));
        const result: string = entry.path.replace(reg, newPath);
        return resolve(result);
      });
    };

    return new Promise((resolve, reject) => {

      this.client.createDirectory(newPath,
        {
          abortController: self.abortController,
          overwrite: true
        },
        self.taskController)
        .then(() => {
          this.runBatchRename(fnRename, true)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject)
    });

  }

  private runBatchRename(fnRename: (entry: IListEntry) => Promise<string>, move: boolean = false): Promise<boolean> {

    const self = this;

    const task: IAPITaskDef = (move) ? APITasks.batchMove : APITasks.batchRename;

    this.taskController.setCurrentTask(LogLevel.debug, task, [this.currentBatch.entries.length]);
    this.onBatchStart("batchRename");

    return new Promise((resolve, reject) => {
      if (this.batchContainsLocalFiles()) {
        const taskName: string = (move) ? "batchMove" : "batchRename";
        return reject(this.com.err.get(APIErrors.batchLocalFiles, [taskName]));
      } else {
        self.nextBatchRename(self, fnRename, resolve, reject, move)
          .catch(reject);
      }
    });
  }

  private async nextBatchRename(
    self: Queue,
    fnRename: (entry: IListEntry) => Promise<string>,
    fnResolve: (success: boolean) => void,
    fnReject: (err: Error) => void,
    move: boolean
  ): Promise<void> {

    let finalPath: string = "";
    let reply: string = "";
    const pos: number = self.batchTask.position;


    if (pos < self.batchTask.length) {
      const bc: IBatchContent = self.currentBatch;

      const entry: IListEntry = bc.entries[self.batchTask.revPosition];
      const basePath: string = entry._listData.summary.dir;
      let curName: string = (move) ? entry.path : entry.src;
      let newName: string = await fnRename(entry);
      const service: string = (entry.type === "file") ? "file" : "directory";

      let promise: Promise<boolean>;

      const onFileExists = async (httpStatus: number): Promise<IOverwriteReply> => {
        const taskDef: IAPITaskDef = (entry.type === "file") ? APITasks.overwriteTargetFile : APITasks.overwriteTargetDirectory;
        const owReply: IOverwriteReply = await this.handleFileExists(finalPath, httpStatus, taskDef);
        reply = owReply.reply;

        return owReply;
      };

      if (curName === newName) {
        this.taskController.setCurrentSubTask(LogLevel.debug, APITasks.skipping, [basePath + curName]);
        promise = FSIServerClientInterface.GET_TRUE_PROMISE();
      } else {
        if (!move) {
          curName = basePath + curName;
          newName = basePath + newName;
        }
        finalPath = newName;

        if (service === "file") {
          if (move) {
            promise = self.client.moveFile(curName, newName,
              {
                abortController: self.abortController,
                handleIgnoredError: onFileExists,
                ignoreErrors: {409: true},
                overwrite: false,
              },
              self.taskController);
          } else {
            promise = self.client.renameFile(curName, newName,
              {abortController: self.abortController},
              self.taskController);
          }

        } else {
          if (move) {
            promise = self.client.moveDirectory(curName, newName,
              {
                abortController: self.abortController,
                handleIgnoredError: onFileExists,
                ignoreErrors: {409: true}
              },
              self.taskController);
          } else {
            promise = self.client.renameDirectory(curName, newName,
              {abortController: self.abortController},
              self.taskController);
          }
        }
      }

      self.beforeBatchTask();

      promise.then(async () => {

        if (reply) {

          if (reply === "cancel") {
            return fnReject(self.com.err.get(APIErrors.userAborted));
          } else if (reply === "overwrite") {
            // this.com.lockCurrentTask(true);

            try {
              if (service === "file") {
                await self.client.moveFile(curName, newName, {
                    abortController: self.abortController,
                    overwrite: true
                  },
                  self.taskController);
              } else {
                await self.client.deleteDirectory(newName, {}, self.taskController);
                await self.client.moveDirectory(curName, newName,
                  {
                    abortController: self.abortController
                  },
                  self.taskController);
              }
              // this.com.lockCurrentTask(false);
            } catch (err: any) {
              // this.com.lockCurrentTask(false);
              return fnReject(err);
            }
          }
        }

        self.batchNext();
        await self.nextBatchRename(self, fnRename, fnResolve, fnReject, move);
      })
        .catch(async err => {

          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            await self.nextBatchRename(self, fnRename, fnResolve, fnReject, move);
          } else {
            fnReject(err);
          }
        });
    } else { // rename done
      this.onBatchFinished();
      fnResolve(true);
    }
  }

  private runBatchGetMetaData(options: IMetaDataOptions = {}): Promise<boolean> {

    const self = this;

    this.setDefaultOptionFunction(options);

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.batchGetMateData,
      [this.currentBatch.entries.length]);
    this.onBatchStart("batchGetMetaData");

    return new Promise((resolve, reject) => {
      if (this.batchContainsLocalFiles()) {
        return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchGetMetaData"]));
      } else {
        self.nextBatchGetMetaData(self, options, resolve, reject);
      }
    });
  }

  private nextBatchGetMetaData(
    self: Queue,
    options: IMetaDataOptions,
    fnResolve: (success: boolean) => void,
    fnReject: (err: Error) => void
  ): void {

    const pos: number = self.batchTask.position;

    if (pos < self.batchTask.length) {

      const bc: IBatchContent = self.currentBatch;
      const entry: IListEntry = bc.entries[pos];

      const promise: Promise<IMetaData> = self.client.getMetaData(entry.path, options, self.taskController);
      self.beforeBatchTask();

      promise.then((meta) => {
        entry.metaData = meta;

        self.batchNext();
        self.nextBatchGetMetaData(self, options, fnResolve, fnReject);
      })
        .catch(async err => {

          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchGetMetaData(self, options, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        });
    } else { // done
      this.onBatchFinished();
      fnResolve(true);
    }
  }

  private runBatchSendServiceCommands(service: string, command: string, options: IHTTPOptions = {}): Promise<boolean> {
    const self = this;
    this.setDefaultOptionFunction(options);

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.batchSendServiceCommands,
      [command, this.currentBatch.entries.length, service]);
    this.onBatchStart("batchSendServiceCommands");

    return new Promise((resolve, reject) => {
      if (this.batchContainsLocalFiles()) {
        return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchSendServiceCommands"]));
      } else {
        self.nextBatchSendServiceCommands(self, service, command, options, resolve, reject);
      }
    });
  }

  private nextBatchSendServiceCommands(
    self: Queue,
    service: string,
    command: string,
    options: IHTTPOptions,
    fnResolve: (success: boolean) => void,
    fnReject: (err: Error) => void
  ): void {

    const pos = self.batchTask.position;

    if (pos < self.batchTask.length) {

      const bc: IBatchContent = self.currentBatch;
      const entry: IListEntry = bc.entries[pos];

      const promise: Promise<boolean> = self.client.sendServiceCommand(entry.src, service, command, options, this.taskController);

      self.beforeBatchTask();

      promise.then(() => {
        self.batchNext();
        self.nextBatchSendServiceCommands(self, service, command, options, fnResolve, fnReject);
      })
        .catch(async err => {

          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchSendServiceCommands(self, service, command, options, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        });
    } else { // done
      this.onBatchFinished();
      fnResolve(true);
    }
  }

  private runBatchSetMetaData(data: IMetaData | ((entry: IListEntry) => Promise<IMetaData | null>),
                              cmd: string = "saveMetaData", options: IMetaDataOptions = {}): Promise<boolean> {

    const self = this;
    this.setDefaultOptionFunction(options);

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.batchSetMetaData,
      [this.currentBatch.entries.length]);
    this.onBatchStart("batchSetMetaData");

    if (typeof (data) === "function") {
      return new Promise((resolve, reject) => {
        if (this.batchContainsLocalFiles()) {
          return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchSetMetaData"]));
        } else {
          self.nextBatchSetMetaDataDynamic(self, cmd, data, options, resolve, reject);
        }
      });
    } else {
      return new Promise((resolve, reject) => {
        if (this.batchContainsLocalFiles()) {
          return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchSetMetaData"]));
        } else {
          self.nextBatchSetMetaData(self, MetaDataClient.GET_META_QUERY(data, cmd), options, resolve, reject);
        }
      });
    }
  }

  private nextBatchSetMetaDataDynamic(
    self: Queue,
    cmd: string,
    fnMeta: (entry: IListEntry) => Promise<IMetaData | null>,
    options: IMetaDataOptions,
    fnResolve: (success: boolean) => void,
    fnReject: (err: Error) => void
  ): void {

    const pos: number = self.batchTask.position;

    if (pos < self.batchTask.length) {

      const bc: IBatchContent = self.currentBatch;
      const entry: IListEntry = bc.entries[pos];


      const promise: Promise<boolean> = new MetaDataClient(self.classInit,
        this.taskController).setByFunction(entry, cmd, fnMeta, options);

      promise.then(() => {
        self.batchNext();
        self.nextBatchSetMetaDataDynamic(self, cmd, fnMeta, options, fnResolve, fnReject);
      })
        .catch(async err => {

          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchSetMetaDataDynamic(self, cmd, fnMeta, options, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        });
    } else { // done
      this.onBatchFinished();
      fnResolve(true);
    }
  }

  private nextBatchSetMetaData(
    self: Queue,
    query: URLSearchParams,
    options: IMetaDataOptions,
    fnResolve: (success: boolean) => void,
    fnReject: (err: Error) => void
  ): void {

    const pos = self.batchTask.position;

    if (pos < self.batchTask.length) {

      const bc: IBatchContent = self.currentBatch;
      const entry: IListEntry = bc.entries[pos];


      const promise: Promise<boolean> = this.taskController.wrapPromise(
        new MetaDataClient(this.classInit, this.taskController)
          .setWithQuery(entry.path, entry.type, query, options) as Promise<boolean>
      );

      self.beforeBatchTask();

      promise.then(() => {
        self.batchNext();
        self.nextBatchSetMetaData(self, query, options, fnResolve, fnReject);
      })
        .catch(async err => {

          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchSetMetaData(self, query, options, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        });
    } else { // done
      this.onBatchFinished();
      fnResolve(true);
    }
  }

  private runBatchDelete(options: IHTTPOptions): Promise<boolean> {
    const self = this;

    this.setDefaultOptionFunction(options);

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.batchDelete,
      [this.currentBatch.entries.length]);
    this.onBatchStart("batchDelete");

    return new Promise((resolve, reject) => {
      if (this.batchContainsLocalFiles()) {
        return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchDelete"]));
      } else {
        self.nextBatchDelete(self, options, resolve, reject);
      }
    });
  }

  private nextBatchDelete(
    self: Queue,
    options: IHTTPOptions,
    fnResolve: (success: boolean) => void,
    fnReject: (err: Error) => void): void {

    const pos: number = self.batchTask.position;

    if (pos < self.batchTask.length) {

      const bc: IBatchContent = self.currentBatch;
      const entry: IListEntry = bc.entries[self.batchTask.revPosition];
      const basePath: string = entry._listData.summary.dir;
      const path = basePath + entry.src;
      const service: string = (entry.type === "file") ? "file" : "directory";

      let promise: Promise<boolean>;

      if (service === "file") {
        promise = self.client.deleteFile(path, options, self.taskController);
      } else {
        promise = self.client.deleteDirectory(path, options, self.taskController);
      }

      self.beforeBatchTask();

      promise.then(() => {
        self.batchNext();
        self.nextBatchDelete(self, options, fnResolve, fnReject);
      })
        .catch(async err => {

          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchDelete(self, options, fnResolve, fnReject);
          } else {
            fnReject(err);
          }
        });
    } else { // rename done
      this.onBatchFinished();
      fnResolve(true);
    }
  }

  private runBatchCopy(targetPath: string, options: ICopyOptions): Promise<IListEntry[]> {
    const self = this;

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.batchCopy,
      [this.currentBatch.entries.length]);
    this.onBatchStart("batchCopy");


    if (options.autoRename && !options.fnRename) options.autoRename = false;

    return new Promise((resolve, reject) => {
      if (this.batchContainsLocalFiles()) {
        return reject(this.com.err.get(APIErrors.batchLocalFiles, ["batchCopy"]));
      } else {
        self.nextBatchCopy(self, targetPath, options, resolve, reject, []);
      }
    });
  }

  private getSkipOverwriteReply(): Promise<IOverwriteReply> {
    return new Promise((resolve) => {
      return resolve({"reply": "Retrying", "continue": true});
    });
  }

  private nextBatchCopy(
    self: Queue,
    targetPath: string,
    options: ICopyOptions,
    fnResolve: (arEntries: IListEntry[]) => void,
    fnReject: (err: Error) => void,
    copiedEntries: IListEntry[],
    tries: number = 0
  ): void {

    const pos: number = self.batchTask.position;
    let abort: boolean = false;

    const autoRenameRetries = options.autoRenameRetries || 500;


    if (pos < self.batchTask.length) {

      const bc: IBatchContent = self.currentBatch;
      let reply: string = "";

      const entry: IListEntry = bc.entries[pos];
      const basePath: string = entry._listData.summary.dir;
      const path = basePath + entry.src;
      const service: string = (entry.type === "file") ? "file" : "directory";

      let promise: Promise<boolean>;

      const finalPath: string = FSIServerClientUtils.GET_NEW_RELATIVE_PATH(path,
        entry._listData.summary._baseDir, targetPath, entry, options, tries);

      const onFileExists = async (httpStatus: number): Promise<IOverwriteReply> => {

        // continue without error and try to find an available name for the file to copy
        if (options.autoRename && tries < autoRenameRetries) {
          abort = true;
          self.nextBatchCopy(self, targetPath, options, fnResolve, fnReject, copiedEntries, ++tries);
          return self.getSkipOverwriteReply();
        }

        const owReply: IOverwriteReply = await this.handleFileExists(finalPath, httpStatus, APITasks.overwriteTargetFile);
        reply = owReply.reply;
        return owReply;
      };

      if (service === "file") {
        self.taskController.setCurrentTask(LogLevel.debug, APITasks.copyFile, [path, finalPath]);
        promise = new FileOps(self.classInit, this.taskController).copyFile(path, finalPath,
          {
            abortController: self.abortController,
            handleIgnoredError: onFileExists,
            ignoreErrors: {409: true}
          }
        );
      } else {
        promise = self.client.createDirectory(finalPath,
          {
            abortController: self.abortController,
            overwrite: options.autoRename !== true
          },
          self.taskController);
      }

      self.beforeBatchTask();

      promise.then(async () => {

        if (abort) return false;

        if (reply) {

          if (reply === "cancel") {
            return fnReject(self.com.err.get(APIErrors.userAborted));
          } else if (reply === "overwrite") {
            try {
              await new FileOps(self.classInit, self.taskController).copyFile(path,
                finalPath, {overwrite: true});
            } catch (err: any) {
              return fnReject(err);
            }
          }
        }

        const copiedEntry = ListServer.CLONE_LIST_ENTRY(entry);
        copiedEntry.path = finalPath;
        const pdCopied = FSIServerClientUtils.FILE_AND_PATH(finalPath);
        copiedEntry.src = pdCopied.dir;
        copiedEntries.push(copiedEntry);


        self.batchNext();
        self.nextBatchCopy(self, targetPath, options, fnResolve, fnReject, copiedEntries);
      })
        .catch(async err => {

          // continue without error and try to find an available name for the directory to copy
          if (service === "directory" && options.autoRename === true && tries < autoRenameRetries) {
            self.nextBatchCopy(self, targetPath, options, fnResolve, fnReject, copiedEntries, ++tries);
            return false;
          }


          if (await self.continueOnError(err)) {
            self.batchNext();

            self.addError(err);
            self.error(err);
            self.nextBatchCopy(self, targetPath, options, fnResolve, fnReject, copiedEntries);
          } else {
            fnReject(err);
          }
        });
    } else { // rename done
      this.onBatchFinished();
      fnResolve(copiedEntries);
    }
  }

  private getMethod(itm: QueueItem): Promise<boolean | object> {
    const queueMethod: IMapStringMethodArguments = this.queueMethods[itm.cmd];
    return queueMethod.fn.apply(queueMethod.ctx, itm.args);
  }

  private addError(err: Error): void {
    this.arErrors.push(err);
    this.bError = true;
  }

  private onStopExecution(): void {

    // get a new cancel token so that the last request will be released
    this.abortController.release();

    this.bRunning = false;

    this.taskController.logTask(LogLevel.info, APITasks.queueFinished,
      [this.arErrors.length, this.getExecutionDuration()]);

    if (this.arErrors.length > 0 && this.options.continueOnError !== true) {
      this.error(this.com.err.get(APIErrors.queueStoppedWithErrors));
    }
  }

  private onCustomProgress(taskDescription: string, pos: number = 0, length: number): void {

    this.queueProgress.currentTask.setSubTask(APITasks.startQueueCommand, [(pos + 1), length, taskDescription]);

    this.batchTask.length = length;
    this.batchTask.position = pos;

    if (this.batchTask.length < 1 || this.batchTask.position === this.batchTask.length) {
      this.queueProgress.task.percent = 100;
    } else {
      this.queueProgress.task.percent = 100 * this.batchTask.position / this.batchTask.length;
    }

    this.runProgress(this.queueProgress);
  }

  private runNext(fnResolve: (success: boolean) => void, fnReject: (err: Error) => void): void {

    this.taskController.reset();

    this.queueProgress.bytesTotal = 0;

    this.checkAborted();

    const curQueuePos = this.nQueuePos++;

    if (curQueuePos < this.queueProgress.length) {

      this.taskController.resetUserDecisions();

      this.iCurrentItem = this.arQueueItems[curQueuePos];
      this.queueProgress.task = new TaskProgress();

      this.batchTask.lockProgress = true;
      this.queueProgress.bDone = false;

      this.queueProgress.pos = (curQueuePos + 1);
      this.queueProgress.currentItem = this.iCurrentItem;

      this.queueProgress.currentTask = this.taskController.setCurrentTask(LogLevel.debug,
        APITasks.startQueueCommand, [this.queueProgress.pos, this.queueProgress.length, this.iCurrentItem.cmd]);

      let listOptions: IListOptions | null = null;

      switch (this.iCurrentItem.cmd) {
        case "listServer":
        case "listLocal":
          if (typeof (this.iCurrentItem.args[1]) === "object"
            && this.iCurrentItem.args[1].recursive
          ) {
            listOptions = this.iCurrentItem.args[1] as IListOptions;
            listOptions.continueOnError = this.options.continueOnError;
          }
          break;
        case "download":
          if (typeof (this.iCurrentItem.args[2]) !== "object") {
            this.iCurrentItem.args[2] = {};
          }
          this.iCurrentItem.args[2].oProgress = {
            ctx: this,
            fn: this.onTaskProgress
          };
          break;
        case "addEntries":
        case "addEntryObjects":
          if (typeof (this.iCurrentItem.args[1]) === "object") {
            listOptions = this.iCurrentItem.args[1] as IListOptions;
            listOptions.continueOnError = this.options.continueOnError;
          }
      }

      this.addProgressCallbacks(listOptions);
      this.taskController.reset();

      const promise: Promise<boolean | object> = this.getMethod(this.iCurrentItem);

      this.queueProgress.currentTask = this.taskController.getCurrentTask();

      if (!this.batchTask.running) {
        this.runProgress(this.queueProgress);
      }


      promise
        .then(body => {

          this.results[curQueuePos] = body;

          if (!this.batchTask.running) {
            this.queueProgress.bDone = true;
            this.queueProgress.task.pos = this.queueProgress.task.length;

            this.queueProgress.task.percent = 100;
            this.queueProgress.bDone = true;
            this.runProgress(this.queueProgress);
          } else {
            this.queueProgress.bDone = true;
            this.runProgress(this.queueProgress);
          }

          if (this.iCurrentItem.cmd.indexOf("list") === 0 && typeof (body) === "object") {
            const ld: IListData = body as IListData;
            this.appendListData(ld);
          }

          return this.runNext(fnResolve, fnReject);
        })
        .catch(async error => {

          this.checkAborted();

          if (!this.canceled) {
            // a native error occurred, output with stack trace
            if (!(error instanceof APIError) && (!error.type || error.type !== "aborted")) {
              console.error(error);
            } else {
              this.error(error);
            }
            this.addError(error);
          }

          if (!this.canceled && await this.continueOnError(error)) {
            this.runNext(fnResolve, fnReject);
          } else {
            this.onStopExecution();
            this.canceled = true;
            fnReject(this.com.err.get(APIErrors.queueStoppedWithErrors));
          }
        }).finally(() => {
        this.batchTask.running = false;
      });

    } else {
      this.onStopExecution();
      fnResolve(!this.bError);
    }
  }

  private appendListData(ld: IListData): void {

    this.currentBatch.lists.push(ld);
    const connectorType = ld.summary.connectorType;

    if (this.currentBatch.connectorTypes[connectorType] === undefined) {
      this.currentBatch.connectorTypes[connectorType] = ld.summary.entryCount;
    } else {
      this.currentBatch.connectorTypes[connectorType] += ld.summary.entryCount;
    }

    this.currentBatch.entries = this.currentBatch.entries.concat(ld.entries);
    this.currentBatch.clientInfo.entryCount += ld.summary.clientInfo.entryCount;
    this.currentBatch.clientInfo.fileCount += ld.summary.clientInfo.fileCount;
    this.currentBatch.clientInfo.directoryCount += ld.summary.clientInfo.directoryCount;
    this.currentBatch.clientInfo.maxDepth = Math.max(this.currentBatch.clientInfo.maxDepth, ld.summary.clientInfo.maxDepth);
    this.currentBatch.clientInfo.note = ld.summary.clientInfo.note;
    this.currentBatch.clientInfo.totalSize += ld.summary.clientInfo.totalSize;

    for (let i: number = 0; i < 6; i++) {
      this.currentBatch.clientInfo.importStates[i] += ld.summary.clientInfo.importStates[i];
    }
  }

  private batchContainsNonLocalFiles(): boolean {
    for (const connectorType of Object.keys(this.currentBatch.connectorTypes)) {
      if (connectorType !== "LOCAL" && this.currentBatch.connectorTypes[connectorType] > 0) {
        return true;
      }
    }

    return false;
  }

  private batchContainsLocalFiles(): boolean {
    return (this.currentBatch.connectorTypes.LOCAL !== undefined && this.currentBatch.connectorTypes.LOCAL > 0);
  }


  private runAddEntries(paths: string[], options: IListOptions): Promise<IListData[]> {

    this.setDefaultOptionFunction(options);

    const self = this;
    return new Promise((resolve, reject) => {

      if (self.batchContainsLocalFiles()) {
        return reject(self.com.err.get(APIErrors.batchLocalFiles, ["runAddEntries"]));
      } else {
        self.client.addEntries(paths, options, self.taskController)
          .then(body => {

            const lists: IListData[] = body as IListData[];
            for (const list of lists) {
              self.appendListData(list);
            }

            return resolve(lists);
          })
          .catch((err: APIError) => {

            return reject(err);
          });
      }
    })
  }

  private runAddEntryObjects(entries: IStringAnyMap[], options: IListOptions, addOptions: IAddEntryOptions): Promise<IListData[]> {

    this.setDefaultOptionFunction(options);

    const self = this;
    return new Promise((resolve, reject) => {

      if (self.batchContainsLocalFiles()) {
        return reject(self.com.err.get(APIErrors.batchLocalFiles, ["runAddEntryObjects"]));
      } else {

        self.client.addEntryObjects(entries, options, addOptions, self.taskController)
          .then(body => {

            const lists: IListData[] = body as IListData[];
            for (const list of lists) {
              self.appendListData(list);
            }

            return resolve(lists);
          })
          .catch((err: APIError) => {

            return reject(err);
          });
      }
    })
  }

  private runAddDirectoryContent(): Promise<boolean> {
    const self = this;

    return new Promise(async (resolve, reject) => {

      if (self.batchContainsLocalFiles()) {
        return reject(self.com.err.get(APIErrors.batchLocalFiles, ["runAddDirectoryContent"]));
      } else {

        let n: number = -1;
        const nEnd: number = this.currentBatch.entries.length;

        const getNext = (): void => {

          n++;
          if (n === nEnd) {
            return resolve(true);
          }

          const entry: IListEntry = this.currentBatch.entries[n];

          if (entry.type !== "directory") {
            return getNext();
          }

          let baseDir: string;
          if (entry.path.indexOf("/") === -1) {
            baseDir = entry._listData.summary.dir;
          } else {
            baseDir = FSIServerClientUtils.GET_PARENT_PATH(entry.path);
          }

          self.client.listServer(entry.path,
            {
              recursive: true,
              baseDir,
              readInternalConnectors: true,
              abortController: self.abortController,
              continueOnError: self.options.continueOnError
            },
            self.taskController
          )
            .then((list) => {
              self.appendListData(list);
              getNext();
            })
            .catch(err => {
              return reject(err);
            })
        };

        getNext();
      }
    });
  }


  private runCustomTask(scope: any, fn: (...args: any[]) => Promise<boolean>, ...args: any[]): Promise<boolean> {

    if (typeof (args) !== "object" || typeof (args.concat) !== "function") args = [];

    args.unshift(this.onCustomProgress);
    args.unshift(this);
    args.unshift(this.client);


    return new Promise((resolve, reject) => {
      setTimeout(() => {
        fn.apply(
          scope,
          args
        )
          .then((ret) => {
            return resolve(ret);
          })
          .catch(err => {
            return reject(err);
          });
      }, 0);
    });
  }


  private async handleFileExists(finalPath: string, httpStatus: number, taskDef: IAPITaskDef): Promise<IOverwriteReply> {

    if (httpStatus === 409) {
      const pf: IPromptFunction | undefined = this.client.getPromptFunction();
      if (!pf) {
        return {
          continue: false,
          reply: ""
        };
      } else {

        let res: IPromptReply | undefined = this.taskController.getUserDecision("file.overwrite");
        if (res === undefined) {

          const task: APITask = this.com.taskSupplier.get(taskDef, [finalPath]);

          res = await this.com.prompt(
            this.options,
            task,
            "file.overwrite",
            [
              "cancel",
              "overwrite",
              "overwriteAll",
              "skip",
              "skipAll"
            ],
            this.taskController
          );

          this.queueProgress.adjustTimeStart(res.time);
        }

        return {
          continue: true,
          reply: res.reply
        }
      }
    } else {
      return {
        continue: false,
        reply: ""
      }
    }
  }
}
