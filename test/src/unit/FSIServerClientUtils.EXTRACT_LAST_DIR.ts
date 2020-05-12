import {expect} from 'chai';
import {FSIServerClientUtils} from "library/FSIServerClientUtils";


const cases = [
    {
        "src": "/foo/bar/test/",
        "result": {
            path: 'foo/bar/',
            dir: 'test'
        }
    },
    {
        "src": "/foo/bar/test",
        "result": {
            path: 'foo/bar/',
            dir: 'test'
        }
    },
    {
        "src": "/foo//bar/test",
        "result": {
            path: 'foo/bar/',
            dir: 'test'
        }
    },
    {
        "src": "foo/bar/test//",
        "result": {
            path: 'foo/bar/',
            dir: 'test'
        }
    },
    {
        "src": "foo/bar/test",
        "result": {
            path: 'foo/bar/',
            dir: 'test'
        }
    },
    {
        "src": "foo/bar/test/",
        "result": {
            path: 'foo/bar/',
            dir: 'test'
        }
    },
    {
        "src": "foo",
        "result": {
            path: '',
            dir: 'foo'
        }
    },
    {
        "src": "",
        "result": {
            path: '',
            dir: ''
        }
    },
    {
        "src": "/images/请收藏我们的网址/",
        "result": {
            path: 'images/',
            dir: '请收藏我们的网址'
        }
    }


];




it('FSIServerClientUtils.EXTRACT_LAST_DIR should return the last directory of a path', function() {
    for (const item of cases) {
        const result = FSIServerClientUtils.FILE_AND_PATH(item.src);
        if (result.error && result.error.template) delete result.error.template;

        expect(result).to.deep.include(item.result);
    }
});

