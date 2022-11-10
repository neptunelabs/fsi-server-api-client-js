import {IAPITaskDef} from "./resources/APITasks";
import {ITranslations} from "./resources/TranslatableTemplate";
import {APITask} from "./APITask";
import {APITemplateSupplier} from "./APITemplateSupplier";

export class APITaskSupplier extends APITemplateSupplier {


  public get(mainDef: IAPITaskDef, mainContent: any[] = [],
             subDef?: IAPITaskDef, subContent?: any[]): APITask {

    return new APITask(this, this.translationsSection, mainDef, mainContent, subDef, subContent);
  }

  public setTranslations(translations: ITranslations): void {

    super.setTranslations(translations);
    if (this.translations) {
      this.translationsSection = this.translations.tasks;
    }
  }
}
