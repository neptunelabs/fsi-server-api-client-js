import {expect} from "chai";
import {FSIServerClientUtils} from "library/index";

const cases = [
  {
    "base": "/foo/bar/test/",
    "path": "new/",
    "result": "foo/bar/new/"
  },
  {
    "base": "/foo/bar/test/",
    "path": "some/new/path",
    "result": "foo/bar/some/new/path/"
  },
  {
    "base": "foo",
    "path": "new",
    "result": "new/"
  }

  ,
  {
    "base": "/foo//bar",
    "path": "new//",
    "result": "foo/new/"
  }
];


it('FSIServerClientUtils.REPLACE_LAST_DIR should replace the last directory of a given path', function () {

  for (const item of cases) {
    const result = FSIServerClientUtils.REPLACE_LAST_DIR(item.base, item.path);


    expect(result).to.be.a('string').that.equals(item.result);
  }
});



