import {APIErrors, IAPIErrorDef} from "./resources/APIErrors";
import {TranslatableTemplate, IAPITemplateData, ITranslations} from "./resources/TranslatableTemplate";
import {APIErrorSupplier} from "./APIErrorSupplier";

export interface IAPIErrorData extends IAPITemplateData {
    def: IAPIErrorDef
}

interface IAPIErrorContent {
    main: TranslatableTemplate,
    sub?: TranslatableTemplate
}

export class APIError extends Error {

    public type: string | undefined;
    public loggedAPI: boolean;
    private readonly templates: IAPIErrorContent;

    constructor(private taskSupplier: APIErrorSupplier | null, private translations: ITranslations | undefined, private mainDef: IAPIErrorDef, private mainContent: any[] = [],
                private subDef?: IAPIErrorDef, private subContent?: any[], ct?: IAPIErrorContent) {

        // 'Error' breaks prototype chain here
        super(APIError.getMessageStatic(ct =
            {
                main: new TranslatableTemplate(taskSupplier, mainDef, mainContent, translations),
                sub: (subDef) ? new TranslatableTemplate(taskSupplier, subDef, subContent, translations) : undefined
            }
        ));

        this.loggedAPI = false;
        this.templates = ct;

        if (mainDef.key === "userAborted" || (subDef && subDef.key === "userAborted")) {
            this.type = "aborted";
        }

        // restore prototype chain
        const actualProto = new.target.prototype;


        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        }
    }

    private static getMessageStatic(err: IAPIErrorContent): string {
        let msg: string = err.main.getMessage();
        if (err.sub !== undefined) {
            msg += " " + err.sub.getMessage();
        }

        return msg;
    }

    public getMainTemplate(): TranslatableTemplate | undefined {
        return this.templates.main;
    }

    public getMainErrorDef(): IAPIErrorDef | undefined {
        return this.mainDef;
    }

    public setSubError(err: APIError): void {
        if (!err.getMainTemplate) {
            if (this.taskSupplier) {
                err = this.taskSupplier.get(APIErrors.anyError, [err.message]);
            } else {
                err = new APIError(null, this.translations, APIErrors.anyError, [err.message]);
            }
        }
        this.templates.sub = err.getMainTemplate();

        this.message = this.getMessage();
    }

    public getMessage(bHTMLEntities: boolean = false): string {

        let msg: string = this.templates.main.getMessage(bHTMLEntities);
        if (this.templates.sub !== undefined) {
            const separator = (this.taskSupplier) ? this.taskSupplier.getSeparator() : " ";
            msg += separator + this.templates.sub.getMessage(bHTMLEntities);
        }

        return msg;
    }

    public getKeys(): string {
        let ret: string = this.templates.main.getKey();
        if (this.templates.sub) {
            ret += "." + this.templates.sub.getKey();
        }

        return ret;
    }
}
