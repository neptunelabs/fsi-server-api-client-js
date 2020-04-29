import {APIErrors, IAPIErrorDef} from "./resources/APIErrors";
import {IListEntry} from "./ListServer";
import {ICopyOptions} from "./FileOps";

const bNow = (typeof (Date.now) === "function");

export interface IStringStringMap {
    [key: string]: string;
}

export interface IStringAnyMap {
    [key: string]: any;
}

export interface IPathAndDir {
    path: string,
    dir: string,
    error: IAPIErrorDef | undefined,
    errorContent: any[] | undefined
}

export class FSIServerClientUtils {

    public static USERAGENT = 'FSI Server API Client';

    public static GET_MODE_NODE(): boolean {
        // tslint:disable-next-line:no-typeof-undefined
        return (typeof (window) === "undefined");
    }

    public static JOIN_PATH(path: string, name: string): string {
        path = path.replace(/^\//, "");
        path = path.replace(/\/$/, "");
        name = name.replace(/^\//, "");
        name = name.replace(/\/$/, "");

        return path + "/" + name;
    }

    public static NOW(): number {
        return (bNow) ? Date.now() : new Date().getTime();
    }

    public static ESCAPE_REG_EX(s: string): string {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    public static TRANSFORM_LOCAL_PATH(path: string): string {
        if (path.match(/^([a-zA-Z]):\\/)) {


            path = path.replace(/^([a-zA-Z]):\\([^\\])/, "$1://$2");
            path = path.replace(/^([a-zA-Z]):\\$/, "$1://");

            path = path.replace(/\\/g, "/");

        }
        return path;
    }


    public static GET_BASE_PATH(path: string): string {

        path = FSIServerClientUtils.NORMALIZE_PATH(path);
        const match = path.match(/^[^/]*/);

        return (match && match[0]) ? match[0] : "";
    }

    public static NORMALIZE_PATH(path: string): string {
        path = path.replace(/^\/+/, "");
        path = path.replace(/\/+$/, "");

        return path + "/";
    }

    public static EXTRACT_LAST_DIR(path: string): IPathAndDir {
        let dir: string;
        let err: IAPIErrorDef | undefined;

        path = FSIServerClientUtils.NORMALIZE_PATH(path);
        const parts: string[] = path.split("/");

        parts.pop();
        if (parts.length > 0) {
            dir = parts.pop()!;
        } else {
            err = APIErrors.invalidPath;
            dir = "";
        }

        path = FSIServerClientUtils.NORMALIZE_PATH(parts.join("/"));

        if (path.length < 2) {
            err = APIErrors.invalidPath;
        }


        return {path, dir, error: err, errorContent: [path]};
    }

    public static FILE_AND_PATH(path: string): IPathAndDir {
        let err: IAPIErrorDef | undefined;


        if (path.length < 3 || !path.match(/\//) || path.match(/\/$/)) {
            err = APIErrors.noValidFile;
        }

        path = FSIServerClientUtils.NORMALIZE_PATH(path);
        path = path.replace(/\/$/, "");

        const parts: string[] = path.split("/");
        const dir: string = parts.pop()!;
        if (parts.length > 0) {
            path = FSIServerClientUtils.NORMALIZE_PATH(parts.join("/"));
        } else {
            err = APIErrors.invalidPath;
            path = "/";
        }

        return {path, dir, error: err, errorContent: [path]};
    }

    public static GET_PARENT_PATH(path: string): string {
        path = path.replace(/\/+$/, "");
        let ret: string = path.replace(/\/[^/]*$/, "");
        ret = FSIServerClientUtils.NORMALIZE_PATH(ret);
        return ret;
    }

    public static GET_SUB_DIR(basePath: string, path: string): string {
        basePath = FSIServerClientUtils.NORMALIZE_PATH(basePath);
        path = FSIServerClientUtils.NORMALIZE_PATH(path);

        const regBasePath = new RegExp("^" + FSIServerClientUtils.ESCAPE_REG_EX(basePath));

        return path.replace(regBasePath, "");
    }

    public static NORMALIZE_FILE_PATH(path: string): string {
        const pd: IPathAndDir = FSIServerClientUtils.FILE_AND_PATH(path);
        return pd.path + pd.dir;
    }

    public static REPLACE_LAST_DIR(path: string, newDir: string): string {
        const pd: IPathAndDir = FSIServerClientUtils.EXTRACT_LAST_DIR(path);

        return FSIServerClientUtils.JOIN_PATH(pd.path, newDir);
    }

    public static REPLACE_FILE_EXTENSION(path: string, ext: string): string {
        return path.replace(/\.[^.].*$/, "." + ext);
    }

    public static MAKE_RELATIVE_PATH(path: string): string {
        path = path.replace(/^([a-z]):\/+/i, "");
        path = path.replace(/^\.+\/+/, "");

        path = path.replace(/^\.+/, "");
        path = path.replace(/^[^/]*:\/\//g, "");
        path = path.replace(/^\/+/g, "");

        return path;
    }

    public static FORMAT_TIME_PERIOD(ms: number, includeMS: boolean = false, bHuman: boolean = true,
                                     translations?: IStringStringMap): string {

        if (!bHuman) translations = undefined;

        let nBlocks = 0;
        const msIn: number = ms;

        ms = Math.floor(ms);

        let res: string = "";

        let t: number = Math.floor(ms / 86400000);

        ms = ms % 86400000;
        if (t > 0) {
            res += this.translateTimePeriod(t, ["d", "day", "days"], translations);
        }

        t = Math.floor(ms / 3600000);

        ms = ms % 3600000;
        if (res.length || t > 0) {
            res += this.translateTimePeriod(t, ["h", "hour", "hours"], translations);
            if (bHuman && ++nBlocks === 2) return res;
        }

        t = Math.floor(ms / 60000);
        ms = ms % 60000;

        if (res.length || t > 0) {
            res += this.translateTimePeriod(t, ["m", "minute", "minutes"], translations);
            if (bHuman && ++nBlocks === 2) return res;
        }


        t = (includeMS || msIn > 1000) ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
        ms = ms % 1000;


        if (!includeMS || res.length || t > 0) {
            res += this.translateTimePeriod(t, ["s", "second", "seconds"], translations);
            if (bHuman && ++nBlocks === 2) return res;
        }

        if (includeMS) {
            res += this.translateTimePeriod(ms, ["ms", "millisecond", "milliseconds"], translations);
        }

        return res;
    }

    public static GET_NEW_RELATIVE_PATH(path: string, basePath: string, targetPath: string,
                                        entry: IListEntry, options: ICopyOptions = {}, tries: number = 0) {

        let subPath: string = FSIServerClientUtils.GET_SUB_DIR(basePath, path);
        subPath = subPath.replace(/\/$/, "");

        if (options.fnRename) subPath = options.fnRename(entry, subPath, tries);

        return FSIServerClientUtils.NORMALIZE_PATH(targetPath) + subPath;
    }

    private static translateTimePeriod(n: number, trans: string[], translations?: IStringStringMap): string {

        if (!translations) return n + trans[0] + " ";
        else {

            const key: number = (n === 1) ? 1 : 2;
            if (translations[trans[key]]) return n + " " + translations[trans[key]] + " ";
            else return n + trans[0] + " ";

        }
    }
}
