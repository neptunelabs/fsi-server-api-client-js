import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, FSIServerClientUtils, IListEntry, LogLevel} from "library/index";
import {default as data} from "./renameData.json"


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = "http";


it('rename and listServer', () => {


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

  const items = [
    {"path": "images/a.jpg", "newPath": "images%2Frenamed_a.jpg"},
    {"path": "images/%C3%A4%20%C3%B6%20%C3%BC.jpg", "newPath": "images%2Frenamed_%C3%A4+%C3%B6+%C3%BC.jpg"},
    {"path": "moreimages/a.jpg", "newPath": "moreimages%2Frenamed_a.jpg"},
    {"path": "images/a.jpg", "newPath": "images%2Ffoo.jpg"},
    {"path": "images/oldName/", "newPath": "images%2FnewName%2F", "service": "directory"}

  ];

  for (const item of items) {

    const body = "cmd=move&to=" + item.newPath;
    const service = item.service ? item.service : "file";
    const url = "/fsi/service/" + service + "/" + item.path;

    nock(host)
      .post(url, body)
      .matchHeader('accept', 'application/json')
      .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
      .matchHeader("content-type", "application/x-www-form-urlencoded;charset=utf-8")
      .matchHeader("content-length", body.length.toString())
      .reply(200, data.renameReply);

  }

  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.listServer("moreimages/", {"recursive": true});
  queue.batchRename((entry: IListEntry) => {
    return new Promise((resolve) => {
      return resolve("renamed_" + entry.src);
    })

  });
  queue.renameFile("images/a.jpg", "images/foo.jpg");
  queue.renameDirectory("images/oldName", "images/newName");


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

