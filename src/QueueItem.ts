import {Queue} from "./Queue";

export class QueueItem {
  constructor(public readonly queue: Queue, public readonly index: number, public readonly cmd: string, public readonly args: any[]) {
  }
}
