import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, APIError} from "library/index";



const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.trace);

axios.defaults.adapter = require('axios/lib/adapters/http')



const nDirs = 2;
const nFiles = 10;
const maxDepths = 3;


// list
nock(host)
    .persist()
    .get(/\/fsi\/server\?type=list&tpl=interface_thumbview_default.json&source=.*/)
    .reply((uri) => {

        const sourceParam = uri.match(/&source=([^&]*)/);

        if (sourceParam && sourceParam[1]){
            let path = decodeURIComponent(sourceParam[1]);
            let pathNoSlash;
            if (path.indexOf("/") !== 0) {
                pathNoSlash = path;
                path = "/" + path;
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

                let numFile = 1;
                for (let i = 0; i < nFiles; i++, id++, numFile++) {

                    const newFile = {
                        "id": id,
                        "src": "image_" + numFile,
                        "size": 100,
                        "lastmodified": "1363089142000",
                        "width": "2000",
                        "height": "1000",
                        "importstatus": "1",
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

queue.logBatchContent();
queue.logBatchContentSummary();


queue.run().finally( () => {
   nock.cleanAll();
});



