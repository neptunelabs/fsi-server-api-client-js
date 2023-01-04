import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";

import {APIErrors} from "./resources/APIErrors";
import {APIHTTPErrorCodes} from "./resources/APIHTTPErrorCodes";
import {APITasks} from "./resources/APITasks";
import {ConsolePromptCommands} from "./resources/ConsolePromptCommands"
import {ITranslations} from "./resources/TranslatableTemplate";
import {TranslationLocales} from "./resources/TranslationLocales"
import {APIAbortController} from "./APIAbortController";
import {APIError, IAPIErrorData} from "./APIError";
import {APIErrorSupplier} from "./APIErrorSupplier";
import {APITask} from "./APITask";
import {APITaskSupplier} from "./APITaskSupplier";
import {ClientSummaryInfo} from "./ClientSummaryInfo";
import {FSIServerClientUtils, IStringAnyMap} from "./FSIServerClientUtils";
import {MimeTypes} from "./MimeTypes";
import {TaskController} from "./TaskController";
import {TaskProgress} from "./TaskProgress";
import {FSIServerClient} from "./index";
import {IHTTPOptions} from "./utils/IHTTPOptions";
import {IProgressFunction} from "./utils/IProgressFunction";
import {IFNListError} from "./ListServer";
import {LogLevel} from "./LogLevel";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {IPromptOptions} from "./utils/IPromptOptions";
import {IOptions} from "./utils/IOptions";
import {IUploadOptions} from "./Upload";
import * as http from "http";
import * as https from "https";


const modeNode: boolean = FSIServerClientUtils.GET_MODE_NODE();

export interface IMapStringMethodArguments {
  ctx: any,
  fn: (...args: any[]) => any
}

export interface IOverwriteReply {
  reply: string,
  continue: boolean
}

interface ILanguageCheck {
  theClass: any;
  sectionName: string
}

export interface IPromptReply {
  apiTask: APITask,
  errKeys: string,
  reply: string,
  replyAll: string | undefined,
  time: number
}

export interface IProgressOptions extends IHTTPOptions {
  fnProgress?: IProgressFunction,
  _fnQueueProgress?: IProgressFunction,
  _fnQueueError?: IFNListError,
  _taskProgress?: TaskProgress;
  clientSummary?: ClientSummaryInfo
}

export class FSIServerClientInterface {

  private static logLevelLabels: { [key: number]: string } = {
    0: "trace",
    1: "debug",
    2: "info",
    3: "warn",
    4: "error",
    5: "fatal"
  };
  public sessionCookie: string | null = null;
  public bLoggedIn: boolean = false;
  public err: APIErrorSupplier;
  public taskSupplier: APITaskSupplier;
  public iAxios: AxiosInstance;
  private currentTask: APITask;
  private previousTask: APITask;
  private translations: ITranslations = {};
  private mimeTypes: MimeTypes | false = false;
  private defaultHeaders: IStringAnyMap = {};
  private readonly classInit: IAPIClassInit;

  constructor(private readonly client: FSIServerClient,
              private logLevel: LogLevel) {

    this.classInit = {
      client,
      com: this,
    };

    this.err = new APIErrorSupplier();
    this.taskSupplier = new APITaskSupplier();

    this.currentTask = this.taskSupplier.get(APITasks.idle);
    this.previousTask = this.taskSupplier.get(APITasks.idle);

    if (modeNode) {

      const httpAgentOptions = {
        keepAlive: true
      };

      const httpAgent = new http.Agent(httpAgentOptions);
      const httpsAgent = new https.Agent(httpAgentOptions);

      this.iAxios = axios.create({
        httpAgent: httpAgent,
        httpsAgent: httpsAgent,
        baseURL: client.getHost() + "/"
      });
    } else {
      this.iAxios = axios.create({
        baseURL: client.getHost() + "/"
      });
    }

    this.defaultHeaders.Accept = "application/json";
    if (modeNode) {
      this.defaultHeaders['User-Agent'] = FSIServerClientUtils.USERAGENT;
    }

    for (const key of Object.keys(this.defaultHeaders)) {
      this.iAxios.defaults.headers.common[key] = this.defaultHeaders[key];
    }


    this.iAxios.defaults.validateStatus = (): boolean => {
      return true; // accept all HTTP status codes as valid reply, we catch them on our own
    };
  }

  public static GET_TRUE_PROMISE(): Promise<boolean> {
    return new Promise((resolve) => {
      return resolve(true);
    });
  }

  public static VALIDATE_TRANSLATION(translation: { [key: string]: any }): boolean {

    let valid: boolean = true;
    let ret: boolean;

    const checks: ILanguageCheck[] = [
      {theClass: APIErrors, sectionName: "errors"},
      {theClass: APITasks, sectionName: "tasks"},
      {theClass: ConsolePromptCommands, sectionName: "commands"},
      {theClass: TranslationLocales, sectionName: "locale"}
    ];

    for (const check of checks) {
      ret = FSIServerClientInterface.validateTranslationSection(
        translation, check.theClass, check.sectionName);

      if (!ret && valid) {
        valid = ret;
      }
    }

    return valid;
  }

  private static getLogPrefix(level: LogLevel): string {

    const strLevel: string = "[" + FSIServerClientInterface.logLevelLabels[level] + "] ";

    const d: Date = new Date();
    return "[" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " "
      + d.toTimeString().substring(0, 8) + "."
      + ("00" + d.getUTCMilliseconds()).slice(-3) + "] " + strLevel;
  }

  private static validateTranslationSection(translation: { [key: string]: any }, theClass: any,
                                            sectionName: string): boolean {

    let valid: boolean = true;

    const section: { [key: string]: any } = translation[sectionName];
    const keys: { [key: string]: boolean } = {};

    if (!section) {
      valid = false;
      console.log("section \"" + sectionName + "\" missing");
    } else {

      Object.keys(theClass).forEach((key: string) => {
        keys[key] = true;
        if (!section[key]) {
          console.log("\"" + key + "\" missing in translation." + sectionName);
          valid = false;
        } else if (theClass[key].key && theClass[key].key !== key) {
          console.log("\"" + key + "\" != \"" + theClass[key].key + "\" - error in class for " + sectionName);
          valid = false;
        }
      });

      Object.keys(section).forEach((key: string) => {

        if (!keys[key] && key !== "templateContent") {
          console.log("\"" + key + "\" in translation." + sectionName + " not needed");
          valid = false;
        }
      });
    }

    return valid;
  }

  public setSessionCookie(sessionCookie: string): void {
    this.sessionCookie = sessionCookie;
    if (modeNode) {
      this.defaultHeaders.Cookie = this.iAxios.defaults.headers.common.Cookie = sessionCookie;
    }
  }

  public isAbortError(err: APIError): boolean {
    if (axios.isCancel(err)) {
      err.type = "aborted";
    }

    return (err.type === "aborted");
  }

  public getAbortPromise(): Promise<any> {
    return new Promise((resolve, reject) => {
      return reject(this.err.get(APIErrors.userAborted));
    });
  }

  public getNewAbortController(): APIAbortController {
    return new APIAbortController(this.err.get(APIErrors.userAborted));
  }

  public lookupMimeType(fileName: string): string | false {
    if (!this.mimeTypes) {
      this.mimeTypes = new MimeTypes();
    }
    return this.mimeTypes.lookup(fileName);
  }

  public lookupMimeExtension(mimeType: string): string | false {
    if (!this.mimeTypes) {
      this.mimeTypes = new MimeTypes();
    }
    return this.mimeTypes.extension(mimeType);
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getAxiosRequestConfig(options: IHTTPOptions | null = null, headers?: IStringAnyMap): AxiosRequestConfig {

    // axios does not send default headers if headers is an object
    // we therefore need to mix in the default headers
    if (headers) {
      for (const key of Object.keys(this.defaultHeaders)) {
        if (headers[key] === undefined) {
          headers[key] = this.defaultHeaders[key];
        } else if (headers[key] === null) {
          delete headers[key];
        }
      }
    }

    const ret: AxiosRequestConfig =
      {
        headers,
        timeout: 0,
        withCredentials: true,
      };

    if (options !== null && options.abortController) {
      //ret.cancelToken = options.abortController.renewCancelToken();
      ret.signal = options.abortController.renew();
    }

    return ret;
  }

  public onLoginChange(loggedIn: boolean): void {
    this.bLoggedIn = loggedIn;
  }

  public doLogLine(line: string): void {
    if (modeNode) {
      process.stdout.write(line + "\n");
    } else {
      console.log(line);
    }
  }

  public log(level: number, message: string): void {
    if (level >= this.logLevel) {
      this.doLogLine(FSIServerClientInterface.getLogPrefix(level) + message);
    }
  }

  public setTranslations(translations: ITranslations): void {
    this.translations = translations;
    this.err.setTranslations(translations);
    this.taskSupplier.setTranslations(translations);
  }

  public getTranslations(): ITranslations {
    return this.translations;
  }

  public translateCommands(pOpts: IPromptOptions): void {
    pOpts.buttonLabels = new Array(pOpts.buttons.length);

    const trans: { [key: string]: string } = this.translations.commands || {};

    for (let i: number = 0; i < pOpts.buttons.length; i++) {
      const cmd: string = pOpts.buttons[i];

      let translated: string = trans[cmd];
      if (!translated) {
        translated = cmd;
      }

      pOpts.validAnswers[translated.toLowerCase()] = cmd;
      pOpts.validReplies[cmd] = translated;
      pOpts.buttonLabels[i] = translated;

    }
  }

  public async prompt(
    options: IOptions,
    apiTask: APITask,
    errKeys: string,
    buttons: string[],
    taskController: TaskController | undefined
  ): Promise<IPromptReply> {

    const promptReply: IPromptReply = {
      apiTask,
      errKeys,
      reply: "",
      replyAll: undefined,
      time: FSIServerClientUtils.NOW()
    };

    let reply: string = "";

    if (options.fnPrompt) {
      const promptOpts: IPromptOptions = {
        buttonLabels: [],
        buttons,
        validAnswers: {},
        validReplies: {}
      };


      this.translateCommands(promptOpts);

      while (promptOpts.validReplies[reply] === undefined) {
        reply = await options.fnPrompt.fn.call(options.fnPrompt.ctx, apiTask.getMessage(), promptOpts);
      }

      promptReply.reply = reply;

    } else {
      promptReply.reply = buttons[0];
    }

    if (taskController) {
      taskController.evaluateDecision(promptReply);
    }

    promptReply.time = FSIServerClientUtils.NOW() - promptReply.time;


    return promptReply;
  }

  public async getOverwriteReply(options: IUploadOptions, targetPath: string,
                                 taskController: TaskController | undefined): Promise<IPromptReply> {

    const tsk: APITask = this.taskSupplier.get(APITasks.overwriteTargetFile, [targetPath]);
    const keys: string = tsk.getKeys();

    if (taskController && taskController.getUserDecision(keys)) {
      return taskController.getUserDecision(keys);
    }

    return await this.prompt(
      options,
      tsk,
      keys,
      [
        "cancel",
        "overwrite",
        "overwriteAll",
        "skip",
        "skipAll"
      ],
      taskController
    );
  }

  public getResponse(url: string, mainErrorData: IAPIErrorData | undefined, config?: AxiosRequestConfig | null,
                     httpOptions?: IHTTPOptions): Promise<AxiosResponse> {

    if (!config) {
      config = this.getAxiosRequestConfig(httpOptions);
    }

    return this.runAxiosResponsePromise(this.iAxios.get(url, config), mainErrorData, httpOptions);
  }

  public getJSON(url: string, mainErrorData?: IAPIErrorData, config?: AxiosRequestConfig | null,
                 httpOptions?: IHTTPOptions): Promise<IStringAnyMap> {

    if (!config) {
      config = this.getAxiosRequestConfig(httpOptions);
    }

    return this.runAxiosJSONPromise(this.iAxios.get(url, config), mainErrorData, httpOptions);
  }

  public postJSON(url: string, data: any, mainErrorData?: IAPIErrorData, config?: AxiosRequestConfig | null,
                  httpOptions?: IHTTPOptions): Promise<IStringAnyMap> {

    if (!config) {
      config = this.getAxiosRequestConfig(httpOptions);
    }

    return this.runAxiosJSONPromise(this.iAxios.post(url, data, config), mainErrorData, httpOptions);
  }

  public postResponse(url: string, data: any, mainErrorData?: IAPIErrorData, config?: AxiosRequestConfig | null,
                      httpOptions?: IHTTPOptions): Promise<IStringAnyMap> {

    if (!config) {
      config = this.getAxiosRequestConfig(httpOptions);
    }

    return this.runAxiosResponsePromise(this.iAxios.post(url, data, config), mainErrorData, httpOptions);
  }

  public postJSONBoolean(url: string, data: any, mainErrorData?: IAPIErrorData, config?: AxiosRequestConfig | null,
                         httpOptions?: IHTTPOptions): Promise<boolean> {

    if (!config) {
      config = this.getAxiosRequestConfig(httpOptions);
    }

    return this.runAxiosBooleanPromise(this.iAxios.post(url, data, config), mainErrorData, httpOptions);
  }

  public putJsonBoolean(url: string, data: any,
                        mainErrorData: IAPIErrorData,
                        config?: AxiosRequestConfig | null, httpOptions?: IHTTPOptions): Promise<boolean> {

    if (!config) {
      config = this.getAxiosRequestConfig(httpOptions);
    }

    return this.runAxiosBooleanPromise(this.iAxios.put(url, data, config), mainErrorData, httpOptions);
  }

  public deleteJsonBoolean(url: string,
                           mainErrorData: IAPIErrorData,
                           config?: AxiosRequestConfig | null, httpOptions?: IHTTPOptions): Promise<boolean> {

    if (!config) {
      config = this.getAxiosRequestConfig(httpOptions);
    }

    return this.runAxiosBooleanPromise(this.iAxios.delete(url, config), mainErrorData, httpOptions);
  }

  public runAxiosBooleanPromise(
    p: Promise<AxiosResponse>,
    mainErrorData?: IAPIErrorData,
    httpOptions: IHTTPOptions = {}
  ): Promise<boolean> {

    return this.runAxiosResponsePromise(
      p,
      mainErrorData,
      httpOptions
    )
      .then((response) => {
        return (response.status < 400);
      })
  }

  public runAxiosResponsePromise(
    p: Promise<AxiosResponse>,
    mainError?: IAPIErrorData,
    httpOptions?: IHTTPOptions
  ): Promise<AxiosResponse> {

    return p
      .then(async (response) => {
        // release the abort controller before doing anything else
        // impossible to do that in finally, because handleIgnoredError()
        // might initiate another request
        if (httpOptions && httpOptions.abortController) httpOptions.abortController.release();

        // use the status code value provided in the response body, if present
        if (response.data && response.data.statuscode) {
          response.status = response.data.statuscode;
        }

        if (response.status > 399) {

          if (httpOptions && httpOptions.ignoreErrors && httpOptions.ignoreErrors[response.status]) {

            if (httpOptions.handleIgnoredError) {
              await httpOptions.handleIgnoredError(response.status);
            }

            response.status = 200;
          } else {

            if (mainError && mainError.def) {
              throw this.err.get(mainError.def, mainError.content, APIErrors.httpError,
                [APIHTTPErrorCodes.GET_CODE(response.status), response.config.url]);
            } else {
              throw this.err.get(APIErrors.httpError,
                [APIHTTPErrorCodes.GET_CODE(response.status), response.config.url]);
            }
          }
        }

        return response;
      })
      .catch(error => {
        // release the abort controller before doing anything else
        if (httpOptions && httpOptions.abortController) httpOptions.abortController.release();

        throw error;
      })
  }

  private runAxiosJSONPromise(
    p: Promise<AxiosResponse>,
    mainError?: IAPIErrorData,
    options?: IOptions
  ): Promise<any> {

    return this.runAxiosResponsePromise(p, mainError, options)
      .then(response => {
        return response.data;
      })
  }
}
