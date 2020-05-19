import {FSIServerClient, IListData, IListEntry, LogLevel} from "@neptunelabs/fsi-server-api-client";
// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
import {APITemplateSupplier} from "../../src";
const serverVars = new ServerVars();

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.trace);

const templateSupplier = new APITemplateSupplier();

let processedFiles: number = 0;
let processedDirs: number = 0;
let reImportSuccess: number = 0;
let reImportFailed: number = 0;


const queue = client.createQueue(
    {continueOnError: true});

// start session
queue.login(serverVars.userName, serverVars.passWord);

// list content of dir recursively and keep only files with importState === 3
// - limit to connectors of type "STORAGE" (files in other connectors cannot have state "error")
// - you may want to specify a path if you do not want to scan ALL images
queue.listServer("/", {
    validConnectorTypes: ["STORAGE"],

    fnFileFilter: (listData: IListData, entry: IListEntry): Promise<boolean> => {


        return new Promise((resolve) => {
            const bFile = (entry.type === "file");
            const result = (bFile && entry.importStatus === FSIServerClient.ImportStatus.error);

            if (bFile) processedFiles++;
            else processedDirs++;

            if (result){
                client.reImportFile(entry.path, true, true)
                    .then (() => {
                        reImportSuccess++;
                    })
                    .catch( () =>{
                        reImportFailed++;
                    })
                    .finally( () => {
                        return resolve(result);
                    })
            }
            else return resolve(result);

        })
    },

    recursive: true,
    dropEntries: true, // do not store the entries, we process them right away in fnFileFilter
    blackList: [] // array of paths to exclude recursively
});

// output summary of collected files
queue.logBatchContentSummary();

// output list of all entries matching criteria
// queue.logBatchContent();

// close session
queue.logout();

// run the queued commands
queue.run()
    .catch( console.error)
    .finally( () => {
        console.log();
        console.log("RESULT");
        console.log("-------");
        console.log(
            "successfully reImported " +
            templateSupplier.niceInt(reImportSuccess)
            +" images, failed: "
            +templateSupplier.niceInt(reImportFailed)
        );
    });
