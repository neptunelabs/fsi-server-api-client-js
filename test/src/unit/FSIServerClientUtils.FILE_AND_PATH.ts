import {expect} from "chai";
import {FSIServerClientUtils} from "library/index";





const cases = [
    {
        "src": "/foo/bar/test.jpg",
        "result": {
            path: 'foo/bar/',
            dir: 'test.jpg'
        }
    },
    {
        "src": "/foo/bar//test.jpg",
        "result": {
            path: 'foo/bar/',
            dir: 'test.jpg'
        }
    },
    {
        "src": "test.jpg",
        "result": {
            path: '',
            dir: 'test.jpg'
        }
    },
    {
        "src": "//foo/bar",
        "result": {
            path: 'foo/',
            dir: 'bar'
        }
    },
    {
        "src": "/images/请收藏我们的网址",
        "result": {
            path: 'images/',
            dir: '请收藏我们的网址'
        }
    },
    {
        "src": "foo/bar.jpg/",
        "result": {
            path: 'foo/',
            dir: 'bar.jpg',
            error: {
                isError: true,
                key: 'noValidFile'
            },
            errorContent: [ 'foo/' ]
        }
    },
    {
        "src": "/foo",
        "result": {
            path: '',
            dir: 'foo',
            error: {
                isError: true,
                key: 'invalidPath',
                template: ""
            },
            errorContent: [ '' ]
        }

    },
    {
        "src": "/foo/bar/test.jpg/",
        "result": {
            path: 'foo/bar/',
            dir: 'test.jpg',
            error: {
                isError: true,
                key: 'noValidFile',
                template: ""
            }
        }
    }




];


it('FSIServerClientUtils.FILE_AND_PATH should return the path and a file name', function() {

    for (const item of cases) {
        const result = FSIServerClientUtils.FILE_AND_PATH(item.src);

        if (item.result && item.result.error && result.error && result.error.template) {
            item.result.error.template = result.error.template;
        }
        expect(result).to.be.an('object').that.deep.include(item.result);
    }
});


