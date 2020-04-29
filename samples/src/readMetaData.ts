/*
    SAMPLE
    -----------------------------------------------------
    read and output meta data of multiple files
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.info);

const queue = client.createQueue(
    {
        continueOnError: true,
        fnProgress: FSIServerClient.defaultProgress
    }
);


// start session
queue.login(serverVars.userName, serverVars.passWord);

// read all entries of this directory
queue.listServer(serverVars.sampleImagesDirectory,
    {
        recursive: true
    }
);

// read meta data of all batch files
queue.batchGetMetaData();

// close session
queue.logout();

// run the queued commands and output the meta data
queue.runWithResult()
    .then( () => {

        const batchContent = queue.getCurrentBatchContent();
        if (batchContent.entries.length > 0) {

            const dir: string = batchContent.entries[0]._listData.summary._baseDir;

            console.log("This is the meta data of " + batchContent.entries.length + " files found in \"" + dir + "\":");

            // output the meta data of the files
            for (const entry of batchContent.entries) {
                console.log("> file \"" + entry.path + "\":");
                console.log(entry.metaData);
            }
        }
    })
