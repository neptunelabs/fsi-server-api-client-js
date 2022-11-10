import {expect} from 'chai';
import {FSIServerClient} from "library/index";

const client = new FSIServerClient('http://fsi.fake.tld');

const cases = [
  {
    "ms": 60010,
    "includeMS": true,
    "human": false,
    "result": "1m 0s 10ms"
  },
  {
    "ms": 60010,
    "includeMS": false,
    "human": false,
    "result": "1m 0s"
  },
  {
    "ms": 1164660010,
    "includeMS": false,
    "human": false,
    "result": "13d 11h 31m 0s"
  },
  {
    "ms": 1564660010,
    "includeMS": true,
    "human": true,
    "result": "18d 2h 37m"
  },
  {
    "ms": 1564660007,
    "includeMS": true,
    "human": false,
    "result": "18d 2h 37m 40s 7ms"
  },
  {
    "ms": 61001,
    "includeMS": true,
    "human": false,
    "result": "1m 1s 1ms"
  },
  {
    "ms": 61550,
    "includeMS": false,
    "human": false,
    "result": "1m 1s"
  },
  {
    "ms": 1,
    "includeMS": false,
    "human": false,
    "result": "1s"
  },
  {
    "ms": 0,
    "includeMS": false,
    "human": false,
    "result": "0s"
  }
];


it('FSIServerClient.FORMAT_TIME_PERIOD should return a human readable time period based on a given number of ms', function () {
  for (const item of cases) {
    const result = client.formatTimePeriod(item.ms, item.includeMS, item.human);

    expect(result).to.equal(item.result);
  }
});

