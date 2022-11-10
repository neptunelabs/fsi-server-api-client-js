import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {APIError, FSIServerClient, LogLevel} from "library/index";
import {default as data} from "./loginData.json"

const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = require('axios/lib/adapters/http');


it('login', () => {

  // setup replies
  nock(host)
    .get("/fsi/service/login")
    .reply(200, data.saltReply);

  nock(host)
    .post("/fsi/service/login", data.expectedLoginPostData)
    .reply(200, data.loginReplyOK);


  return client.login("admin", "admin")
    .then(
      loginReply => {
        expect(loginReply).to.deep.equal(data.loginReplyData);
      }
    )
    .finally(nock.cleanAll)

});


it('logout with http error', () => {

  client.setLogLevel(LogLevel.none);


  // setup replies
  nock(host)
    .get("/fsi/service/logout")
    .reply(500);

  return client.logout()
    .then(
      () => {
        expect("result").equals("must catch");
      },
      err => {
        expect(err.message).to.not.contain("must catch");

        expect(err).to.be.an.instanceof(APIError);
        expect(err.message).to.contains("HTTP 500");
      }
    )
    .finally(nock.cleanAll)

});

it('logout', () => {

  // setup replies
  nock(host)
    .get("/fsi/service/logout")
    .reply(200, {value: true});

  return client.logout()
    .then(
      result => {
        expect(result).to.equal(true);
      }
    )
    .finally(nock.cleanAll)
});
