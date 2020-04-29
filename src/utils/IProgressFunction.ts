import {QueueProgress} from "../QueueProgress";
import {TaskProgress} from "../TaskProgress";

export interface IProgressFunction {
    ctx: any,
    fn: (prg: QueueProgress | TaskProgress) => void
}
