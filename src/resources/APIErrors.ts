import {IAPITemplateDef} from "./TranslatableTemplate";

export interface IAPIErrorDef extends IAPITemplateDef {
    isError: boolean,
    buttons?: string[],
    noContinueText?: boolean
}


export class APIErrors {
    public static readonly list: IAPIErrorDef = {
        isError: true,
        key: "list",
        template: "Failed to read entries of directory \"%s\"."
    };
    public static readonly addEntry: IAPIErrorDef = {
        isError: true,
        key: "addEntry",
        template: "Failed to add entry \"%s\"."
    };
    public static readonly login: IAPIErrorDef = {
        isError: true,
        key: "login",
        template: "Failed to log in with user name \"%s\"."
    };
    public static readonly logout: IAPIErrorDef = {
        isError: true,
        key: "logout",
        template: "Failed to log out.",
    };
    public static readonly invalidServerReply: IAPIErrorDef = {
        isError: true,
        key: "invalidServerReply",
        template: "The server reply is invalid."

    };
    public static readonly httpError: IAPIErrorDef = {
        isError: true,
        key: "httpError",
        template: "The server replied with status %s when requesting %s."
    };
    public static readonly httpErrorShort: IAPIErrorDef = {
        isError: true,
        key: "httpErrorShort",
        template: "The server replied with status %s."
    };
    public static readonly serverRefusedPlainPassword: IAPIErrorDef = {
        isError: true,
        key: "serverRefusedPlainPassword",
        template: "Refused to send plain password over non-secured connection."
    };
    public static readonly serverError: IAPIErrorDef = {
        isError: true,
        key: "serverError",
        template: "The server replied: %s"
    };
    public static readonly getMetaData: IAPIErrorDef = {
        isError: true,
        key: "getMetaData",
        template: "Failed to get meta data for file \"%s\"."
    };
    public static readonly copyDir: IAPIErrorDef = {
        isError: true,
        key: "copyDir",
        template: "Failed to copy directory \"%s\" to \"%s\"."
    };
    public static readonly copyFile: IAPIErrorDef = {
        isError: true,
        key: "copyFile",
        template: "Failed to copy file \"%s\" to \"%s\"."
    };
    public static readonly invalidTargetPath: IAPIErrorDef = {
        isError: true,
        key: "invalidTargetPath",
        template: "The target path is invalid."
    };
    public static readonly queueStoppedWithErrors: IAPIErrorDef = {
        isError: true,
        key: "queueStoppedWithErrors",
        template: "The queue stopped due to errors."
    };
    public static readonly logoutNotLoggedIn: IAPIErrorDef = {
        isError: true,
        key: "logoutNotLoggedIn",
        template: "Logout failed. There is no active session."
    };
    public static readonly createDir: IAPIErrorDef = {
        isError: true,
        key: "createDir",
        template: "Failed to create directory \"%s\"."
    };
    public static readonly invalidDirName: IAPIErrorDef = {
        isError: true,
        key: "invalidDirName",
        template: "The directory name contains the following invalid characters: \"%s\"."
    };
    public static readonly rename: IAPIErrorDef = {
        isError: true,
        key: "rename",
        template: "Failed to rename \"%s\" to \"%s\"."
    };
    public static readonly invalidServiceName: IAPIErrorDef = {
        isError: true,
        key: "invalidServiceName",
        template: "\%s\" is not a valid service name."
    };
    public static readonly invalidNewName: IAPIErrorDef = {
        isError: true,
        key: "invalidNewName",
        template: "The new name contains the following invalid characters: \"%s\"."
    };
    public static readonly noValidFile: IAPIErrorDef = {
        isError: true,
        key: "noValidFile",
        template: "The path \"%s\" is missing a valid file."
    };
    public static readonly invalidPath: IAPIErrorDef = {
        isError: true,
        key: "invalidPath",
        template: "The path \"%s\" is invalid."
    };
    public static readonly reImportFile: IAPIErrorDef = {
        isError: true,
        key: "reImportFile",
        template: "Failed to re-import file \"%s\"."
    };
    public static readonly reImportDir: IAPIErrorDef = {
        isError: true,
        key: "reImportDir",
        template: "Failed to re-import directory \"%s\"."
    };
    public static readonly reImportNothing: IAPIErrorDef = {
        isError: true,
        key: "reImportNothing",
        template: "Option \"image\" or \"meta data\" (or both) must be selected for re-import."
    };
    public static readonly queueRunning: IAPIErrorDef = {
        isError: true,
        key: "queueRunning",
        template: "Cannot start queue, already running"
    };
    public static readonly downloadFile: IAPIErrorDef = {
        isError: true,
        key: "downloadFile",
        template: "Failed to download \"%s\"."
    };
    public static readonly upload: IAPIErrorDef = {
        buttons: ["skip", "skipAll", "cancel"],
        isError: true,
        key: "upload",
        noContinueText: true,
        template: "Failed to upload \"%s\".",
    };

    public static readonly anyError: IAPIErrorDef = {
        isError: true,
        key: "anyError",
        template: "\"%s\""
    };
    public static readonly userAborted: IAPIErrorDef = {
        isError: true,
        key: "userAborted",
        template: "Aborted by user"
    };
    public static readonly batchNonLocalFiles: IAPIErrorDef = {
        isError: true,
        key: "batchNonLocalFiles",
        template: "Failed to run \"%s\", because the queue contains non local files."
    };
    public static readonly batchLocalFiles: IAPIErrorDef = {
        isError: true,
        key: "batchLocalFiles",
        template: "Failed to run \"%s\", because the queue contains local files."
    };

    public static readonly isDirectory: IAPIErrorDef = {
        isError: true,
        key: "isDirectory",
        template: "\"%s\" is a directory."
    };

    public static readonly changePassWord: IAPIErrorDef = {
        isError: true,
        key: "changePassWord",
        template: "Failed to set a new password."
    };

    public static readonly getUserList: IAPIErrorDef = {
        isError: true,
        key: "getUserList",
        template: "Failed to load user list."
    };

    public static readonly changeUser: IAPIErrorDef = {
        isError: true,
        key: "changeUser",
        template: "Failed to change user to \"%s\"."
    };

    public static readonly deleteFile: IAPIErrorDef = {
        buttons: ["skip", "skipAll", "cancel"],
        isError: true,
        key: "deleteFile",
        noContinueText: true,
        template: "Failed to delete file \"%s\"."
    };

    public static readonly deleteDir: IAPIErrorDef = {
        buttons: ["skip", "skipAll", "cancel"],
        isError: true,
        key: "deleteDir",
        noContinueText: true,
        template: "Failed to delete directory \"%s\"."
    };

    public static readonly changeMetaData: IAPIErrorDef = {
        buttons: ["skip", "skipAll", "cancel"],
        isError: true,
        key: "changeMetaData",
        noContinueText: true,
        template: "Failed to change the meta data of \"%s\"."
    };


}
