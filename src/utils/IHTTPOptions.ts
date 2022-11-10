import {IOptions} from "./IOptions";
import {IOverwriteReply} from "../FSIServerClientInterface";

export interface IHTTPOptions extends IOptions {
  ignoreErrors?: { [key: number]: boolean },
  handleIgnoredError?: (httpStatus: number) => Promise<IOverwriteReply>
}
