import {expect} from 'chai';
import {FSIServerClientUtils} from "library/FSIServerClientUtils";


const cases = [
  {
    "src": 'C://foo/bar/',
    "result": "foo/bar/"
  },
  {
    "src": 'C://foo/bar',
    "result": "foo/bar/"
  },
  {
    "src": '//netshare/foo/bar',
    "result": "foo/bar/"
  },
  {
    "src": '//netshare',
    "result": "/"
  },
  {
    "src": '',
    "result": "/"
  }

];


it('FSIServerClientUtils.MAKE_RELATIVE_SERVER_PATH should return path of a local file location', function () {
  for (const item of cases) {
    const result = FSIServerClientUtils.MAKE_RELATIVE_PATH(item.src);

    expect(result).to.equal(item.result);
  }
});

