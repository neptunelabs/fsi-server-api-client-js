import {IListOptions} from "./ListServer";
import {IMetaData, IMetaDataOptions} from "./MetaDataClient";
import {FSIServerClientUtils} from "./FSIServerClientUtils";

const modeNode: boolean = FSIServerClientUtils.GET_MODE_NODE();

export class InputChecks {

    private static THROW_ERROR(str:string){
        throw(new Error(str));
    }

    public static CHECK_ARGUMENT_TYPE(val:any, argName:string, expectedType:string){

        const isType:string = typeof(val);

        if (isType !== expectedType){
            InputChecks.THROW_ERROR(
                "Expected argument '" + argName + "' to be of type '" + expectedType
                + "', but received type '" + isType+"'")
        }
    }

    public static IS_ARRAY(val:any[], argName:string){
        if (modeNode) return;

        if (typeof(val) !== "object" || typeof(val.concat) !== "function"){
            InputChecks.THROW_ERROR(
                "Expected argument '" + argName + "' to be an array, but received type '" + typeof(val) + "'.");
        }
    }

    public static IS_ARRAY_NOT_EMPTY(val:any[], argName:string){

        InputChecks.IS_ARRAY(val, argName);
        if (val.length < 1){
            InputChecks.THROW_ERROR("Expected '" + argName + "' to be a non empty array.");
        }
    }

    public static ARRAY_CONTAINS(val:any[], argName:string, type:string){
        if (modeNode) return;

        for (const item of val) {
            if (typeof(item) !== type) {
                InputChecks.THROW_ERROR("Argument '" + argName + "' may only contain elements of type '" + type + "'.");
            }
        }

    }

    public static IS_STRING(val:string, argName:string){
        if (modeNode) return;

        InputChecks.CHECK_ARGUMENT_TYPE(val, argName, "string");
    }

    public static IS_STRING_NOT_EMPTY(val:string, argName:string){

        InputChecks.IS_STRING(val, argName);
        if (val.length < 1){
            InputChecks.THROW_ERROR("Argument '" + argName + "' may not be an empty string.");
        }
    }

    public static PATH(path: string, argName: string = "path"): void {
        InputChecks.IS_STRING_NOT_EMPTY(path, argName);
    }

    public static LOGIN(username: string, password: string): void {
        InputChecks.IS_STRING_NOT_EMPTY(username, "username");
        InputChecks.IS_STRING_NOT_EMPTY(password, "password");
    }

    public static LIST_SERVER(path: string, options: IListOptions = {}): void {

        InputChecks.PATH(path);
        InputChecks.IS_OBJECT(options, "options");
    }

    public static STRING(str: string, argName: string = "path"): void {
        if (modeNode) return;

        InputChecks.IS_STRING(str, argName);
    }

    public static IS_BOOL(bool: boolean, argName: string): void {
        if (modeNode) return;

        InputChecks.CHECK_ARGUMENT_TYPE(bool, argName, "boolean");
    }

    public static IS_OBJECT(obj: object|null, argName: string): void {
        InputChecks.CHECK_ARGUMENT_TYPE(obj, argName, "object");
        if (obj === null) InputChecks.THROW_ERROR("Expected argument '" + argName + "' to be an object, but received 'null'");
    }

    public static IS_FN(fn: any, argName: string): void {
        InputChecks.CHECK_ARGUMENT_TYPE(fn, argName, "function");
    }

    public static FN_CTX_OR_UNDEFINED(some: any, argName: string): void {

        if (some !== undefined) {
            InputChecks.IS_OBJECT(some, argName);
            InputChecks.IS_OBJECT(some.ctx, argName + ".ctx");
            InputChecks.IS_FN(some.fn, argName + ".fn");
        }
    }

    public static HOST(host: string): void {

        InputChecks.IS_STRING_NOT_EMPTY(host, "host");
        if (host.match(/^(http|https):\/\//) === null){
            InputChecks.THROW_ERROR("Expected 'host' to be a valid host URL.");
        }
    }

    public static NUM(num: number, argName: string, min: number, max: number): void {

        InputChecks.CHECK_ARGUMENT_TYPE(num, argName, "number");
        if (num < min || num > max){
            InputChecks.THROW_ERROR("Expected '" + argName + "' to be a number between " + min + " and " + max + ".")
        }
    }

    public static GET_META_DATA(path: string, options: IMetaDataOptions = {}): void {
        InputChecks.PATH(path);
        InputChecks.IS_OBJECT(options, "options");
    }

    public static RENAME(oldPath: string, newPath: string): void {
        InputChecks.PATH(oldPath, "oldPath");
        InputChecks.PATH(newPath, "newPath");
    }

    public static RE_IMPORT(image: boolean = true, metaData: boolean = true): void {
        if (modeNode) return;

        InputChecks.IS_BOOL(image, "image");
        InputChecks.IS_BOOL(metaData, "metaData");
    }

    public static FN_OBJECT_OR_FUNCTION(some: any, argName: string): void {
        InputChecks.NotEmptyTwoTypes(some, argName, "object", "function");
    }

    public static OBJECT_OR_STRING(some: object|string, argName: string): void {
        if (modeNode) return;

        InputChecks.NotEmptyTwoTypes(some, argName, "object", "string");
    }

    public static SERVICE_FD(service: any): void {

        InputChecks.IS_STRING_NOT_EMPTY(service, "service");
        if (service !== "file" && service !== "directory"){
            InputChecks.THROW_ERROR("Expected 'service' to be either 'file' or 'directory', but received '" + service + "'.")
        }
    }

    public static META_DATA(path: string, data: IMetaData, service: string): void {
        InputChecks.PATH(path);
        InputChecks.IS_OBJECT(data, "data");
        InputChecks.SERVICE_FD(service);
    }

    public static COPY(path: string, toPath: string, listOptions: any): void {
        InputChecks.PATH(path);
        InputChecks.PATH(toPath, "toPath");
        InputChecks.IS_OBJECT(listOptions, "listOptions");
    }

    public static STRING_ARRAY(strings: string[], argName: string): void {
        InputChecks.IS_ARRAY_NOT_EMPTY(strings, argName);
        InputChecks.ARRAY_CONTAINS(strings, argName, "string");
    }

    public static OBJECT_ARRAY(objects: object[], argName: string): void {
        InputChecks.IS_ARRAY_NOT_EMPTY(objects, argName);
        InputChecks.ARRAY_CONTAINS(objects, argName, "object");
    }

    public static STRING_ARRAY_OR_EMPTY_ARRAY(strings: string[], argName: string): void {
        if (modeNode) return;

        InputChecks.IS_ARRAY(strings, argName);
        InputChecks.ARRAY_CONTAINS(strings, argName, "string");
    }

    public static ARCHIVE_TYPE(type: string): void {

        InputChecks.IS_STRING_NOT_EMPTY(type, "options.archiveType");
        if (type !== "zip" && type !== "tar.gz" && type !== "tar.bz2"){
            InputChecks.THROW_ERROR("Expected 'options.archiveType' to be 'zip', 'tar.gz' or 'tar.bz2', but received '"
                + type + "'.")
        }
    }

    public static NotEmptyTwoTypes(some: any, argName: string, type1: string, type2: string): void {

        if (!some) {
            InputChecks.THROW_ERROR("Argument '" + argName + "' empty or missing.");
        }

        if ((typeof (some) !== type1 && typeof (some) !== type2)) {
            InputChecks.THROW_ERROR("Expected '" + argName + "' to be of type '" + type1 + "' or '" + type2 + "', but received '"
                + typeof (some) + "'.");
        }
    }
}
