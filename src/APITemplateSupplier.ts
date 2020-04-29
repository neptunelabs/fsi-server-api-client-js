import {ITranslations} from "./resources/TranslatableTemplate";
import {HTMLEntityEncoder} from "./HTMLEntityEncoder";

const rgxThousandSeparator = /(\d+)(\d{3})/;

export class APITemplateSupplier {

    protected thousandSeparator: string = ",";
    protected decimalSeparator: string = ".";
    protected translationsSection: ITranslations | undefined;
    protected encoder: HTMLEntityEncoder = new HTMLEntityEncoder();

    constructor(protected translations?: ITranslations) {

        if (this.translations) {
            this.translationsSection = this.translations.errors;
        }
    }

    public setTranslations(translations: ITranslations): void {

        if (typeof translations.locale === "object") {

            if (translations.locale.thousandSeparator) {
                this.thousandSeparator = translations.locale.thousandSeparator;
            } else {
                this.thousandSeparator = ",";
            }

            if (translations.locale.decimalSeparator) {
                this.decimalSeparator = translations.locale.decimalSeparator;
            } else {
                this.decimalSeparator = ".";
            }
        }

        this.translations = translations;
    }


    public getThousandSeparator(): string {
        return this.thousandSeparator;
    }

    public getDecimalSeparator(): string {
        return this.decimalSeparator;
    }

    public htmlEntities(s: string): string {
        return this.encoder.encode(s);
    }


    public niceTimeInterval(ms: number): string {

        const milliSeconds: number = ms % 1000;
        const seconds: number = Math.floor(ms % 60000 / 1000);
        const minutes: number = Math.floor(ms % 3600000 / 60000);
        const hours: number = Math.floor(ms / 3600000);
        let hmHours: string = this.niceInt(hours);
        if (hmHours.length < 2) {
            hmHours = "0" + hmHours;
        }

        return hmHours + ":"
            + ("0" + minutes).slice(-2) + ":"
            + ("0" + seconds).slice(-2) + ":"
            + ("00" + milliSeconds).slice(-3) + " (h:m:s:ms)";
    }

    public getLocaleFloat(str: string): string {

        str = str.replace(/\./i, this.decimalSeparator);

        while (rgxThousandSeparator.test(str)) {
            str = str.replace(rgxThousandSeparator, '$1' + this.thousandSeparator + '$2');
        }

        return str;
    }

    public niceInt(n: number | string): string {

        const value: number = (typeof (n) === "string") ? parseInt(n, 10) : n;

        if (isNaN(value) || Math.abs(value) < 999) {
            return value.toString();
        }
        let ret = value.toString();

        while (rgxThousandSeparator.test(ret)) {
            ret = ret.replace(rgxThousandSeparator, '$1' + this.thousandSeparator + '$2');
        }

        return ret;
    }

}
