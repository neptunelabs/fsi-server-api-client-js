/*
        SAMPLE
    -----------------------------------------------------
    downloading files
 */


// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
import {FSIServerClient, IListEntry, LogLevel} from "@neptunelabs/fsi-server-api-client";

const serverVars = new ServerVars();



const myArgs = process.argv.slice(2);
const targetPath = (myArgs && myArgs[0]);

if (!targetPath) {
    console.error("Please pass the directory to download the files to as the first argument.");
    console.error("EXAMPLE: node downloadOriginals myDownloads");
}
else {

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
    queue.batchDownload(targetPath + "/originals",
        {
            downloadProgress: false,
            flattenTargetPath: false,
            fnRename: (entry: IListEntry) => {
                return "download_" + entry.src;
            },
            replaceFileExtension: true
        });

    // close session
    queue.logout();

    // run the queued commands
    queue.runWithResult();
}