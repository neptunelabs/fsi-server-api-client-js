import {FSIServerClient, IListData, IListEntry, LogLevel} from "@neptunelabs/fsi-server-api-client";
// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.trace);


const queue = client.createQueue(
    {continueOnError: true});

// start session
queue.login(serverVars.userName, serverVars.passWord);

// list content of dir recursively and keep only files with importState === 3
// - limit to connectors of type "STORAGE" (files in other connectors cannot have state "error")
// - you may want to specify a path if you do not want to scan ALL images
queue.listServer("/", {
    validConnectorTypes: ["STORAGE"],
    fnFileFilter: (listData: IListData, entry: IListEntry): Promise<boolean> => {
        return new Promise((resolve) => {
            return resolve(entry.importStatus === FSIServerClient.ImportStatus.error && entry.type === "file");
        })
    },

    recursive: true,
    blackList: [] // array of paths to exclude recursively
});

// output summary of collected files
queue.logBatchContentSummary();

// output list of all entries matching criteria
// queue.logBatchContent();

// actually re-import the broken images
queue.batchReimport(true, true);

// close session
queue.logout();

// run the queued commands
queue.runWithResult();
