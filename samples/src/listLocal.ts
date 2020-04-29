/*
    SAMPLE
    -----------------------------------------------------
    read local file list
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";

if (!serverVars.localImageDirectory) serverVars.throwRequiredVar("a local directory containing images");

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.info);
client.setProgressFunction(FSIServerClient.defaultProgress);
client.setPromptFunction(FSIServerClient.defaultPrompt);


const queue = client.createQueue(
    {continueOnError: true});

// list content of dir recursively and keep only files with width < 4000
queue.listLocal(serverVars.localImageDirectory, {
    fnFileFilter: FSIServerClient.FN_FILE_FILTER_VALID_IMAGES,
    recursive: true
});

// output summary of all entries matching criteria
queue.logBatchContentSummary();

// output of all entries matching criteria
queue.logBatchContent();

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



