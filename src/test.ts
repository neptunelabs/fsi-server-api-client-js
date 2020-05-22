import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, APITemplateSupplier, IListData} from "./index";


const templateSupplier = new APITemplateSupplier();

const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.info);



axios.defaults.adapter = require('axios/lib/adapters/http')


const nDirs = 500;
const nFiles = 500;
const maxDepths = 7;
const regExSource = /&source=([^&]*)/;
let maxHeap = 0;

const defectLimit = Math.floor(nFiles / 2);
let nFilesCreated = 0;
let nDirsCreated = 0;
let curLevel = 0;
const timeStart = Date.now();
let interation = 0;

const log = () => {
//    if (global.gc) global.gc();

  const elapsed = Date.now() -  timeStart;
  const fps = Math.floor(nFilesCreated / elapsed * 1000);
  const memUsage = process.memoryUsage();

    maxHeap = Math.max(maxHeap, memUsage.heapUsed);
  console.log(
        '%d) %s %s dirs %s files %s files/sec depth: %s heapTotal: %s heapUsed: %s',
        interation,
        client.formatTimePeriod(elapsed),
        templateSupplier.niceInt(nDirsCreated),
        templateSupplier.niceInt(nFilesCreated),
        templateSupplier.niceInt(fps),
        curLevel,
        templateSupplier.niceInt(memUsage.heapTotal),
        templateSupplier.niceInt(memUsage.heapUsed));

};

const setupNock = ()=> {

    // list
    nock(host)
        .persist()
        .get(/\/fsi\/server\?type=list&tpl=interface_thumbview_default.json&source=.*/)
        .reply((uri) => {

            interation++;

            const sourceParam = uri.match(regExSource);

            if (sourceParam && sourceParam[1]) {
                const path = decodeURIComponent(sourceParam[1]);
                let pathNoSlash;
                if (path.indexOf("/") !== 0) {
                    pathNoSlash = path;
                } else pathNoSlash = path.replace(/^\//, "");

                const parts = pathNoSlash.split("/");
                const level = curLevel = parts.length - 1;
                const dirContent = {
                    "summary": {
                        "dir": pathNoSlash,
                        "connectorType": "STORAGE",
                        "entryCount": 0,
                        "imageCount": 0,
                        "directoryCount": 0,
                        "completeCount": 0,
                        "lastModified": 1583490599066
                    },
                    "entries": [{}]
                }

                dirContent.entries = [];

                dirContent.summary.entryCount += nDirs;
                dirContent.summary.directoryCount += nDirs;
                nDirsCreated += nDirs;

                let id = 1;
                for (let i = 0; i < nDirs; i++, id++) {

                    const newDir = {
                        "id": id,
                        "src": String.fromCharCode(65 + level) + "_" + id,
                        "size": "0",
                        "lastmodified": "1583490599066",
                        "sub": nDirs,
                        "images": nFiles,
                        "type": "directory",
                        "connectorType": "STORAGE"
                    };

                    dirContent.entries.push(newDir);
                }

                if (level > 0) {

                    dirContent.summary.entryCount += nFiles;
                    dirContent.summary.imageCount += nFiles;
                    nFilesCreated += nFiles;

                    let numFile = 1;
                    for (let i = 0; i < nFiles; i++, id++, numFile++) {

                        const newFile = {
                            "id": id,
                            "src": "image_" + numFile,
                            "size": 100,
                            "lastmodified": "1363089142000",
                            "width": "2000",
                            "height": "1000",
                            "importstatus": (i < defectLimit) ? 3 : 1,
                            "type": "file"
                        }

                        dirContent.entries.push(newFile);
                    }

                }


                dirContent.entries.push({});

                return [200, dirContent];
            } else return [500];


        })

}

setupNock();

let type = "queue";

if (type === "queue") {
    const queue = client.createQueue(
        {
            continueOnError: true,
            //fnProgress: FSIServerClient.defaultProgress
        }
    );
    queue.listServer("/",
        {
            // generateDirProgress: true,
            recursive: true,
            maxRecursiveDepth: maxDepths,
            dropEntries: true
        });

    //queue.logBatchContent();
    queue.logBatchContentSummary();


    const intervalLog = setInterval(log, 500);


    queue.run().finally(() => {
        nock.cleanAll();


        console.log("iterations: " + interation);
        console.log("maxHeap: "+templateSupplier.niceInt(maxHeap));
        const bc = queue.getCurrentBatchContent();
        if (bc && bc.entries) console.log("batch contains " + bc.entries.length + " entries");

        setTimeout(() => {
            clearInterval(intervalLog);
        }, 10000);

    });
}
else  if (type === "simple"){
    const doit = ( async () => {
        for (let i = 0; i < 50000; i++){

            log();
            await client.httpGet("http://fsi.fake.tld/fsi/server?type=list&tpl=interface_thumbview_default.json&source=foo" + Math.random());
        }
    });

    doit();

    console.log("maxHeap: "+templateSupplier.niceInt(maxHeap));


}
else if (type === "recursive"){
    const intervalLog = setInterval(log, 500);
    let level = -1;
    const baseURL = "http://fsi.fake.tld/fsi/server?type=list&tpl=interface_thumbview_default.json&source=";

    const getSubDirectories = async (dirs:string[]) => {
        if (level === maxDepths) return;
        for (const dir of dirs) await readDir(dir);
    };


    const readDir =  (src:  string): Promise<void> => {

       // console.log("READ: "+src+" at "+level);

        return new Promise ( async (resolve) => {
            await client.httpGet(baseURL + src)
                .then ( (response) => {


                    const ld = response.data as IListData;
                    ld.entries.pop();

                    const subdirs: string[] = [];
                    for (const entry of ld.entries){
                        if (entry.type === "file") break;
                        subdirs.push(ld.summary.dir + "/" + entry.src);
                    }



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
            console.log("-------- DONE, ");
            console.log("maxHeap: "+templateSupplier.niceInt(maxHeap));
            setTimeout(() => {
                clearInterval(intervalLog);
            }, 10000);
        });



}




else if (type === "queue"){
    const intervalLog = setInterval(log, 500);

    client.listServer("/", {
        recursive:true,
        maxRecursiveDepth:maxDepths,
        dropEntries:true
    })
        .then( (ld) =>{
        console.log("DIRS: "+templateSupplier.niceInt(ld.summary.directoryCount));
        console.log("maxHeap: "+templateSupplier.niceInt(maxHeap));
        setTimeout(() => {
            clearInterval(intervalLog);
        }, 10000);

    })
}