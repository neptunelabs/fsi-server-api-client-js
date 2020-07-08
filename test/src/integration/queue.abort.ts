import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {APIError, FSIServerClient, LogLevel} from "library/index";
import {default as data} from "./reImportData.json"

const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http')

it('queue.abort()', () => {

    // setup replies
    // list
    nock(host)
        .persist()
        .get(/\/fsi\/server\?type=list&tpl=interface_thumbview_default.json&source=.*/)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, data.listReply3);


    const queue = client.createQueue({continueOnError: true});
    queue.listServer("images/", {"recursive":true});

    const res = queue.run()
        .then( () => {
                expect("result").equals("must catch");
            },
            (error) => {
                expect(error.message).to.not.contain("must catch");

                expect(queue.getAborted()).equals(true);

                const errors = queue.getErrors();
                expect(errors).to.have.lengthOf(1);
                const err: APIError = errors[0] as APIError;
                expect(err).to.have.property("type");
                if (err.type) expect(err.type).to.equal("aborted");


            })
        .finally( ()  => {
            nock.cleanAll();
        });

    setTimeout( () => {
        queue.abort();
    }, 10)


    return res;
});

