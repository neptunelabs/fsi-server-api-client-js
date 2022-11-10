import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {APIError, FSIServerClient, LogLevel} from "library/index";
import {default as data} from "./loginData.json"


const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.none);

axios.defaults.adapter = require('axios/lib/adapters/http');


it('login using wrong password', () => {

  const requestURL = "/fsi/service/login";

  // setup replies
  nock(host)
    .get(requestURL)
    .reply(200, data.saltReply);

  nock(host)
    .post(requestURL)
    .reply(200, data.loginReplyFailed);


  // run test
  return client.login("admin", "wrong")
    .then(
      () => {
        expect("result").equals("must catch");
      },
      err => {
        expect(err.message).to.not.contain("must catch");
        expect(err).to.be.an.instanceof(APIError);
      }
    )
    .finally(nock.cleanAll)

});
