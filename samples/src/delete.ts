/*
    SAMPLE
    -----------------------------------------------------
    delete all files inside a folder that have a file name containing the character "b"
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";
import {IListData, IListEntry} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.info);
client.setProgressFunction(FSIServerClient.defaultProgress);
client.setPromptFunction(FSIServerClient.defaultPrompt);

const queue = client.createQueue({continueOnError: true});

const tempDir = serverVars.getTempDir();

// start session
queue.login(serverVars.userName, serverVars.passWord);

// sample only: get files and folder list
queue.listServer(serverVars.sampleConnector, {recursive: true});

// sample only: copy the batch entries to a temporary directory
queue.batchCopy(tempDir);

// sample only: clear batch content
queue.clearList();

// read the content of tempDir and include only files containing the character "b" in the file name
queue.listServer(tempDir,
{
    recursive:true,
    fnFileFilter: (listData: IListData, entry: IListEntry): Promise<boolean> => {
        return new Promise((resolve) => {
            return resolve(entry.type === "file" && entry.src.toLowerCase().indexOf("b") !== -1);
        })
    }
});

// output the resulting files and folders
queue.logBatchContent();

// delete the selected files
queue.batchDelete();

// close session
queue.logout();

// run the queued commands
queue.runWithResult();
