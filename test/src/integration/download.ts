import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {APIError, FSIServerClient, FSIServerClientUtils, LogLevel} from "library/index";
import {default as data} from "./downloadData.json"

import {default as fs} from "fs";


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);


axios.defaults.adapter = "http";


it('download and listServer', () => {

  const path = "./test/files";

  // setup replies

  // list
  nock(host)
    .get(data.listURL)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, data.listReply);


// list
  nock(host)
    .get(data.downloadURL1)
    .matchHeader('accept', '*/*')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, "first");

  nock(host)
    .get(data.downloadURL2)
    .matchHeader('accept', '*/*')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, "second");


  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.batchDownload(path);
  return queue.run()
    .then(
      result => {
        expect(result).to.equal(true);
        expect(queue.getResults()[0].entries.length).to.equal(2);

        const contentFile1 = fs.readFileSync(path + "/images/a.jpg", "utf8");
        expect(contentFile1).to.equal("first");

        const contentFile2 = fs.readFileSync(path + "/images/ä ö ü.jpg", "utf8");
        expect(contentFile2).to.equal("second");
      }
    )
    .finally(() => {
      nock.cleanAll();


      let success = false;
      try {
        fs.unlinkSync(path + "/images/a.jpg");
        fs.unlinkSync(path + "/images/ä ö ü.jpg");
        fs.rmdirSync(path + "/images");

        success = true;
      } catch (e) {
        console.error(e);
      }

      expect(success).to.equal(true);
    })

});


it('batchDownloadICCProfiles()', () => {

  const path = "./test/files";

  // setup replies

  // list
  nock(host)
    .get(data.listURL)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, data.listReply);


// list
  nock(host)
    .get(data.downloadURLICC1)
    .matchHeader('accept', '*/*')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, "first");

  nock(host)
    .get(data.downloadURLICC2)
    .matchHeader('accept', '*/*')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, "second");


  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.batchDownloadICCProfiles(path);
  return queue.run()
    .then(
      result => {
        expect(result).to.equal(true);
        expect(queue.getResults()[0].entries.length).to.equal(2);

        const contentFile1 = fs.readFileSync(path + "/images/a.jpg.icc", "utf8");
        expect(contentFile1).to.equal("first");

        const contentFile2 = fs.readFileSync(path + "/images/ä ö ü.jpg.icc", "utf8");
        expect(contentFile2).to.equal("second");
      }
    )
    .finally(() => {
      nock.cleanAll();

      let success = false;
      try {
        fs.unlinkSync(path + "/images/a.jpg.icc");
        fs.unlinkSync(path + "/images/ä ö ü.jpg.icc");
        fs.rmdirSync(path + "/images");

        success = true;
      } catch (e) {
        console.error(e);
      }

      expect(success).to.equal(true);

    })

});


it('downloadICCProfile', () => {

  const path = "./test/files";

  // setup replies
  nock(host)
    .get(data.downloadURLICC1)
    .matchHeader('accept', '*/*')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, "first");

  const queue = client.createQueue();
  queue.downloadICCProfile("images/a.jpg", path);

  return queue.run()
    .then(
      result => {
        expect(result).to.equal(true);

        const contentFile1 = fs.readFileSync(path + "/images/a.jpg.icc", "utf8");
        expect(contentFile1).to.equal("first");

      }
    )
    .finally(() => {
      nock.cleanAll();

      let success = false;
      try {
        fs.unlinkSync(path + "/images/a.jpg.icc");
        fs.rmdirSync(path + "/images");

        success = true;
      } catch (e) {
        console.error(e);
      }

      expect(success).to.equal(true);

    })

});


it('download non existing dir', () => {

  client.setLogLevel(LogLevel.none);
  // setup replies

  // list
  nock(host)
    .get(data.listURLFails)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(403, "Access to one or more of the requested resources denied");


  const queue = client.createQueue();
  queue.listServer("foo", {"recursive": true});

  return queue.run()
    .then(
      () => {
        expect("result").equals("must catch");
      },
      err => {
        expect(err.message).to.not.contain("must catch");
        expect(err).to.be.an.instanceof(APIError);
        const errors = queue.getErrors();
        expect(errors[0].message).to.contain("HTTP 403");
      }
    )
    .finally(nock.cleanAll)

});
