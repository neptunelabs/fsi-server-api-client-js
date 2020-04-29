import axios, {CancelToken, CancelTokenSource} from "axios";
import {APIError} from "./APIError";

export class APIAbortController {

    private axiosCancelTokenSource: CancelTokenSource = axios.CancelToken.source();
    private axiosCancelToken: CancelToken = this.axiosCancelTokenSource.token;
    private aborted: boolean = false;
    private abortThrown: boolean = false;

    constructor(private abortError: APIError) {
    }

    public static THROW_IF_ABORTED(controller?: APIAbortController): void {
        if (controller) {
            controller.throwIfAborted();
        }
    }

    public static IS_ABORTED(controller?: APIAbortController): boolean {
        return (controller !== undefined && controller.getAborted());
    }

    public throwIfAborted(): void {
        if (this.aborted && !this.abortThrown) {
            this.abortThrown = true;
            throw(this.abortError);
        }
    }

    public getAborted(): boolean {
        return this.aborted;
    }

    public getAxiosCancelToken(): CancelToken {
        return this.axiosCancelToken;
    }

    public abort(msg?: string): boolean {

        if (!this.aborted) {
            this.aborted = true;

            if (msg === undefined) {
                msg = this.abortError.getMessage();
            }

            this.axiosCancelTokenSource.cancel(msg);
            return true;
        } else {
            return false;
        }
    }
}
