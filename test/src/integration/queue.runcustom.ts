import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, Queue, IBatchContent} from "library/index";
import {default as data} from "./reImportData.json"



const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http');





it('queue.runCustom() and queue.logBatchContent()', () => {


    let customResult: string = "";

    const myCustomFunction = (
        theClient: FSIServerClient,
        theQueue: Queue,
        fnProgress: (taskDescription: string, pos: number, length: number) => void,
        foo: number, bar: string): Promise<boolean> => {



        return new Promise((resolve) => {

            customResult = foo + bar;

            const content: IBatchContent | null = theQueue.getCurrentBatchContent();
            if (content) {

                for (let i: number = 0; i < content.entries.length; i++) {
                    const msg: string = "Doing something with entry \"" + content.entries[i].src + "\"";
                    fnProgress.call(theQueue, msg, i, content.entries.length);
                }
            }

            resolve(true);
        });
    }


    // list
    nock(host)
        .get(data.listURL1)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, data.listReply1);

    nock(host)
        .get(data.listURL2)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, data.listReply2);


    const queue = client.createQueue();
    queue.listServer("images/", {"recursive":true});
    queue.listServer("moreimages/", {"recursive":true});
    queue.logBatchContent();
    queue.runCustom(global, myCustomFunction, 123, "foo arg");




    const res = queue.run()
        .then( (result) => {

            expect(result).equals(true);
            expect(queue.getResults()[2]).equals(true);
            expect(customResult).equals("123foo arg");
        })
        .finally( ()  => {
            nock.cleanAll();
        });

    return res;
});

