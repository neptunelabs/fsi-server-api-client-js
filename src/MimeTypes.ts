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

        let extension = "";
        const matches = path.match(/.([a-z0-9]*)$/i);
        if (matches && matches.length === 2){
          extension = matches[1].toLocaleLowerCase();
        }

        if (!extension) {
            return false;
        }

        return this.types[extension] || false;
    }

    private populateMaps(): void {

        const self = this;

        Object.keys(db).forEach((type: string) => {
            const extensions = db[type];

            // mime -> extensions
            self.extensions[type] = extensions;

            // extension -> mime
            for (const ext of extensions) {
                self.types[ext] = type;
            }
        });
    }
}
