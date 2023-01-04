import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, FSIServerClientUtils, LogLevel} from "library/index";
import {default as data} from "./reImportData.json"


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = "http";


it('re-import and listServer', () => {


  // setup replies

  // list
  nock(host)
    .get(data.listURL1)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, data.listReply1);


  nock(host)
    .get(data.listURL2)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, data.listReply2);


  // re-import
  const paths = [
    "images/a.jpg",
    "images/ä ö ü.jpg",
    "moreimages/a.jpg"
  ];

  for (const path of paths) {
    nock(host)
      .post("/fsi/service/file/" + FSIServerClient.ENCODE_PATH(path), data.reImportRequestBody)
      .matchHeader('accept', 'application/json')
      .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
      .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
      .matchHeader("content-length", "37")
      .reply(200, data.reImportReply);

  }


  nock(host)
    .post("/fsi/service/file/images/a.jpg", data.reImportRequestBody)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
    .matchHeader("content-length", "37")
    .reply(200, data.reImportReply);


  nock(host)
    .post("/fsi/service/directory/images/foo", data.reImportRequestBody)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
    .matchHeader("content-length", "37")
    .reply(200, data.reImportReply);

  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.listServer("moreimages/", {"recursive": true});
  queue.batchReimport(true, true);
  queue.reImportFile("images/a.jpg", true, true);
  queue.reImportDir("images/foo", true, true);


  return queue.run()
    .then(
      result => {
        expect(result).to.equal(true);
      }
    )
    .finally(() => {
      nock.cleanAll();
    })

});

