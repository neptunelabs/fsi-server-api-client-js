import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, APITemplateSupplier} from "library/index";


const templateSupplier = new APITemplateSupplier();

const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.info);

axios.defaults.adapter = require('axios/lib/adapters/http')



const nDirs = 6;
const nFiles = 100;
const maxDepths = 9;
const defectLimit = Math.floor(nFiles / 2);
let nFilesCreated = 0;
let nDirsCreated = 0;
const timeStart = Date.now();

const log = () => {
  const elapsed = Date.now() -  timeStart;
  const fps = Math.floor(nFilesCreated / elapsed * 1000);
  console.log(
      client.formatTimePeriod(elapsed) + " "
      + templateSupplier.niceInt(nDirsCreated) + " dirs, "
      + templateSupplier.niceInt(nFilesCreated) + " files, "
      + templateSupplier.niceInt(fps) + " files/sec");

};


// list
nock(host)
    .persist()
    .get(/\/fsi\/server\?type=list&tpl=interface_thumbview_default.json&source=.*/)
    .reply((uri) => {

        const sourceParam = uri.match(/&source=([^&]*)/);

        if (sourceParam && sourceParam[1]){
            const path = decodeURIComponent(sourceParam[1]);
            let pathNoSlash;
            if (path.indexOf("/") !== 0) {
                pathNoSlash = path;
            }
            else pathNoSlash = path.replace(/^\//, "");

            const parts = pathNoSlash.split("/");
            const level = parts.length - 1;
            const dirContent = {
                "summary":{
                    "dir":pathNoSlash,
                    "connectorType":"STORAGE",
                    "entryCount":0,
                    "imageCount":0,
                    "directoryCount":0,
                    "completeCount":0,
                    "lastModified":1583490599066
                },
                "entries": [{}]
            }

            dirContent.entries = [];

            dirContent.summary.entryCount       += nDirs;
            dirContent.summary.directoryCount   += nDirs;
            nDirsCreated += nDirs;

            let id = 1;
            for (let i = 0; i < nDirs; i++, id++){

                const newDir = {
                    "id": id,
                    "src": "sub_" + String.fromCharCode(65 + level) + "_" + id,
                    "size":"0",
                    "lastmodified":"1583490599066",
                    "sub":nDirs,
                    "images":nFiles,
                    "type":"directory",
                    "connectorType":"STORAGE"
                };

                dirContent.entries.push(newDir);
            }

            if (level > 0){

                dirContent.summary.entryCount += nFiles;
                dirContent.summary.imageCount += nFiles;
                nFilesCreated += nDirs;

                let numFile = 1;
                for (let i = 0; i < nFiles; i++, id++, numFile++) {

                    const newFile = {
                        "id": id,
                        "src": "image_" + numFile,
                        "size": 100,
                        "lastmodified": "1363089142000",
                        "width": "2000",
                        "height": "1000",
                        "importstatus": (i < defectLimit)?3:1,
                        "type": "file"
                    }

                    dirContent.entries.push(newFile);
                }

            }


            dirContent.entries.push({});

            return [200, dirContent];
        }
        else return [500];


    });



const queue = client.createQueue({continueOnError: true});
queue.listServer("/",
    {
        recursive:true,
        maxRecursiveDepth: maxDepths,
        dropEntries: true
    });

//queue.logBatchContent();
queue.logBatchContentSummary();



const intervalLog = setInterval(log, 1000);

queue.run().finally( () => {
   nock.cleanAll();
   clearInterval(intervalLog);

   const bc = queue.getCurrentBatchContent();
   if (bc && bc.entries) console.log("batch contains " + bc.entries.length + " entries");


});



