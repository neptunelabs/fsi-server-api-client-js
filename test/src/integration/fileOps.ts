import {expect} from 'chai'
import axios from 'axios'
import {default as nock} from 'nock'
import {FSIServerClient, LogLevel} from "library/index";
import {default as data} from "./reImportData.json"
import urlSearchParams from "@ungap/url-search-params";




const host = 'http://fsi.fake.tld';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.error);

axios.defaults.adapter = require('axios/lib/adapters/http')

const paths = [
    "images%2Fa.jpg",
    "images%2F%C3%A4%20%C3%B6%20%C3%BC.jpg"
]

const dataReply = {
    "statuscode":200
}

const nockLists = (): void => {
    // list
    nock(host)
        .get(data.listURL1)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, data.listReply1);

    // list
    nock(host)
        .get(data.listURL2)
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, data.listReply2);
};



const nockDeleteReplies = (): void => {
    for (const path of paths){
        nock(host)
            .delete("/fsi/service/file/" + path)
            .matchHeader('accept', 'application/json')
            .matchHeader("user-agent", "FSI Server API Client")
            .reply(200, dataReply);

    }
};


it('queue.batchDelete()', () => {


    // setup replies
    nockLists();
    nockDeleteReplies();

    const queue = client.createQueue();
    queue.listServer("images/", {"recursive":true});
    queue.logBatchContentSummary();
    queue.batchDelete();

    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.deleteFile()', () => {


    // setup replies
    nockLists();
    nockDeleteReplies();

    const queue = client.createQueue();
    queue.deleteFile("images/a.jpg");
    queue.deleteFile("images/ä ö ü.jpg");

    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});

it('queue.createDirectory()', () => {


    // setup replies
    nock(host)
        .put("/fsi/service/directory/images%2Ffoo")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    const queue = client.createQueue();
    queue.createDirectory("images/foo");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.deleteDirectory()', () => {


    // setup replies
    nock(host)
        .delete("/fsi/service/directory/images%2Ffoo%2F")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    const queue = client.createQueue();
    queue.deleteDirectory("images/foo");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.copyDirectory()', () => {


    // setup replies
    nockLists();

    nock(host)
        .put("/fsi/service/directory/images%2Fbar%20test%2Fimages")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    nock(host)
        .post("/fsi/service/file/images%2Fa.jpg", "cmd=copy&to=images%2Fbar+test%2Fimages%2Fa.jpg")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded;charset=utf-8')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    nock(host)
        .post("/fsi/service/file/images%2F%C3%A4%20%C3%B6%20%C3%BC.jpg", "cmd=copy&to=images%2Fbar+test%2Fimages%2F%C3%A4+%C3%B6+%C3%BC.jpg")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded;charset=utf-8')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    const queue = client.createQueue();
    queue.copyDirectory("images/", "images/bar test");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.copyDirectoryContent()', () => {


    // setup replies
    nockLists();

    nock(host)
        .put("/fsi/service/directory/images%2Fbar%20test")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    nock(host)
        .post("/fsi/service/file/images%2Fa.jpg", "cmd=copy&to=images%2Fbar+test%2Fa.jpg")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded;charset=utf-8')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    nock(host)
        .post("/fsi/service/file/images%2F%C3%A4%20%C3%B6%20%C3%BC.jpg", "cmd=copy&to=images%2Fbar+test%2F%C3%A4+%C3%B6+%C3%BC.jpg")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded;charset=utf-8')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    const queue = client.createQueue();
    queue.copyDirectoryContent("images/", "images/bar test");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.copyFile()', () => {

    // setup replies
    nock(host)
        .post("/fsi/service/file/images%2Fa.jpg", "cmd=copy&to=images%2Fb.jpg")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded;charset=utf-8')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);


    const queue = client.createQueue();
    queue.copyFile("images/a.jpg", "images/b.jpg");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.moveFile()', () => {

    // setup replies
    nock(host)
        .post("/fsi/service/file/images%2Fa.jpg", "cmd=move&to=images%2Fb.jpg")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded;charset=utf-8')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);


    const queue = client.createQueue();
    queue.moveFile("images/a.jpg", "images/b.jpg");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.moveDirectory()', () => {

    // setup replies
    nock(host)
        .post("/fsi/service/directory/images%2F", "cmd=move&to=imagesNew%2F")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded;charset=utf-8')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);


    const queue = client.createQueue();
    queue.moveDirectory("images", "imagesNew");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});


it('queue.addDirectoryContent()', () => {

    nockLists();

    // setup replies
    nock(host)
        .get("/fsi/server?type=info&renderer=noredirect&source=images&tpl=info.json")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200,
            {
                "src":"images",
                "lastmodified":"1589296860197",
                "_":1
            }
        );

    nock(host)
        .get("/fsi/server?type=list&tpl=interface_thumbview_default.json&items=images&source=%2F")
        .matchHeader('accept', 'application/json')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200,
            {"summary":{"dir":"/","entryCount":1,"imageCount":0,"directoryCount":1,"completeCount":0,"lastModified":1580489241921},
                "entries" : [{"id":"1","src":"images","size":"0","lastmodified":"1589296860197","sub":"74","images":"0","type":"directory","connectorType":"STORAGE"},
                    {}]}
        );

    const queue = client.createQueue();
    queue.addEntries(["images"]);
    queue.addDirectoryContent();


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);

            const batchContent = queue.getCurrentBatchContent();
            expect(batchContent).to.be.a("object");
            if (batchContent) {
                expect(batchContent.entries).to.have.lengthOf(3);

                const info = batchContent.clientInfo;
                expect(info.directoryCount).equals(1);
                expect(info.fileCount).equals(2);
                expect(info.entryCount).equals(3);
                expect(info.totalSize).equals(3365);
            }


        })
        .finally( ()  => {
            nock.cleanAll();
        });

});

it('queue.sendJobCommand()', () => {

    // setup replies
    nock(host)
        .post("/fsi/service/file/images%2Fa.jpg", "cmd=copy&to=images%2Fb.jpg")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    nock(host)
        .post("/fsi/service/jobqueue", "cmd=restart&id=12345")
        .matchHeader('accept', 'application/json')
        .matchHeader('content-type', 'application/x-www-form-urlencoded')
        .matchHeader("user-agent", "FSI Server API Client")
        .reply(200, dataReply);

    const query: urlSearchParams = new urlSearchParams();
    query.set("cmd", "copy");
    query.set("to", "images/b.jpg");

    const queue = client.createQueue();
    queue.sendServiceCommand("images/a.jpg", "file", query.toString());
    queue.sendServiceCommand("12345", "jobQueue", "cmd=restart");


    return queue.run()
        .then( (result) => {
            expect(result).equals(true);
        })
        .finally( ()  => {
            nock.cleanAll();
        });

});

it('queue.addItemsFromDataTransferItemList()', () => {
    const queue = client.createQueue();
    expect(queue.addItemsFromDataTransferItemList).to.be.a("function");
});
