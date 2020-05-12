import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel} from "library/index";



const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http')


// HEAD
it('client.httpHead', () => {
    nock(host)
        .head("/foo.html")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader('x-test', 'test')
        .reply(200, "ok");


    return client.httpHead(host + "/foo.html", undefined, {"x-test": "test"})
        .then( (reply) => {
                expect(reply.status).to.equal(200);
                expect(reply.data).to.equal("ok");
            }
        )
        .finally(nock.cleanAll)
});

// GET
it('client.httpGet', () => {
    nock(host)
        .get("/foo.html")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, "ok");


    return client.httpGet(host + "/foo.html")
        .then( (reply) => {
                expect(reply.status).to.equal(200);
                expect(reply.data).to.equal("ok");
            }
        )
        .finally(nock.cleanAll)
});

// POST
it('client.httpPost', () => {
    nock(host)
        .post("/foo.html", "payload")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, "ok");


    return client.httpPost(host + "/foo.html", "payload")
        .then( (reply) => {
            expect(reply.status).to.equal(200);
            expect(reply.data).to.equal("ok");
            }
        )
        .finally(nock.cleanAll)
});


// DELETE
it('client.httpDelete', () => {
    nock(host)
        .delete("/foo.html")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, "ok");


    return client.httpDelete(host + "/foo.html")
        .then( (reply) => {
            expect(reply.status).to.equal(200);
            expect(reply.data).to.equal("ok");
        }
        )
        .finally(nock.cleanAll)
});


// PUT
it('client.httpPut', () => {
    nock(host)
        .put("/foo.html", "payload")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, "ok");


    return client.httpPut(host + "/foo.html", "payload")
        .then( (reply) => {
            expect(reply.status).to.equal(200);
            expect(reply.data).to.equal("ok");
        }
        )
        .finally(nock.cleanAll)
});