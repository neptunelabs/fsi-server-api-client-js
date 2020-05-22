import axios, {CancelToken, CancelTokenSource} from "axios";
import {APIError} from "./APIError";

export class APIAbortController {

    private axiosCancelTokenSource: CancelTokenSource = axios.CancelToken.source();

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

        // the token keeps a reference to each request!
        // therefore we need to get a new token for each sequential request,
        // ! otherwise we create a memory leak !
        this.axiosCancelTokenSource = axios.CancelToken.source();

        return this.axiosCancelTokenSource.token;
    }

    public abort(): boolean {

        if (!this.aborted) {
            this.aborted = true;

            this.axiosCancelTokenSource.cancel();
            return true;
        } else {
            return false;
        }
    }
}
