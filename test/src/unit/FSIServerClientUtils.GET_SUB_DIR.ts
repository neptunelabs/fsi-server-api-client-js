import {expect} from "chai";
import {FSIServerClientUtils} from "library/index";

const cases = [
    {
        "base": "/foo/",
        "path": "/foo/bar/test/",
        "result": "bar/test/"
    },
    {
        "base": "/foo/bar/",
        "path": "/foo/bar/1/",
        "result": "1/"
    },
    {
        "base": "/foo/bar/",
        "path": "/foo/bar/",
        "result": ""
    },
    {
        "base": "/foo/bar/",
        "path": "/foo/",
        "result": ""
    },
    {
        "base": "/foo//bar//",
        "path": "//foo/",
        "result": ""
    },
    {
        "base": "/",
        "path": "",
        "result": ""
    }



];


it('FSIServerClientUtils.GET_SUB_DIR should return the path below a given base dir', function() {

    for (const item of cases) {
        const result = FSIServerClientUtils.GET_SUB_DIR(item.base, item.path);
        expect(result).to.be.a('string').that.equals(item.result);
    }
});


