export class APIHTTPErrorCodes {

  public static readonly ERROR_CODES: { [key: number]: string } = {
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested range not satisfiable",
    417: "Expectation Failed",
    420: "Policy Not Fulfilled",
    421: "Misdirected Request",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version not supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    509: "Bandwidth Limit Exceeded",
    510: "Not Extended",
    511: "Network Authentication Required"
  };


  public static GET_CODE(n: number): string {
    let ret: string = APIHTTPErrorCodes.ERROR_CODES[n] || "";

    if (ret) {
      ret = "HTTP " + n + " (" + ret + ")";
    } else {
      ret = "HTTP " + n;
    }

    return ret;
  }

}
