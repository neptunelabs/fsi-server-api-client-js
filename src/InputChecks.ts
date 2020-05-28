import ow from "ow";
import {IListOptions} from "./ListServer";
import {IProgressFunction} from "./utils/IProgressFunction";
import {IPromptFunction} from "./utils/IPromptFunction";
import {IMetaData, IMetaDataOptions} from "./MetaDataClient";

export class InputChecks {

    public static LOGIN(username: string, password: string): void {
        ow(username, "username", ow.string.not.empty);
        ow(password, "password", ow.string.not.empty);
    }

    public static LIST_SERVER(path: string, options: IListOptions = {}): void {
        InputChecks.PATH(path);
        ow(options, "options", ow.object);
    }

    public static PATH(path: string, argName: string = "path"): void {
        ow(path, argName, ow.string.not.empty);
    }

    public static STRING(str: string, argName: string = "path"): void {
        ow(str, argName, ow.string);
    }

    public static BOOL(bool: boolean, argName: string): void {
        ow(bool, argName, ow.boolean);
    }

    public static OBJ(obj: any, argName: string): void {
        ow(obj, argName, ow.object);
    }

    public static FN(fn: (...args: any[]) => any, argName: string): void {
        ow(fn, argName, ow.function);
    }

    public static FN_CTX_OR_UNDEFINED(some: IProgressFunction | IPromptFunction | undefined, argName: string): void {
        if (some !== undefined) {
            ow(some, argName, ow.object);
            InputChecks.OBJ(some.ctx, argName + ".ctx");
            InputChecks.FN(some.fn, argName + ".fn");
        }
    }

    public static HOST(host: string): void {
        ow(host, "host", ow.string.not.empty.is(
            (theHost: string) => {

                return ((theHost.match(/^(http|https):\/\//) !== null) ||
                    "Expected 'host' to be a valid host URL.")
            }));
    }

    public static NUM(num: number, argName: string, min: number, max: number): void {
        ow(num, argName, ow.number.is(
            (theNum: number) => {

                return (theNum >= min && theNum <= max) ||
                    "Expected '" + argName + "' to be number between " + min + " and " + max + "."
            }));
    }


    public static GET_META_DATA(path: string, options: IMetaDataOptions = {}): void {
        InputChecks.PATH(path);
        ow(options, "options", ow.object);
    }

    public static RENAME(oldPath: string, newPath: string): void {
        InputChecks.PATH(oldPath, "oldPath");
        InputChecks.PATH(newPath, "newPath");
    }

    public static RE_IMPORT(image: boolean = true, metaData: boolean = true): void {
        InputChecks.BOOL(image, "image");
        InputChecks.BOOL(metaData, "metaData");
    }

    public static FN_OBJECT_OR_FUNCTION(some: any, argName: string): void {
        InputChecks.notEmptyTwoTypes(some, argName, "object", "function");
    }

    public static OBJECT_OR_STRING(some: any, argName: string): void {
        InputChecks.notEmptyTwoTypes(some, argName, "object", "string");
    }

    public static SERVICE_FD(service: string): void {
        ow(service, "service", ow.string.not.empty.is(
            (theService: string) => {
                return (theService === "file" || theService === "directory") ||
                    "Expected 'service' to be either 'file' or 'directory'."
            }));
    }

    public static META_DATA(path: string, data: IMetaData, service: string): void {
        InputChecks.PATH(path);
        InputChecks.OBJ(data, "data");
        InputChecks.SERVICE_FD(service);
    }

    public static COPY(path: string, toPath: string, listOptions: any): void {
        InputChecks.PATH(path);
        InputChecks.PATH(toPath, "toPath");
        InputChecks.OBJ(listOptions, "listOptions");
    }

    public static STRING_ARRAY(strings: string[], argName: string): void {
        ow(strings, argName, ow.array.nonEmpty.ofType(ow.string));
    }

    public static OBJECT_ARRAY(objects: object[], argName: string): void {
        ow(objects, argName, ow.array.nonEmpty.ofType(ow.object));
    }

    public static STRING_ARRAY_OR_EMPTY_ARRAY(strings: string[], argName: string): void {
        ow(strings, argName, ow.array.ofType(ow.string));
    }

    public static ARCHIVE_TYPE(type: string): void {
        ow(type, "archiveType", ow.string.not.empty.is(
            (at: string) => {
                return (at === "zip" || at === "tar.gz" || at === "tar.bz2") ||
                    "Expected 'options.archiveType' to be 'zip', 'tar.gz' or 'tar.bz2', but received '"
                    + type + "'."
            }));
    }

    private static notEmptyTwoTypes(some: any, argName: string, type1: string, type2: string): void {

        if (!some) {
            throw new Error("Argument '" + argName + " empty or missing.");
        }

        if ((typeof (some) !== type1 && typeof (some) !== type2)) {
            throw new Error("Expected '" + argName + " to be of type '" + type1 + "' or '" + type2 + "', but received '"
                + typeof (some) + "'.");
        }
    }
}
