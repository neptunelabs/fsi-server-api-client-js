import {IAPIErrorDef} from "./resources/APIErrors";
import {ITranslations} from "./resources/TranslatableTemplate";
import {APIError} from "./APIError";
import {APITemplateSupplier} from "./APITemplateSupplier"

export class APIErrorSupplier extends APITemplateSupplier {

    private separator: string = " ";

    public get(mainDef: IAPIErrorDef, mainContent: any[] = [],
               subDef?: IAPIErrorDef, subContent?: any[]): APIError {

        return new APIError(this, this.translationsSection, mainDef, mainContent, subDef, subContent);
    }

    public getSeparator(): string {
        return this.separator;
    }

    public setTranslations(translations: ITranslations): void {

        super.setTranslations(translations);
        if (this.translations) {
            this.translationsSection = this.translations.errors;
            if (this.translationsSection) {
                this.separator = (this.translationsSection.separator);
            }
            if (!this.separator) {
                this.separator = "";
            }
        } else {
            this.translationsSection = undefined;
            this.separator = " ";
        }
    }
}
