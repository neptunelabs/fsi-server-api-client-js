import {APITasks} from "./resources/APITasks";
import {APITask} from "./APITask";
import {ClientSummaryInfo} from "./ClientSummaryInfo";
import {FSIServerClientUtils} from "./FSIServerClientUtils";

export class TaskProgress {
  public bDone: boolean = false;
  public pos: number = 0;
  public length: number = 0;
  public percent: number = 0;
  public timeStart: number = FSIServerClientUtils.NOW();
  public timeElapsed: number = 0;
  public etaMS: number = 0;
  public eta: string = "";
  public logLevel: number = -1;
  public temporary: boolean = false;
  public currentTask: APITask = new APITask(null, {}, APITasks.idle);
  public bytesTotal: number = 0;
  public bytesDone: number = 0;
  public bytesPerSecond: number = 0;
  public bytesDoneBefore: number = 0;
  public clientSummary: ClientSummaryInfo | undefined;
}
