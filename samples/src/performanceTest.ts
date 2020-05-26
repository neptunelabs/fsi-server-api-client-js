/*
    This sample runs a huge number of requests
    and is intended for performance testing only
 */


import {FSIServerClient, LogLevel, APITemplateSupplier, IListData, IListEntry, APIAbortController} from "@neptunelabs/fsi-server-api-client";

const testMode = "queue";
const templateSupplier = new APITemplateSupplier();

const host = 'http://localhost:3000';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.info);


const maxDepths = 4;
let maxHeap = 0;
const memUsage = process.memoryUsage();
let minHeap = memUsage.heapUsed;
let intervalLog:NodeJS.Timeout;



const timeStart = Date.now();

let processedFiles = 0;
let processedDirs = 0;
let reImportFailed = 0;
let reImportSuccess = 0;

const logTime = 250;

const log = () => {

    //if (global.gc) global.gc();

    const elapsed = Date.now() -  timeStart;

    const memUsage = process.memoryUsage();

    maxHeap = Math.max(maxHeap, memUsage.heapUsed);
    minHeap = Math.min(minHeap, memUsage.heapUsed);

    console.log(
        '%s heapTotal: %s heapUsed: %s',
        client.formatTimePeriod(elapsed),
        templateSupplier.niceInt(memUsage.heapTotal),
        templateSupplier.niceInt(memUsage.heapUsed));

};


const finalOutput = () => {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapUsed - minHeap;
    console.log("maxHeap: "+templateSupplier.niceInt(maxHeap)+" heapTotal: " + templateSupplier.niceInt(total));


    clearInterval(intervalLog);
};


if (testMode === "queue") {
    const queue = client.createQueue(
        {
            //fnProgress: FSIServerClient.defaultProgress
        }
    );


    queue.listServer("/",
        {
            // generateDirProgress: true,
            recursive: true,
            maxRecursiveDepth: maxDepths,
            dropEntries: true,


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
        }
    });

    queue.logBatchContentSummary();


    intervalLog = setInterval(log, logTime);


    queue.run()
        .catch(console.error)
        .finally(() => {
        log();

        const bc = queue.getCurrentBatchContent();
        if (bc && bc.entries) console.log("batch contains " + bc.entries.length + " entries");

        finalOutput();
        console.log(
            "processedFiles: "+templateSupplier.niceInt(processedFiles)
            + " processedDirs: "+templateSupplier.niceInt(processedDirs));
        console.log("reImportFailed: "+templateSupplier.niceInt(reImportFailed)
            + " reImportSuccess: "+templateSupplier.niceInt(reImportSuccess));
    });
}
else  if (testMode === "simple"){
    const doit = ( async () => {
        for (let i = 0; i < 50000; i++){

            log();
            await client.httpGet(host  + "/fsi/server?type=list&tpl=interface_thumbview_default.json&source=foo" + Math.random());
        }
    });

    doit().then( () => {
        finalOutput();
    })





}
else if (testMode === "recursive"){
    intervalLog = setInterval(log, logTime);
    let level = -1;
    const baseURL = host  + "/fsi/server?type=list&tpl=interface_thumbview_default.json&source=";

    const getSubDirectories = async (dirs:string[]) => {
        if (level === maxDepths) return;
        for (const dir of dirs) await readDir(dir);
    };


    const readDir =  (src:  string): Promise<void> => {

        // console.log("READ: "+src+" at "+level);

        return new Promise ( async (resolve) => {
            await client.httpGet(baseURL + src)
                //await axios.get(baseURL + src)
                .then ( (response) => {


                    const ld = response.data as IListData;
                    ld.entries.pop();

                    const subdirs: string[] = [];
                    for (const entry of ld.entries){
                        if (entry.type === "file") break;
                        subdirs.push(ld.summary.dir + "/" + entry.src);
                    }

                    ld.entries= [];

                    return subdirs;


                })
                .then ( async (dirs) => {

                    level++;
                    await getSubDirectories(dirs);
                    level--;



                    resolve();


                })
        });

    };

    readDir("/")
        .then ( () => {
            log();

            finalOutput();
        });

}
else if (testMode === "client"){
    intervalLog = setInterval(log, logTime);

    const abortController:APIAbortController = client.getNewAbortController();
    const listOptions = {
        abortController: abortController,
        recursive:true,
        maxRecursiveDepth:maxDepths,
        dropEntries:true
    }

    client.listServer("/", listOptions)
        .then( () =>{
            log();
            listOptions.abortController.release();

            finalOutput();
        })


}
else if (testMode === "clientNoCancel"){
    intervalLog = setInterval(log, logTime);


    const listOptions = {
        recursive:true,
        maxRecursiveDepth:maxDepths,
        dropEntries:true
    }

    client.listServer("/", listOptions)
        .then( () =>{
            log();

            finalOutput();
        })


}