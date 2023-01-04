import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, FSIServerClientUtils, LogLevel} from "library/index";
import {default as data} from "./reImportData.json"


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = "http";

const paths = [
  "images/a.jpg",
  "images/ä ö ü.jpg"
]

const metaDataReply = {
  "statuscode": 200
}

const nockLists = (): void => {
  // list
  nock(host)
    .get(data.listURL1)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, data.listReply1);

  // list
  nock(host)
    .get(data.listURL2)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
    .reply(200, data.listReply2);
};

const nockPostReplies = (postData: any): void => {
  for (const path of paths) {
    nock(host)
      .post("/fsi/service/file/" + FSIServerClient.ENCODE_PATH(path), postData)
      .matchHeader('accept', 'application/json')
      .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
      .reply(200, metaDataReply);

  }
};


const nockGetReplies = (): void => {
  for (const path of paths) {
    nock(host)
      .get("/fsi/server?type=info&tpl=foo&renderer=bar&headers=webinterface&source=" + encodeURIComponent(path))
      .matchHeader('accept', 'application/json')
      .matchHeader("user-agent", FSIServerClientUtils.USERAGENT)
      .reply(200, metaDataReply);

  }
};


it('queue.batchSetMetaData()', () => {

  const metaDataPost = {
    "cmd": "saveMetaData",
    "iptc.Object Name": "foo"
  }

  // setup replies
  nockLists();
  nockPostReplies(metaDataPost);

  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.batchSetMetaData({"iptc": {"Object Name": "foo"}});

  return queue.run()
    .then((result) => {
      expect(result).equals(true);
    })
    .finally(() => {
      nock.cleanAll();
    });

});


it('queue.batchDeleteMetaData()', () => {

  const metaDataPost = {
    "cmd": "deleteMetaData",
    "iptc.Object Name": ""
  }

  // setup replies
  nockLists();
  nockPostReplies(metaDataPost);

  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.batchDeleteMetaData({"iptc": {"Object Name": "true"}});

  return queue.run()
    .then((result) => {
      expect(result).equals(true);
    })
    .finally(() => {
      nock.cleanAll();
    });

});

it('queue.batchRestoreMetaData()', () => {

  const metaDataPost = {
    "cmd": "restoreMetaData",
    "iptc.Object Name": ""
  }

  // setup replies
  nockLists();
  nockPostReplies(metaDataPost);

  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.batchRestoreMetaData({"iptc": {"Object Name": "true"}});

  return queue.run()
    .then((result) => {
      expect(result).equals(true);
    })
    .finally(() => {
      nock.cleanAll();
    });

});


it('queue.batchGetMetaData()', () => {


  // setup replies
  nockLists();
  nockGetReplies();

  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.batchGetMetaData({"template": "foo", "renderer": "bar"});

  return queue.run()
    .then((result) => {
      expect(result).equals(true);
    })
    .finally(() => {
      nock.cleanAll();
    });

});


it('queue.getMetaData()', () => {


  // setup replies
  nockGetReplies();

  const queue = client.createQueue();

  queue.getMetaData("images/a.jpg", {"template": "foo", "renderer": "bar"});

  return queue.run()
    .then((result) => {
      expect(result).equals(true);
    })
    .finally(() => {
      nock.cleanAll();
    });

});
