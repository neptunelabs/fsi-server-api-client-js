import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";
import {default as data} from "./reImportData.json"



const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = require('axios/lib/adapters/http')


it('re-import and listServer', () => {


    // setup replies

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



    // re-import

    const paths = [
        "images%2Fa.jpg",
        "images%2F%C3%A4%20%C3%B6%20%C3%BC.jpg",
        "moreimages%2Fa.jpg"
    ];

    for (const path of paths){
        nock(host)
            .post("/fsi/service/file/" + path, data.reImportRequestBody)
            .matchHeader('accept', 'application/json')
            .matchHeader("user-agent", "FSI Server API Client")
            .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
            .matchHeader("content-length", "37")
            .reply(200, data.reImportReply);

    }




    const queue = client.createQueue();
    queue.listServer("images/", {"recursive":true});
    queue.listServer("moreimages/", {"recursive":true});
    queue.batchReimport(true, true);


    return queue.run()
        .then(
            result => {
                expect(result).to.equal(true);
            }
        )
        .finally( ()  => {
            nock.cleanAll();
        })

});
