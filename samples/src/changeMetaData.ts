/*
    SAMPLE
    -----------------------------------------------------
    changing meta data of multiple files
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, IListEntry, IMetaData, LogLevel} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.info);

const queue = client.createQueue(
    {
        continueOnError: true,
        fnProgress: FSIServerClient.defaultProgress
    }
);

const tempDir: string = serverVars.getTempDir();

queue.login(serverVars.userName, serverVars.passWord);


// SAMPLE ONLY: copy to temporary dir
queue.copyDirectoryContent(serverVars.sampleImagesDirectory,
    tempDir,
    {
        recursive: false,
        typeFilter: "file"
    }
);

queue.listServer(tempDir,
    {
        recursive: false,
        typeFilter: "file"
    }
);

queue.batchSetMetaData((entry: IListEntry): Promise<IMetaData | null> => {

    return new Promise((resolve) => {
        let metaData: IMetaData | null;

        // make sure metaData.iptc is an object
        if (entry.metaData === undefined) {
            metaData = {};
        } else {
            metaData = entry.metaData;
        }

        if (metaData.iptc === undefined) {
            metaData.iptc = {};
        }

        // sample: set iptc["Object Name"] to the file name
        metaData.iptc["Object Name"] = "TEST CHANGE META DATA: " + entry.src;

        return resolve(metaData);
    });

});

// close session
queue.logout();

// run the queued commands
queue.runWithResult();
