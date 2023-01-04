import {APIError} from "./APIError";

export class APIAbortController {

  private controller: AbortController = new AbortController();
  private inUse: boolean = false;
  private aborted: boolean = false;
  private abortThrown: boolean = false;

  constructor(private abortError: APIError) {
  }

  public static THROW_IF_ABORTED(controller?: APIAbortController): void {
    if (controller) controller.throwIfAborted();
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
    this.renew();
    this.aborted = this.abortThrown = this.inUse = false;
  }

  public release(): boolean {

    if (!this.aborted) {
      this.renew();
      this.inUse = false;
      return true;
    } else return false;
  }

  public renew(): AbortSignal {

    if (this.inUse) {
      this.controller = new AbortController();
    } else this.inUse = true;

    return this.controller.signal;
  }

  public abort(): boolean {

    if (!this.aborted) {
      this.aborted = true;

      this.controller.abort(this.abortError.message);

      this.renew();
      this.inUse = false;

      return true;
    } else {
      return false;
    }
  }
}
