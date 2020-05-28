/*
    SAMPLE
    -----------------------------------------------------
    downloading rendered images
 */


// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";

const serverVars = new ServerVars();

const myArgs = process.argv.slice(2);
const targetPath = (myArgs && myArgs[0]);

if (!targetPath) {
    console.error("Please pass the directory to download the files to as the first argument.");
    console.error("EXAMPLE: node downloadRendered myDownloads");
}
else {


    const client = new FSIServerClient(serverVars.host);
    client.setProgressFunction(FSIServerClient.defaultProgress);
    client.setPromptFunction(FSIServerClient.defaultPrompt);

    client.setLogLevel(LogLevel.info);

    const queue = client.createQueue({continueOnError: true});

    // start session
    queue.login(serverVars.userName, serverVars.passWord);

    // list content of dir recursively
    queue.listServer(serverVars.sampleImagesDirectory, {
        recursive: true
    });

    // output all entries matching criteria
    queue.logBatchContent();

    // download desaturated images as PNG with 400px width

    queue.batchDownload(targetPath + "/grey",
        {
            downloadProgress: false,
            flattenTargetPath: false,
            renderOptions: {
                effects: "desaturate(average)",
                format: "gif",
                width: 400
            },
            replaceFileExtension: true,

        });


    // download  images as jpeg with 200px width
    queue.batchDownload(targetPath + "/colored",
        {
            downloadProgress: false,
            flattenTargetPath: false,
            renderOptions: {
                format: "jpeg",
                quality: 5,
                width: 200
            },
            replaceFileExtension: true,
        });

    // close session
    queue.logout();

    // run the queued commands
    queue.runWithResult();
}