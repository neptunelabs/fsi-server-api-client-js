import {IAPITaskDef} from "./resources/APITasks";
import {ITranslations, TranslatableTemplate} from "./resources/TranslatableTemplate";
import {APITaskSupplier} from "./APITaskSupplier";

export class APITask {
  private ttMain: TranslatableTemplate;
  private ttSub?: APITask;

  constructor(private taskSupplier: APITaskSupplier | null, private translations: ITranslations | undefined,
              private mainDef: IAPITaskDef, private mainContent: any[] = [],
              private subDef?: IAPITaskDef, private subContent?: any[]) {

    this.ttMain = new TranslatableTemplate(taskSupplier, mainDef, mainContent, translations);

    if (subDef) {
      this.ttSub = new APITask(taskSupplier, translations, subDef, subContent);
    }
  }

  public setSubTask(subDef: IAPITaskDef | undefined, subContent?: any[]): void {
    this.ttSub = (subDef) ? new APITask(this.taskSupplier, this.translations, subDef, subContent) : undefined;
  }

  public setSubTaskInstance(sub: APITask | undefined): void {
    this.ttSub = (sub && sub !== this) ? sub : undefined;
  }

  public getSubTaskInstance(): APITask | undefined {
    return this.ttSub;
  }


  public getMessage(bHTMLEntities: boolean = false): string {
    let msg: string = this.ttMain.getMessage(bHTMLEntities);
    if (this.ttSub !== undefined) {
      msg += " -> " + this.ttSub.getMessage(bHTMLEntities);
    }

    return msg;
  }

  public getMainMessage(bHTMLEntities: boolean = false): string {
    return this.ttMain.getMessage(bHTMLEntities);
  }

  public getSubMessage(bHTMLEntities: boolean = false): string {
    return (this.ttSub) ? this.ttSub.getMessage(bHTMLEntities) : "";
  }

  public getMostDetailedMessage(bHTMLEntities: boolean = false): string {
    return (this.ttSub) ? this.ttSub.getMostDetailedMessage(bHTMLEntities) : this.getMessage(bHTMLEntities);
  }

  public getKeys(): string {
    let ret: string = this.mainDef.key;
    if (this.ttSub) {
      ret += "." + this.ttSub.getKeys();
    }

    return ret;
  }
}
