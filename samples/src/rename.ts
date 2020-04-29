/*
    SAMPLE
    -----------------------------------------------------
    renaming multiple files
 */


// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, IListEntry, LogLevel} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.trace);

const queue = client.createQueue(
    {
        continueOnError: true
    }
);

const tempDir: string = serverVars.getTempDir();

queue.login(serverVars.userName, serverVars.passWord);


// SAMPLE ONLY: copy to temporary dir
queue.copyDirectoryContent(serverVars.sampleImagesDirectory,
    tempDir,
    {
        recursive: true
    }
);

// read content of temp dir
queue.listServer(tempDir,
    {
        recursive: true
    }
);

// batch rename files
queue.batchRename((entry: IListEntry) => {
    return new Promise((resolve) => {
        return resolve("renamed_" + entry.src);
    })

});

queue.clearList();

// SAMPLE ONLY: get renamed files
queue.listServer(tempDir,
    {
        recursive: true
    }
);

// SAMPLE ONLY: output renamed files
queue.logBatchContent();


// close session
queue.logout();


// run the queued commands
queue.runWithResult();
