/*
    SAMPLE
    -----------------------------------------------------
    list all files in connector "sample-images"
    with a width > 3000 px
 */



// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, IListData, IListEntry, LogLevel} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.trace);

const queue = client.createQueue(
    {continueOnError: true});

// start session
queue.login(serverVars.userName, serverVars.passWord);


// list content of dir recursively and keep only files with width > 3000px
queue.listServer(serverVars.sampleConnector, {
    fnFileFilter: (listData: IListData, entry: IListEntry): Promise<boolean> => {
        return new Promise((resolve) => {
            return resolve(entry.width > 3000);
        })
    },
    recursive: true
});

// output summary of all entries matching criteria
queue.logBatchContentSummary();

// output list of all entries matching criteria
queue.logBatchContent();

// close session
queue.logout();

// run the queued commands
queue.runWithResult();


/*
    you can access the resulting list entries by replacing

    queue.runWithResult();

    with

    queue.runWithResult()
    .then( () => {
       const entries = queue.getCurrentBatchContent().entries;
       // do something with the array of entries (files/directories)
       console.log(entries);
    });

 */
