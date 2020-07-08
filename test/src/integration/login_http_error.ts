import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, APIError} from "library/index";


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http')

it('login with http error', () => {

    const requestURL = "/fsi/service/login";

    // setup replies
    nock(host)
        .get(requestURL)
        .reply(503, "Service unavailable");



    // run test
    return client.login("admin", "wrong")
        .then( () => {
            expect("result").equals("must catch");
        },
        err => {
            expect(err.message).to.not.contain("must catch");
            expect(err).to.be.an.instanceof(APIError);
            expect(err.message).to.contains("HTTP 503");
        }
    )
    .finally(nock.cleanAll)

});


