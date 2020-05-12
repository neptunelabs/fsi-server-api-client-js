import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel, APIError} from "library/index";


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = require('axios/lib/adapters/http')


it('login', () => {

    const requestURL = "/fsi/service/login";

    const saltReply = {
        "state":"success", "salt":"53b566cdbf2ff5cb15e496e0c027feb71a99e3a9750dd0d3f952c22cd695eafbea9fb45bb2465ff6a1fdfcc715979594f353cf492295ef5630d2ad9837f71aef",          "message":"",
        "loginmethod":"hash"
    };

    const expectedLoginPostData = {
        "username": "admin",
        "password": "11c8af969e50753fd06e2269f23f05fb165d1d9c9b3d1d01864176f7a845a1c5"
    };

    const loginReplyOK = {
        "username":"admin",
        "state":"success",
        "messageCode":1,
        "message":"",
        "expiry":1588252458,
        "accesslevel":"",
        "serverversion":"FSI Server 20.03.8768"
    };


    const loginReplyData = {
        username: 'admin',
        state: 'success',
        messageCode: 1,
        message: '',
        expiry: 1588252458,
        accesslevel: '',
        serverversion: 'FSI Server 20.03.8768',
        defaultPassword: true
    };


    // setup replies
    nock(host)
        .get(requestURL)
        .reply(200, saltReply);

    nock(host)
        .post(requestURL, expectedLoginPostData)
        .reply(200, loginReplyOK);


    return client.login("admin", "admin")
        .then(
            loginReply => {
                expect(loginReply).to.deep.equal(loginReplyData);
            }
        )
        .finally(nock.cleanAll)

});


it('logout with http error', () => {

    client.setLogLevel(LogLevel.none);

    const requestURL = "/fsi/service/logout";

    // setup replies
    nock(host)
        .get(requestURL)
        .reply(500);

    return client.logout()
        .then(
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => {
            },
            err => {
                expect(err).to.be.an.instanceof(APIError);
                expect(err.message).to.contains("HTTP 500");
            }
        )
        .finally(nock.cleanAll)

});

it('logout', () => {

    const requestURL = "/fsi/service/logout";

    // setup replies
    nock(host)
        .get(requestURL)
        .reply(200, {value:true});

    return client.logout()
        .then(
            result => {
                expect(result).to.equal(true);
            }
        )
        .finally(nock.cleanAll)
});
