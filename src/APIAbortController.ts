import axios, {CancelToken, CancelTokenSource} from "axios";
import {APIError} from "./APIError";

export class APIAbortController {

  private axiosCancelTokenSource: CancelTokenSource = axios.CancelToken.source();
  private tokenInUse: boolean = false;
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


  public reset(): void {
    this.renewCancelToken();
    this.aborted = this.abortThrown = this.tokenInUse = false;
  }

  public release(): boolean {

    if (!this.aborted) {
      this.renewCancelToken();
      this.tokenInUse = false;
      return true;
    } else return false;
  }

  public renewCancelToken(): CancelToken {

    if (this.tokenInUse) {

      // the token keeps a reference to each request!
      // therefore we need to get a new token for each sequential request,
      // ! otherwise we create a memory leak !
      this.axiosCancelTokenSource = axios.CancelToken.source();
    } else this.tokenInUse = true;

    return this.axiosCancelTokenSource.token;
  }

  public abort(): boolean {

    if (!this.aborted) {
      this.aborted = true;

      this.axiosCancelTokenSource.cancel(this.abortError.message);

      this.renewCancelToken();
      this.tokenInUse = false;

      return true;
    } else {
      return false;
    }
  }
}
