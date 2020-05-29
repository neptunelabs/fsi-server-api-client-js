/*
    SAMPLE
    -----------------------------------------------------
    read local file list
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";
const serverVars = new ServerVars();


const myArgs = process.argv.slice(2);
const sourcePath = (myArgs && myArgs[0]);


if (!sourcePath) {
    console.error("Please pass the local directory to list as the first argument.");
    console.error("EXAMPLE: node listLocal ./images/foo");
}
else {

    const client = new FSIServerClient(serverVars.host);
    client.setLogLevel(LogLevel.info);
    client.setProgressFunction(FSIServerClient.defaultProgress);
    client.setPromptFunction(FSIServerClient.defaultPrompt);


    const queue = client.createQueue(
        {continueOnError: true});

    // list content of dir recursively and keep only files with valid image extensions
    queue.listLocal(sourcePath, {
        fnFileFilter: FSIServerClient.FN_FILE_FILTER_VALID_IMAGES,
        recursive: true
    });

    // output of all entries matching criteria
    //queue.logBatchContent();

    // output summary of all entries matching criteria
    queue.logBatchContentSummary();

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


}
