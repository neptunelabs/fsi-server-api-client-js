/*
    SAMPLE
    -----------------------------------------------------
    running a custom task on batch files
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, Queue, IBatchContent, LogLevel} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.info);

const queue = client.createQueue(
    {
        continueOnError: false,
        fnProgress: FSIServerClient.defaultProgress
    }
);


const myCustomFunction = (
    theClient: FSIServerClient,
    theQueue: Queue,
    fnProgress: (taskDescription: string, pos: number, length: number) => void,
    foo: number, bar: string): Promise<boolean> => {

    return new Promise((resolve) => {

        console.log("Running custom function:");
        console.log("foo is: " + foo + " bar is: " + bar);

        const content: IBatchContent | null = theQueue.getCurrentBatchContent();
        if (content) {
            console.log("batch contains " + content.entries.length + " items.");

            for (let i: number = 0; i < content.entries.length; i++) {
                const msg: string = "Doing something with entry \"" + content.entries[i].src + "\"";
                fnProgress.call(theQueue, msg, i, content.entries.length);
            }
        } else {
            console.log("batch is empty.");
        }

        resolve(true);
    });
}


// start session
queue.login(serverVars.userName, serverVars.passWord);

// list content of dir
queue.listServer(serverVars.sampleImagesDirectory, {
    recursive: false
});

// run the custom task "myCustomFunction" in "global" scope
queue.runCustom(global, myCustomFunction, 123, "foo arg");

// close session
queue.logout();

// run the queued commands
queue.runWithResult();
