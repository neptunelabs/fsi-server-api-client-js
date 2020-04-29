import {extname} from "path";
import {MimeDB as db} from "./resources/MimeDB"

export class MimeTypes {

    private static EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
    private extensions: { [key: string]: string[] } = {};
    private types: { [key: string]: string } = {};

    constructor() {
        this.populateMaps();
    }

    public extension(type: string): string | false {
        if (!type) {
            return false;
        }

        const match = MimeTypes.EXTRACT_TYPE_REGEXP.exec(type);

        let extensions: string[] = [];

        if (match && match[1]) {
            extensions = match && this.extensions[match[1].toLowerCase()];
            if (!extensions || !extensions.length) {
                return false;
            }
        }

        return extensions[0];
    }

    public lookup(path: string): string | false {
        if (!path) {
            return false;
        }

        // get the extension ("ext" or ".ext" or full path)
        const extension = extname('x.' + path)
            .toLowerCase()
            .substr(1);

        if (!extension) {
            return false;
        }

        return this.types[extension] || false;
    }

    private populateMaps(): void {

        const self = this;

        Object.keys(db).forEach((type: string) => {
            const exts = db[type];

            // mime -> extensions
            self.extensions[type] = exts;

            // extension -> mime
            for (const ext of exts) {
                self.types[ext] = type;
            }
        });
    }
}
