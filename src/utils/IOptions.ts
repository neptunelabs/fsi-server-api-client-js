import {APIAbortController} from "../APIAbortController";
import {ResponseType} from "axios";
import {IPromptFunction} from "./IPromptFunction";

export interface IOptions {
    fnPrompt?: IPromptFunction | false
    abortController?: APIAbortController,
    responseType?: ResponseType
}
