import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, APIError} from "@neptunelabs/fsi-server-api-client";


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http');


it('login using wrong password', () => {

    const requestURL = "/fsi/service/login";

    const saltReply = {
        "state":"success", "salt":"53b566cdbf2ff5cb15e496e0c027feb71a99e3a9750dd0d3f952c22cd695eafbea9fb45bb2465ff6a1fdfcc715979594f353cf492295ef5630d2ad9837f71aef",          "message":"",
        "loginmethod":"hash"
    };

    const loginReplyFailed =
        {"username":"admin",
        "state":"failed",
        "messageCode":6,
        "message":"Unknown user or password wrong",
        "expiry":0,
        "accesslevel":"",
        "serverversion":"FSI Server 20.03.8768"
     };



    // setup replies
    nock(host)
        .get(requestURL)
        .reply(200, saltReply);

    nock(host)
        .post(requestURL)
        .reply(200, loginReplyFailed);


    // run test
    return client.login("admin", "wrong")
        .then(
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => {
            },
            err => {
                expect(err).to.be.an.instanceof(APIError);
            }
        )
        .finally(nock.cleanAll)

});
