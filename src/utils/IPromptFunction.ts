import {IPromptOptions} from "./IPromptOptions";

export interface IPromptFunction {
    ctx: any,
    fn: (question: string, options: IPromptOptions) => Promise<string>
}
