import crypto from "crypto";
import urlSearchParams from '@ungap/url-search-params';
import {APIErrors} from "./resources/APIErrors";
import {APITasks} from "./resources/APITasks";
import {ITranslations} from "./resources/TranslatableTemplate";
import {APIAbortController} from "./APIAbortController";
import {APIError} from "./APIError";
import {APITask} from "./APITask";
import {FSIServerClientInterface, IPromptReply} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IStringAnyMap} from "./FSIServerClientUtils";
import {SHA256} from "./SHA256";
import {TaskController} from "./TaskController";
import {FSIServerClient} from "./index";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {IOptions} from "./utils/IOptions";
import {IHTTPOptions} from "./utils/IHTTPOptions";

const modeNode = FSIServerClientUtils.GET_MODE_NODE();
const URLSearchParams = urlSearchParams;

export interface ILoginReply {
    username: string,
    state: string,
    messageCode: number,
    message: string,
    expiry: number,
    accesslevel: string,
    serverversion: string,
    defaultPassword: boolean
}

export class Login {
    private readonly serviceURL: string;
    private readonly servicePath: string;
    private readonly sha256 = new SHA256();
    private readonly translations: ITranslations | undefined;
    private readonly client: FSIServerClient;
    private readonly com: FSIServerClientInterface;

    constructor(private readonly classInit: IAPIClassInit, private taskController: TaskController) {
        this.client = classInit.client;
        this.com = classInit.com;

        this.translations = this.client.getTranslations();
        this.serviceURL = this.client.getService('login');
        this.servicePath = this.client.getServicePath('login');
    }

    public authenticate(username: string, password: string, options: IOptions = {}): Promise<ILoginReply> {

        APIAbortController.THROW_IF_ABORTED(options.abortController);

        const self = this;
        let bHTTPS: boolean = false;

        // 1) get random salt from server


        return this.com.getResponse(
            this.servicePath,
            {def: APIErrors.login, content: [username]},
            undefined,
            options
        )
            .then(async response => {

                const responseURL: string = (typeof (response.config.url) === "string") ? response.config.url : "";

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                bHTTPS = responseURL.toUpperCase().indexOf("HTTPS://") === 0;

                // we need to set the session cookie for node only
                // browsers do that automatically
                if (modeNode) {
                    self.extractSessionCookie(response.headers);
                }


                APIAbortController.THROW_IF_ABORTED(options.abortController);

                const map: IStringAnyMap = response.data;

                // 2) send salted password and authenticate
                if (typeof (map) !== "object") {
                    throw this.com.err.get(APIErrors.login, [username], APIErrors.invalidServerReply);
                }


                if (typeof (map.salt) !== "string" || map.state !== "success") {
                    if (map.message && typeof (map.message) === "string") {
                        throw this.com.err.get(APIErrors.login, [username], APIErrors.serverError, [map.message]);
                    } else {
                        throw this.com.err.get(APIErrors.login, [username], APIErrors.invalidServerReply);
                    }
                }

                let hashedPassword: string | null;
                if (map.loginmethod !== "plain") {
                    hashedPassword = await this.hash(map.salt + await this.hash(password));
                } else {
                    if (!bHTTPS) {

                        if (this.client.getPromptFunction()) {
                            const promptOptions: IOptions = {
                                fnPrompt: this.client.getPromptFunction()
                            };

                            const task: APITask = this.com.taskSupplier.get(APITasks.sendPlainPassword, []);

                            const res: IPromptReply = await this.com.prompt(
                                promptOptions,
                                task,
                                "login.plainPassword",
                                [
                                    "no",
                                    "yes",
                                ],
                                this.taskController
                            );

                            if (res.reply !== "yes") {
                                throw this.com.err.get(APIErrors.userAborted);
                            }


                        } else {
                            throw this.com.err.get(APIErrors.login, [username], APIErrors.serverRefusedPlainPassword);
                        }


                    }
                    hashedPassword = password;
                }

                const query = new URLSearchParams();
                query.set("username", username);
                if (hashedPassword !== null) {
                    query.set("password", hashedPassword);
                }

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                return this.com.postJSON(
                    this.servicePath,
                    query,
                    {
                        content: [username],
                        def: APIErrors.login
                    },
                    null,
                    options
                )
                    .then(bodySend => {
                        APIAbortController.THROW_IF_ABORTED(options.abortController);

                        if (bodySend.state === 'success') {
                            this.com.onLoginChange(true);


                            const test1 = self.sha256.sha256Digest(username);
                            const test2 = self.sha256.sha256Digest(password);
                            const pattern = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

                            if (test1 === pattern && test2 === pattern) {
                                bodySend.defaultPassword = true;
                            }

                            this.client.setCurrentUser(username);

                            return bodySend as ILoginReply;
                        } else {
                            throw this.com.err.get(APIErrors.login, [username], APIErrors.serverError, [bodySend.message]);
                        }
                    })

            });


    }

    public logout(options: IOptions = {}): Promise<boolean> {

        APIAbortController.THROW_IF_ABORTED(options.abortController);

        return this.com.getJSON(
            this.client.getServicePath('logout'),
            {def: APIErrors.logout},
            undefined,
            options
        )
            .then(body => {
                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (typeof (body) === "object" && body.value === true) {

                    this.com.onLoginChange(false);
                    this.client.setCurrentUser("");
                    return true;
                } else {
                    throw this.com.err.get(APIErrors.logout, undefined, APIErrors.invalidServerReply);
                }
            })

    }

    public getSha256Hash(str: string): Promise<string> {
        return this.hash(str);
    }


    public changePassword(currentPassword: string, newPassWord: string, options: IHTTPOptions = {}): Promise<boolean> {

        const self = this;
        const url: string = this.client.getServicePath("password");
        let oldShaPass: string;
        let newShaPass: string;

        return new Promise((resolve, reject) => {

            this.com.getJSON(
                url,
                {def: APIErrors.changePassWord},
                undefined,
                options
            )
                .then(async res => {

                    if (res && res.salt) {
                        oldShaPass = await this.getSha256Hash(res.salt
                            + await this.getSha256Hash(currentPassword));
                        newShaPass = await this.getSha256Hash(newPassWord);
                    } else {
                        throw(self.com.err.get(APIErrors.changePassWord, undefined, APIErrors.invalidServerReply));
                    }

                    this.com.putJsonBoolean(
                        url,
                        {
                            "newPasswordHash": newShaPass,
                            "oldPasswordHash": oldShaPass
                        },
                        {def: APIErrors.changePassWord, content: []},
                        null,
                        options
                    )
                    .then(resolve)
                    .catch(reject);

                })
                .catch(err => {
                    reject(err);
                });

        });
    }

    public changeUser(user: string, options: IHTTPOptions = {}): Promise<boolean> {
        const self = this;

        return new Promise((resolve, reject) => {
            this.com.putJsonBoolean(
                this.client.getServicePath("user/change"),
                user,
                {def: APIErrors.changeUser, content: [user]},
                null,
                options
            )
                .then(res => {
                    if (res) {
                        self.client.setCurrentUser(user);
                        resolve(res);
                    }
                })
                .catch(err => {
                    if (err instanceof APIError) {
                        reject(err);
                    } else {
                        reject(err);
                    }

                })
        });
    }

    public getUserList(options: IHTTPOptions = {}): Promise<string[]> {

        return this.com.getJSON(
            this.client.getServicePath("user/list"),
            {def: APIErrors.getUserList},
            undefined,
            options
        ) as Promise<string[]>
    }

    private async hash(str: string): Promise<string> {
        let ret: string | null;

        if (modeNode) {
            try {
                ret = crypto.createHash('sha256').update(str, 'utf8').digest('hex');
            } catch (err) {
                ret = null;
            }
        } else {
            // crypto.subtle is only available in modern browsers and only on secure sites (HTTPS)
            try {
                const msgUint8 = new window.TextEncoder().encode(str);
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                ret = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            } catch (err) {
                ret = null;
            }
        }

        if (ret === null) {
            // use our own implementation of SHA-256
            ret = this.sha256.hash(str);
            if (!ret) {
                ret = "";
            }
        }

        return ret;
    }

    private extractSessionCookie(responseHeaders: IStringAnyMap): boolean {
        const cookies: string[] = responseHeaders['set-cookie'] || [];

        const sessionCookie = cookies.map((entry) => {
            return entry.replace(/;.*/, "");
        }).join(';');

        if (sessionCookie) {
            this.client.setSessionCookie(sessionCookie);
        }

        return true;
    }
}
