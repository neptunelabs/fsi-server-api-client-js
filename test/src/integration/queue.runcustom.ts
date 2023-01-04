import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, FSIServerClientUtils, IBatchContent, LogLevel, Queue} from "library/index";
import {default as data} from "./reImportData.json"


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = "http";


it('queue.runCustom() and queue.logBatchContent()', () => {


  let customResult: string = "";

  const myCustomFunction = (
    theClient: FSIServerClient,
    theQueue: Queue,
    fnProgress: (taskDescription: string, pos: number, length: number) => void,
    foo: number, bar: string): Promise<boolean> => {


    return new Promise((resolve) => {

      const content: IBatchContent | null = theQueue.getCurrentBatchContent();
      if (content) {

        for (let i: number = 0; i < content.entries.length; i++) {
          const msg: string = "Doing something with entry \"" + content.entries[i].src + "\"";
          fnProgress.call(theQueue, msg, i, content.entries.length);
          customResult += i + ":" + content.entries[i].src + "|" + foo + bar;
        }
      }

      resolve(true);
    });
  }


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


  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.listServer("moreimages/", {"recursive": true});
  queue.logBatchContent();
  queue.runCustom(global, myCustomFunction, 123, "foo arg");


  return queue.run()
    .then((result) => {

      expect(result).equals(true);
      expect(queue.getResults()[2]).equals(true);
      expect(customResult).equals("0:a.jpg|123foo arg1:ä ö ü.jpg|123foo arg2:a.jpg|123foo arg");
    })
    .finally(() => {
      nock.cleanAll();
    });

});

