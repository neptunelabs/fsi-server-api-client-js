import {APIErrors, IAPIErrorDef} from "./resources/APIErrors";
import {APITasks, IAPITaskDef} from "./resources/APITasks";
import {APIError} from "./APIError";
import {APITask} from "./APITask";
import {FSIServerClientInterface, IProgressOptions, IPromptReply} from "./FSIServerClientInterface";
import {FSIServerClientUtils} from "./FSIServerClientUtils";
import {TaskProgress} from "./TaskProgress";
import {FSIServerClient} from "./index";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {LogLevel} from "./LogLevel";

export interface IUserDecisions {
  [key: string]: IPromptReply;
}

export class TaskController {

  private currentTask: APITask | undefined;
  private readonly idleTask: APITask;
  private readonly client: FSIServerClient;
  private readonly com: FSIServerClientInterface;
  private userDecisions: IUserDecisions = {};

  constructor(private readonly classInit: IAPIClassInit, private name: string) {
    this.client = classInit.client;
    this.com = classInit.com;

    this.idleTask = this.com.taskSupplier.get(APITasks.idle);
  }

  public reset(): void {
    this.currentTask = undefined;
    this.resetUserDecisions();
  }

  public resetSubTask(): void {
    if (this.currentTask) {
      this.currentTask.setSubTaskInstance(undefined);
    }
  }

  public log(level: LogLevel, msg: string): void {
    this.com.log(level, "(" + this.name + ") " + msg);
  }

  public logTask(level: number, mainDef: IAPITaskDef, mainContent: any[] = [],
                 subDef?: IAPITaskDef, subContent?: any[]): void {

    if (level >= this.com.getLogLevel()) {
      const task = this.com.taskSupplier.get(mainDef, mainContent, subDef, subContent);
      this.log(level, task.getMessage());
    }
  }

  public error(err: APIError, prefix: string = "", task?: APITask): void {

    if (this.com.getLogLevel() < LogLevel.none) {

      if (!err.loggedAPI) {
        err.loggedAPI = true;

        let msg: string;

        msg = (err.getMessage) ? err.getMessage() : err.message;

        if (task) {
          msg = task.getMessage() + msg;
        }
        if (prefix) {
          msg = prefix + msg;
        }

        this.log(LogLevel.error, msg);
      }
    }
  }

  public errorNative(err: Error): void {
    this.error(this.com.err.get(APIErrors.anyError, [err.message]));
  }

  public getCurrentTask(): APITask {
    return this.currentTask || this.idleTask;
  }

  public setCurrentTask(level: LogLevel, mainDef: IAPITaskDef, mainContent: any[] = [],
                        subDef?: IAPITaskDef, subContent: any[] = []
  ): APITask {
    const task: APITask = this.com.taskSupplier.get(mainDef, mainContent, subDef, subContent);

    if (this.currentTask) {
      this.currentTask.setSubTaskInstance(task);
    } else {
      this.currentTask = task;
    }

    this.log(level, this.currentTask.getMessage());

    return task;
  }

  public setCurrentSubTask(level: LogLevel, subDef: IAPITaskDef | undefined, subContent: any[] = []): APITask {

    const task = (subDef) ? this.com.taskSupplier.get(subDef, subContent) : this.com.taskSupplier.get(APITasks.idle);

    if (this.currentTask) {
      this.currentTask.setSubTaskInstance(task);
      this.log(level, this.currentTask.getMessage());
    }

    return task;
  }

  public getErrorPromise(mainDef: IAPIErrorDef, mainContent: any[] = [],
                         subDef?: IAPIErrorDef, subContent?: any[]): Promise<boolean> {

    const msg: string = (this.currentTask) ? this.currentTask.getMessage() : "unknown";

    const self = this;
    const e: APIError = this.com.err.get(mainDef, mainContent, subDef, subContent);

    return new Promise((resolve, reject) => {
      self.onPromiseError(msg, e);

      return reject(e);
    });
  }

  public updateTaskProgress(prg: TaskProgress): void {
    prg.percent = (prg.length === 0) ? 100 : prg.pos / prg.length * 100;
    prg.timeElapsed = FSIServerClientUtils.NOW() - prg.timeStart;
  }

  public onStepProgress(level: number, options: IProgressOptions, apiTaskDef: IAPITaskDef, content: any[],
                        pos: number = 0, length: number = 0): void {

    if (options._taskProgress) {

      options._taskProgress.logLevel = level;

      const prg: TaskProgress = options._taskProgress;
      prg.currentTask = this.com.taskSupplier.get(apiTaskDef, content);
      prg.pos = pos;
      prg.length = length;

      this.updateTaskProgress(options._taskProgress);

      if (prg.bytesDone > 0 && prg.timeElapsed > 0) {
        prg.bytesPerSecond = prg.bytesDone / prg.timeElapsed * 1000;
      }

      if (options._fnQueueProgress !== undefined) {
        options._fnQueueProgress.fn.call(options._fnQueueProgress.ctx, options._taskProgress);
      } else if (options.fnProgress !== undefined) {
        options.fnProgress.fn.call(options.fnProgress.ctx, options._taskProgress);
      }
    } else if (level > -1) {
      const subTask: APITask | undefined = this.getCurrentTask().getSubTaskInstance();
      this.setCurrentSubTask(LogLevel.debug, apiTaskDef, content);
      this.getCurrentTask().setSubTaskInstance(subTask);
    }
  }

  public onPromiseError(msg: string, error: APIError): void {
    if (error.message) msg += " -> " + error.message;
    this.log(LogLevel.error, "ERROR: " + msg);
  }

  public onPromiseOk(): void {
    if (this.currentTask) {

      this.log(LogLevel.trace, "DONE: " + this.currentTask.getMessage());
    }
  }

  public resetUserDecisions(): void {
    this.userDecisions = {};
  }

  public getUserDecision(keys: string): IPromptReply {
    return this.userDecisions[keys];
  }

  public evaluateDecision(promptReply: IPromptReply): void {

    const r: string = promptReply.reply;

    if (r.match(/All$/i)) {
      promptReply.replyAll = promptReply.reply = r.replace(/All$/i, "");
    } else if (r === "always") {
      promptReply.replyAll = promptReply.reply = "yes";
    }

    if (promptReply.replyAll) {
      this.userDecisions[promptReply.errKeys] = promptReply;
    }
  }

  public wrapPromise(p: Promise<any>): Promise<any> {

    const msg: string = (this.currentTask) ? this.currentTask.getMessage() : "unknown";

    return p.then(arg => {
      this.onPromiseOk();
      return arg;
    })
      .catch(error => {
        this.onPromiseError(msg, error);
        throw error;
      });
  }
}
