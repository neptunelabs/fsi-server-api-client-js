/*
    SAMPLE
    -----------------------------------------------------
    uploading files
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, IListData, IListEntry, LogLevel} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.debug);
client.setPromptFunction(FSIServerClient.defaultPrompt);


const queue = client.createQueue({continueOnError: true});

// start session
queue.login(serverVars.userName, serverVars.passWord);

// list local files and directories recursively
// - filter for files with a valid image file extension
// - exclude files containing the letter "i"
// to upload everything, just delete the entire "fnFileFilter" property
queue.listLocal(serverVars.localImageDirectory, {

    fnFileFilter: (listData: IListData, entry: IListEntry) => {
        return new Promise<boolean>((resolve) => {
            FSIServerClient.FN_FILE_FILTER_VALID_IMAGES(listData, entry)
                .then((res: boolean) => {
                    return resolve(res && entry.src.indexOf("i") === -1);
                })


        });
    },
    recursive: true
});

// upload the files
queue.batchUpload(serverVars.getTempDir(), {
    flattenTargetPath: false,
    overwriteExisting:true
});


// close session
queue.logout();

// run the queued commands
queue.runWithResult();
