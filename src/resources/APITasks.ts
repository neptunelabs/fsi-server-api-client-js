import {IAPITemplateDef} from "./TranslatableTemplate";

export interface IAPITaskDef extends IAPITemplateDef {
  isTask: boolean
}

export class APITasks {
  public static readonly idle: IAPITaskDef = {
    isTask: true,
    key: "idle",
    template: ""
  };
  public static readonly any: IAPITaskDef = {
    isTask: true,
    key: "any",
    template: "%s"
  };
  public static readonly continueAfterError: IAPITaskDef = {
    isTask: true,
    key: "continueAfterError",
    template: "%s Do you want to continue?"
  };
  public static readonly queueStart: IAPITaskDef = {
    isTask: true,
    key: "queueStart",
    template: "Starting command queue with %s items"
  };
  public static readonly queueFinished: IAPITaskDef = {
    isTask: true,
    key: "queueFinished",
    template: "Command queue finished with %s error(s) after %s"
  };
  public static readonly login: IAPITaskDef = {
    isTask: true,
    key: "login",
    template: "Logging in at \"%s\" as user \"%s\""
  };
  public static readonly logout: IAPITaskDef = {
    isTask: true,
    key: "logout",
    template: "Logging out from \"%s\""
  };
  public static readonly readListConnectors: IAPITaskDef = {
    isTask: true,
    key: "readListConnectors",
    template: "Retrieving list of connectors"
  };
  public static readonly readListServer: IAPITaskDef = {
    isTask: true,
    key: "readListServer",
    template: "Retrieving list for \"%s\""
  };
  public static readonly readListLocal: IAPITaskDef = {
    isTask: true,
    key: "readListLocal",
    template: "Reading local directory \"%s\""
  };
  public static readonly createDir: IAPITaskDef = {
    isTask: true,
    key: "createDir",
    template: "Creating directory \"%s\""
  };
  public static readonly renameFile: IAPITaskDef = {
    isTask: true,
    key: "renameFile",
    template: "Renaming file \"%s\" to \"%s\""
  };
  public static readonly renameDir: IAPITaskDef = {
    isTask: true,
    key: "renameDir",
    template: "Renaming directory \"%s\" to \"%s\""
  };
  public static readonly moveFile: IAPITaskDef = {
    isTask: true,
    key: "moveFile",
    template: "Moving file \"%s\" to \"%s\""
  };
  public static readonly moveDir: IAPITaskDef = {
    isTask: true,
    key: "moveDir",
    template: "Moving directory \"%s\" to \"%s\""
  };
  public static readonly deleteFile: IAPITaskDef = {
    isTask: true,
    key: "deleteFile",
    template: "Deleting file \"%s\""
  };
  public static readonly deleteDir: IAPITaskDef = {
    isTask: true,
    key: "deleteDir",
    template: "Deleting directory \"%s\""
  };
  public static readonly copyFile: IAPITaskDef = {
    isTask: true,
    key: "copyFile",
    template: "Copying file \"%s\" to \"%s\""
  };
  public static readonly copyDir: IAPITaskDef = {
    isTask: true,
    key: "copyDir",
    template: "Copying directory \"%s\" to \"%s\""
  };
  public static readonly startQueueCommand: IAPITaskDef = {
    isTask: true,
    key: "startQueueCommand",
    template: "Run queue command %s/%s: \"%s\""
  };
  public static readonly readSubDir: IAPITaskDef = {
    isTask: true,
    key: "readSubDir",
    template: "Reading subdirectory \"%s\" at level %s"
  };
  public static readonly getMetaData: IAPITaskDef = {
    isTask: true,
    key: "getMetaData",
    template: "Loading meta data for \"%s\""
  };
  public static readonly setMetaData: IAPITaskDef = {
    isTask: true,
    key: "setMetaData",
    template: "Saving meta data for %s \"%s\", data: \"%s\""
  };
  public static readonly logBatchContent: IAPITaskDef = {
    isTask: true,
    key: "logBatchContent",
    template: "Dumping current batch entries"
  };
  public static readonly logBatchContentSummary: IAPITaskDef = {
    isTask: true,
    key: "logBatchContentSummary",
    template: "Dumping current batch content summary"
  };
  public static readonly skipping: IAPITaskDef = {
    isTask: true,
    key: "skipping",
    template: "Skipping \"%s\""
  };
  public static readonly reImportFile: IAPITaskDef = {
    isTask: true,
    key: "reImportFile",
    template: "Asking server to re-import file \"%s\""
  };
  public static readonly reImportDir: IAPITaskDef = {
    isTask: true,
    key: "reImportDir",
    template: "Asking server to re-import directory \"%s\""
  };
  public static readonly queueContentSummary: IAPITaskDef = {
    isTask: true,
    key: "queueContentSummary",
    template: "Current queue content:"
  };
  public static readonly skipDirNote: IAPITaskDef = {
    isTask: true,
    key: "skipDirNote",
    template: "Skipping directories with depth > %s."
  };
  public static readonly skipDir: IAPITaskDef = {
    isTask: true,
    key: "skipDir",
    template: "Skipping subdirectories of \"%s\" with depth > %s"
  };
  public static readonly skipInternalConnector: IAPITaskDef = {
    isTask: true,
    key: "skipInternalConnector",
    template: "Skipping content of internal connector \"%s\", because list option \"readInternalConnectors\" is not \"true\""
  };
  public static readonly skipConnectorType: IAPITaskDef = {
    isTask: true,
    key: "skipConnectorType",
    template: "Skipping content of  \"%s\", because connector type \"%s\" is not allowed by list option \"validConnectorTypes\""
  };
  public static readonly skipDirBlackList: IAPITaskDef = {
    isTask: true,
    key: "skipDirBlackList",
    template: "Skipping directory \"%s\" (blacklist)."
  };
  public static readonly queueEmpty: IAPITaskDef = {
    isTask: true,
    key: "queueEmpty",
    template: "The queue item list does not contain any entries."
  };
  public static readonly addEntries: IAPITaskDef = {
    isTask: true,
    key: "addEntries",
    template: "Adding %s entries to list"
  };
  public static readonly addingEntry: IAPITaskDef = {
    isTask: true,
    key: "addingEntry",
    template: "Adding entry %s/%s: \"%s\""
  };
  public static readonly addingEntryList: IAPITaskDef = {
    isTask: true,
    key: "addingEntryList",
    template: "Adding list %s/%s for \"%s\""
  };
  public static readonly downloadFile: IAPITaskDef = {
    isTask: true,
    key: "downloadFile",
    template: "Downloading \"%s\""
  };
  public static readonly preparingFile: IAPITaskDef = {
    isTask: true,
    key: "preparingFile",
    template: "Preparing \"%s\""
  };
  public static readonly uploadFile: IAPITaskDef = {
    isTask: true,
    key: "uploadFile",
    template: "Uploading \"%s\""
  };
  public static readonly batchDownload: IAPITaskDef = {
    isTask: true,
    key: "batchDownload",
    template: "Downloading %s files to \"%s\""
  };
  public static readonly batchDownloadBrowser: IAPITaskDef = {
    isTask: true,
    key: "batchDownloadBrowser",
    template: "Preparing %s files for download"
  };
  public static readonly batchUpload: IAPITaskDef = {
    isTask: true,
    key: "batchUpload",
    template: "Uploading %s files to \"%s\""
  };
  public static readonly batchRename: IAPITaskDef = {
    isTask: true,
    key: "batchRename",
    template: "Renaming %s items"
  };
  public static readonly batchMove: IAPITaskDef = {
    isTask: true,
    key: "batchMove",
    template: "Moving %s items"
  };
  public static readonly batchReImport: IAPITaskDef = {
    isTask: true,
    key: "batchReImport",
    template: "Reimporting %s items"
  };
  public static readonly batchGetMateData: IAPITaskDef = {
    isTask: true,
    key: "batchGetMateData",
    template: "Get meta data of %s items"
  };
  public static readonly batchSetMetaData: IAPITaskDef = {
    isTask: true,
    key: "batchSetMetaData",
    template: "Saving meta data of %s items"
  };
  public static readonly batchDelete: IAPITaskDef = {
    isTask: true,
    key: "batchDelete",
    template: "Deleting %s items"
  };
  public static readonly batchCopy: IAPITaskDef = {
    isTask: true,
    key: "batchCopy",
    template: "Copying %s items"
  };
  public static readonly readDataTransfer: IAPITaskDef = {
    isTask: true,
    key: "readDataTransfer",
    template: "Collecting files"
  };
  public static readonly processFile: IAPITaskDef = {
    isTask: true,
    key: "processFile",
    template: "Processing file \"%s\""
  };
  public static readonly skipDownload: IAPITaskDef = {
    isTask: true,
    key: "skipDownload",
    template: "Skipping download, because file \"%s\" already exists (set options.overwriteExisting:true to overwrite)"
  };
  public static readonly skipUpload: IAPITaskDef = {
    isTask: true,
    key: "skipUpload",
    template: "Skipping upload, because file \"%s\" already exists (set options.overwriteExisting:true to overwrite)"
  };
  public static readonly skipUploadDir: IAPITaskDef = {
    isTask: true,
    key: "skipUploadDir",
    template: "Skipping directory \"%s\" (it already exists)"
  };
  public static readonly skipUploadDirFlatten: IAPITaskDef = {
    isTask: true,
    key: "skipUploadDirFlatten",
    template: "Skipping directory \"%s\" (options.flattenTargetPath is set)"
  };
  public static readonly overwriteTargetFile: IAPITaskDef = {
    isTask: true,
    key: "overwriteTargetFile",
    template: "The file \"%s\" already exists. Overwrite?"
  };
  public static readonly overwriteTargetDirectory: IAPITaskDef = {
    isTask: true,
    key: "overwriteTargetDirectory",
    template: "The directory \"%s\" already exists. Overwrite?"
  };
  public static readonly waitDownload: IAPITaskDef = {
    isTask: true,
    key: "waitDownload",
    template: "Waiting for server to create archive \"%s\""
  };
  public static readonly sendPlainPassword: IAPITaskDef = {
    isTask: true,
    key: "sendPlainPassword",
    template: "The server requested an unencrypted password.<br/>You are currently <b>not using an SSL secured " +
      "connection</b>.<br/><br/>Do you want to continue anyway and send an <b>unencrypted password</b>?;"
  };
  public static readonly batchSendServiceCommands: IAPITaskDef = {
    isTask: true,
    key: "batchSendServiceCommands",
    template: "Sending command \"%s\" to %s %s items"
  };
  public static readonly sendServiceCommand: IAPITaskDef = {
    isTask: true,
    key: "sendServiceCommand",
    template: "Sending command \"%s\" to %s \"%s\""
  };
  public static readonly changePassWord: IAPITaskDef = {
    isTask: true,
    key: "changePassWord",
    template: "Setting a new password for user \"%s\""
  };
  public static readonly changeUser: IAPITaskDef = {
    isTask: true,
    key: "changeUser",
    template: "Changing current user to \"%s\""
  };
  public static readonly getUserList: IAPITaskDef = {
    isTask: true,
    key: "getUserList",
    template: "Loading user list"
  };

}

