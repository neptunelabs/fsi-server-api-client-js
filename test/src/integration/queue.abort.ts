import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel} from "library/index";
import {default as data} from "./reImportData.json"



const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http')


it('queue.abort()', () => {


    // setup replies

    // list
    nock(host)
        .get(data.listURL1)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .delayConnection(10)
        .reply(200, data.listReply1);


    const queue = client.createQueue();
    queue.listServer("images/", {"recursive":true});

    const res = queue.run()
        .then( () => {
            expect("result").equals("must catch");
        })
        .catch( (err) => {
            expect(err.message).to.not.contain("must catch");
            expect(queue.getAborted()).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

    queue.abort();

    return res;
});

