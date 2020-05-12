import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel} from "library/index";
import {default as data} from "./uploadData.json"


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);


axios.defaults.adapter = require('axios/lib/adapters/http')


it('upload and listLocal', () => {


    // setup replies

    // create dir 1
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded")
        .put(data.createDirURL1)
        .reply(200, {"statuscode":200});

    // create dir 2
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded")
        .put(data.createDirURL2)
        .reply(200, {"statuscode":200});

    // create dir 3
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded")
        .put(data.createDirURL3)
        .reply(200, {"statuscode":200});



    // postupload file 1
    nock(host)
        .filteringRequestBody(/Lastmodified=[0-9]+[^&]*/, 'Lastmodified=xxx')
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
        .matchHeader("content-length", "144")
        .post(data.postRequestURL, data.postBody1)
        .reply(200, {"statuscode":202});


    // put file 1
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "image/jpeg")
        .matchHeader("content-length", "1617")
        .matchHeader('last-modified', /[0-9]+/)
        .put(data.putRequestURL1, data.uploadBody1)
        .reply(201, {"statuscode":201});

    // postupload file 2
    nock(host)
        .filteringRequestBody(/Lastmodified=[0-9]+[^&]*/, 'Lastmodified=xxx')
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
        .matchHeader("content-length", "125")
        .post(data.postRequestURL, data.postBody2)
        .reply(200, {"statuscode":202});

    // put file 2
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "image/jpeg")
        .matchHeader("content-length", "1748")
        .matchHeader('last-modified', /[0-9]+/)
        .put(data.putRequestURL2, data.uploadBody2)
        .reply(201, {"statuscode":201});

    const queue = client.createQueue();
    queue.listLocal("./test/files", {"recursive":true});
    queue.batchUpload("/images/hk test/empty/");
    return queue.run()
        .then(
            result => {
                expect(result).to.equal(true);

                const results = queue.getResults();
                expect(results[0].summary.connectorType).to.equal("LOCAL");
                expect(results[0].summary.entryCount).to.equal(4);
                expect(results[0].summary.imageCount).to.equal(2);
                expect(results[0].summary.directoryCount).to.equal(2);
            }
        )
        .finally(nock.cleanAll)
});


// upload existing files

it('upload and listLocal', () => {


    // setup replies

    // create dir 1
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded")
        .put(data.createDirURL1)
        .reply(200, {"statuscode":200});

    // create dir 2
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded")
        .put(data.createDirURL2)
        .reply(200, {"statuscode":200});

    // create dir 3
    nock(host)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded")
        .put(data.createDirURL3)
        .reply(200, {"statuscode":200});



    // postupload file 1
    nock(host)
        .filteringRequestBody(/Lastmodified=[0-9]+[^&]*/, 'Lastmodified=xxx')
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
        .matchHeader("content-length", "144")
        .post(data.postRequestURL, data.postBody1)
        .reply(200, {"statuscode":102});

    // postupload file 2
    nock(host)
        .filteringRequestBody(/Lastmodified=[0-9]+[^&]*/, 'Lastmodified=xxx')
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
        .matchHeader("content-length", "125")
        .post(data.postRequestURL, data.postBody2)
        .reply(200, {"statuscode":102});



    const queue = client.createQueue();
    queue.listLocal("./test/files", {"recursive":true});
    queue.batchUpload("/images/hk test/empty/");
    return queue.run()
        .then(
            result => {
                expect(result).to.equal(true);

                const results = queue.getResults();
                expect(results[0].summary.connectorType).to.equal("LOCAL");
                expect(results[0].summary.entryCount).to.equal(4);
                expect(results[0].summary.imageCount).to.equal(2);
                expect(results[0].summary.directoryCount).to.equal(2);
            }
        )
        .finally(nock.cleanAll)
});

