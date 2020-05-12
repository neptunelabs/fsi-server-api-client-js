import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, IListEntry} from "library/index";
import {default as data} from "./renameData.json"




const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = require('axios/lib/adapters/http')


it('rename and listServer', () => {


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

    const items = [
        {"path":"images%2Fa.jpg", "newPath":"images%2Frenamed_a.jpg"},
        {"path":"images%2F%C3%A4%20%C3%B6%20%C3%BC.jpg", "newPath":"images%2Frenamed_%C3%A4+%C3%B6+%C3%BC.jpg"},
        {"path":"moreimages%2Fa.jpg", "newPath":"moreimages%2Frenamed_a.jpg"}
    ];

    for (const item of items){

        const body ="cmd=move&to=" + item.newPath;

        nock(host)
            .post("/fsi/service/file/" + item.path, body)
            .matchHeader('accept', 'application/json')
            .matchHeader("user-agent", "FSI Server API Client")
            .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
            .matchHeader("content-length", body.length.toString())
            .reply(200, data.renameReply);

    }




    const queue = client.createQueue();
    queue.listServer("images/", {"recursive":true});
    queue.listServer("moreimages/", {"recursive":true});
    queue.batchRename((entry: IListEntry) => {
        return new Promise( (resolve) => {
            return resolve("renamed_" + entry.src);
        })

    });


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

