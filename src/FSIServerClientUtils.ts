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
        return (typeof(window) === "undefined");
    }


    private static readonly RGX_JOIN_PATH_1 = /^\//;
    private static readonly RGX_JOIN_PATH_2 = /\/$/;
    public static JOIN_PATH(path: string, name: string): string {
        path = path.replace(this.RGX_JOIN_PATH_1, "")
        .replace(this.RGX_JOIN_PATH_2, "");
        name = name.replace(this.RGX_JOIN_PATH_1, "")
        .replace(this.RGX_JOIN_PATH_2, "");

        if (path) path += "/";
        if (name) name += "/";

        return this.NORMALIZE_PATH(path + name);
    }

    public static NOW(): number {
        return (bNow) ? Date.now() : new Date().getTime();
    }

    private static readonly RGX_ESCAPE_REG_EX = /[-/\\^$*+?.()|[\]{}]/g;
    public static ESCAPE_REG_EX(s: string): string {
        return s.replace(this.RGX_ESCAPE_REG_EX, '\\$&');
    }

    private static readonly RGX_TRANSFORM_LOCAL_PATH_1 = /^([a-zA-Z]):\\([^\\])/;
    private static readonly RGX_TRANSFORM_LOCAL_PATH_2 = /^([a-zA-Z]):\\$/;
    private static readonly RGX_TRANSFORM_LOCAL_PATH_3 = /\\/g;

    public static TRANSFORM_LOCAL_PATH(path: string): string {
        if (path.match(this.RGX_TRANSFORM_LOCAL_PATH_2)) {

            path = path.replace(this.RGX_TRANSFORM_LOCAL_PATH_1, "$1://$2")
            .replace(this.RGX_TRANSFORM_LOCAL_PATH_2, "$1://");
        }

        path = path.replace(this.RGX_TRANSFORM_LOCAL_PATH_3, "/");

        return path;
    }

    private static readonly RGX_GET_BASE_PATH = /^[^/]*/;
    public static GET_BASE_PATH(path: string): string {

        path = FSIServerClientUtils.NORMALIZE_PATH(path);
        const match = path.match(this.RGX_GET_BASE_PATH);

        return (match && match[0]) ? match[0] : "";
    }

    private static readonly RGX_NORMALIZE_PATH_1 = /\/\//;
    private static readonly RGX_NORMALIZE_PATH_2 = /^\/+/;
    private static readonly RGX_NORMALIZE_PATH_3 = /\/+$/;
    public static NORMALIZE_PATH(path: string): string {
        path = path.replace(this.RGX_NORMALIZE_PATH_1, "/")
        .replace(this.RGX_NORMALIZE_PATH_2, "")
        .replace(this.RGX_NORMALIZE_PATH_3, "");

        return path + "/";
    }

    public static EXTRACT_LAST_DIR(path: string): IPathAndDir {
        let dir: string;

        path = FSIServerClientUtils.NORMALIZE_PATH(path);
        const parts: string[] = path.split("/");

        parts.pop();
        if (parts.length > 0) {
            dir = parts.pop() || "";
        } else {
            dir = "";
        }

        if (parts.length > 0) path = FSIServerClientUtils.NORMALIZE_PATH(parts.join("/"));
        else path = "";

        return {path, dir, error: undefined, errorContent: [path]};
    }

    private static readonly RGX_FILE_AND_PATH_1 = /\//;
    private static readonly RGX_FILE_AND_PATH_2 = /\/$/;
    public static FILE_AND_PATH(path: string): IPathAndDir {
        let err: IAPIErrorDef | undefined;


        if (path.length < 3 || !path.match(this.RGX_FILE_AND_PATH_1) || path.match(this.RGX_FILE_AND_PATH_2)) {
            err = APIErrors.noValidFile;
        }

        path = FSIServerClientUtils.NORMALIZE_PATH(path)
        .replace(this.RGX_FILE_AND_PATH_2, "");

        const parts: string[] = path.split("/");
        const dir: string = parts.pop() || "";
        if (parts.length > 0) {
            path = FSIServerClientUtils.NORMALIZE_PATH(parts.join("/"));
        } else {
            err = APIErrors.invalidPath;
            path = "";
        }

        return {path, dir, error: err, errorContent: [path]};
    }

    private static readonly RGX_GET_PARENT_PATH_1 = /\/+$/;
    private static readonly RGX_GET_PARENT_PATH_2 = /\/[^/]*$/;

    public static GET_PARENT_PATH(path: string): string {
        path = path.replace(this.RGX_GET_PARENT_PATH_1, "");
        let ret: string = path.replace(this.RGX_GET_PARENT_PATH_2, "");
        ret = FSIServerClientUtils.NORMALIZE_PATH(ret);
        return ret;
    }

    public static GET_SUB_DIR(basePath: string, path: string): string {
        basePath = FSIServerClientUtils.NORMALIZE_PATH(basePath);
        path = FSIServerClientUtils.NORMALIZE_PATH(path);

        const regBasePath = new RegExp("^" + FSIServerClientUtils.ESCAPE_REG_EX(basePath));

        if (path.match(regBasePath)) return path.replace(regBasePath, "");
        else return "";
    }

    public static NORMALIZE_FILE_PATH(path: string): string {
        const pd: IPathAndDir = FSIServerClientUtils.FILE_AND_PATH(path);
        return pd.path + pd.dir;
    }

    public static REPLACE_LAST_DIR(path: string, newDir: string): string {
        const pd: IPathAndDir = FSIServerClientUtils.EXTRACT_LAST_DIR(path);

        return FSIServerClientUtils.JOIN_PATH(pd.path, newDir);
    }

    private static readonly RGX_REPLACE_FILE_EXTENSION = /\.[^.].*$/;

    public static REPLACE_FILE_EXTENSION(path: string, ext: string): string {
        return path.replace(this.RGX_REPLACE_FILE_EXTENSION, "." + ext);
    }

    private static readonly RGX_MAKE_RELATIVE_PATH = [
        /^(\/\/[^/]+)/,
        /^([a-z]):\/+/i,
        /^\.+\/+/,
        /^\.+/,
        /^[^/]*:\/\//,
        /^\/+/
    ];

    public static MAKE_RELATIVE_PATH(path: string): string {

        path = path.replace(this.RGX_MAKE_RELATIVE_PATH[0], "")
        .replace(this.RGX_MAKE_RELATIVE_PATH[1], "")
        .replace(this.RGX_MAKE_RELATIVE_PATH[2], "")
        .replace(this.RGX_MAKE_RELATIVE_PATH[3], "")
        .replace(this.RGX_MAKE_RELATIVE_PATH[4], "")
        .replace(this.RGX_MAKE_RELATIVE_PATH[5], "");

        return FSIServerClientUtils.NORMALIZE_PATH(path);
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
            if (bHuman && ++nBlocks === 2) return res.trim();
        }

        t = Math.floor(ms / 60000);
        ms = ms % 60000;

        if (res.length || t > 0) {
            res += this.translateTimePeriod(t, ["m", "minute", "minutes"], translations);
            if (bHuman && ++nBlocks === 2) return res.trim();
        }


        t = (includeMS || msIn > 1000) ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
        ms = ms % 1000;


        if (!includeMS || res.length || t > 0) {
            res += this.translateTimePeriod(t, ["s", "second", "seconds"], translations);
            if (bHuman && ++nBlocks === 2) return res.trim();
        }

        if (includeMS) {
            res += this.translateTimePeriod(ms, ["ms", "millisecond", "milliseconds"], translations);
        }

        return res.trim();
    }

    private static readonly RGX_GET_NEW_RELATIVE_PATH = /\/$/;

    public static GET_NEW_RELATIVE_PATH(path: string, basePath: string, targetPath: string,
                                        entry: IListEntry, options: ICopyOptions = {}, tries: number = 0): string {

        let subPath: string = FSIServerClientUtils.GET_SUB_DIR(basePath, path);
        subPath = subPath.replace(this.RGX_GET_NEW_RELATIVE_PATH, "");

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
