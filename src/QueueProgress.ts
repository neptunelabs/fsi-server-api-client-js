import {FSIServerClientUtils} from "./FSIServerClientUtils";
import {Queue} from "./Queue";
import {QueueItem} from "./QueueItem";
import {TaskProgress} from "./TaskProgress";

export class QueueProgress extends TaskProgress {
    public currentItem: QueueItem;
    public task: TaskProgress = new TaskProgress();

    constructor(queue: Queue) {
        super();
        this.currentItem = new QueueItem(queue, -1, "", []);
    }

    public adjustTimeStart(ms: number): void {
        this.task.timeStart += ms;
        this.timeStart += ms;
    }

    public calcTotal(): void {

        this.task.timeElapsed = FSIServerClientUtils.NOW() - this.task.timeStart;
        if (this.task.timeElapsed > 0 && this.task.percent > 0) {
            const rate: number = this.task.percent / this.task.timeElapsed;
            this.task.etaMS = (100 - this.task.percent) / rate;
            this.task.eta = FSIServerClientUtils.FORMAT_TIME_PERIOD(this.task.etaMS);
        }

        this.timeElapsed = FSIServerClientUtils.NOW() - this.timeStart;

        this.percent = 100 * (this.pos - 1) / this.length
            + this.task.percent / this.length;

    }
}
