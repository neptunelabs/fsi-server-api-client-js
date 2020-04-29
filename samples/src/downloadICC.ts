/*
    SAMPLE
    -----------------------------------------------------
    downloading ICC profiles
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";


const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.info);
client.setProgressFunction(FSIServerClient.defaultProgress);

const queue = client.createQueue(
    {continueOnError: true});

// start session
queue.login(serverVars.userName, serverVars.passWord);

// list content of dir recursively
queue.listServer(serverVars.sampleImagesDirectory, {
    recursive: true
});

// output all entries matching criteria
queue.logBatchContent();

// download and keep path structure, but prefix file names with "download_"
queue.batchDownloadICCProfiles(serverVars.localTargetDirectory + "/icc",
    {
        downloadProgress: false,
        flattenTargetPath: false
    });

// close session
queue.logout();

// run the queued commands
queue.runWithResult();

