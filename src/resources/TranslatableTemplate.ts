import {APITemplateSupplier} from "../APITemplateSupplier";

const regTemplate:RegExp =  /%s/;

export interface IAPITemplateDef{
    key:string,
    template:string
}

export interface IAPITemplateData{
    def:IAPITemplateDef,
    content?:any[]
}

export interface ITranslations{
    [key: string]: any
}

export class TranslatableTemplate {

    public message: string = "";
    public messageHTML: string = "";
    private generated: boolean = false;
    private generatedHTML: boolean = false;

    constructor(private supplier: APITemplateSupplier | null, private def: IAPITemplateDef, private content: any[] = [],
                private translations: ITranslations = {}) {
    }

    public getMessage(entities:boolean = false):string{

        if (entities){
            if (!this.generatedHTML) {
                this.messageHTML = this.generate(entities);
                this.generatedHTML = true;
            }
            return this.messageHTML;
        }
        else {
            if (!this.generated) {
                this.message = this.generate(entities);
                this.generated = true;
            }
            return this.message;
        }
    }

    public getKey():string{
        let ret:string = this.def.key;

        if (ret === "httpError" || ret === "httpErrorShort"){
            ret += ":" + this.content[0];
        }

        return ret;
    }

    private generate(entities:boolean): string {


        let msg: string;

        msg = (this.translations && this.translations[this.def.key]) ? this.translations[this.def.key] : this.def.template;
        let n: number = 0;
        let content: any[];

        if (this.translations.templateContent) {

            content = [];
            for (const contentValue of this.content) {
                if (this.translations.templateContent[contentValue]) {
                    content.push(this.translations.templateContent[contentValue]);
                } else {
                    content.push(contentValue);
                }
            }
        } else {
            content = this.content;
        }

        while (n < content.length && msg.match(regTemplate)) {
            let contentItem = content[n++];
            if (this.supplier) {
                if (typeof (contentItem) === "number") {
                    contentItem = this.supplier.niceInt(contentItem);
                } else if (typeof (contentItem) === "string") {
                    contentItem = (entities)?this.supplier.htmlEntities(contentItem):contentItem;
                }
            }

            msg = msg.replace(regTemplate, contentItem);
        }


        return msg;
    }
}
