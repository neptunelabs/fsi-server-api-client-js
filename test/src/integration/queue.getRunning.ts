import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel} from "library/index";
import {default as data} from "./reImportData.json"
import {default as loginData} from "./loginData.json"


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http')


it('queue.getRunning() and queue.clearList()', () => {


  // setup replies

  // list
  nock(host)
    .get(data.listURL1)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", "FSI Server API Client")
    .delayConnection(10)
    .reply(200, data.listReply1);


  const queue = client.createQueue();
  queue.listServer("images/", {"recursive": true});
  queue.clearList();

  const res = queue.run()
    .then((res) => {
      expect(res).equals(true);

      // assert the list request actually returned 2 entries
      const results = queue.getResults();
      expect(results).to.have.lengthOf(2);
      expect(results[0]).to.have.own.property('entries');
      expect(results[0].entries).to.have.lengthOf(2, "queue.getResults().length == 2");

      // assert the batch content is empty after clearList
      const bc = queue.getCurrentBatchContent();
      expect(bc).to.have.own.property('entries');
      if (bc) expect(bc.entries).to.have.length(0, "queue.getCurrentBatchContent().length == 0");

      expect(queue.getExecutionDurationMS()).to.be.above(0, "queue.getExecutionDurationMS() > 0");

    })
    .finally(() => {
      nock.cleanAll();
    });

  expect(queue.getRunning()).equals(true, "queue.getRunning() == true");

  return res;
});


it('queue.changePassword(), queue.changeUser() and queue.getUserList()', () => {


  // setup replies


  nock(host)
    .get("/fsi/service/password")
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", "FSI Server API Client")
    .reply(200, loginData.saltReply);

  nock(host)
    .put("/fsi/service/password", loginData.changePassWordRequest)
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", "FSI Server API Client")
    .reply(200, {"statuscode": 200});

  nock(host)
    .put("/fsi/service/user/change", "someUser")
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", "FSI Server API Client")
    .reply(200, {"statuscode": 200});


  nock(host)
    .get("/fsi/service/user/list")
    .matchHeader('accept', 'application/json')
    .matchHeader("user-agent", "FSI Server API Client")
    .reply(200, loginData.users);


  const queue = client.createQueue();
  queue.changePassword("admin", "admin");
  queue.changeUser("someUser");
  queue.getUserList();


  const res = queue.run()
    .then((res) => {
      expect(res).equals(true);
      expect(client.getCurrentUser()).equals("someUser", "client.getCurrentUser() !== \"someUser\"");

      const results = queue.getResults();
      expect(results[2]).to.have.ordered.members(loginData.users)

    })
    .finally(() => {
      nock.cleanAll();
    });


  return res;
});


