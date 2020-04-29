import {expect} from 'chai';
import 'mocha';


// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "../../samples/src/ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, IHTTPOptions, IUploadOptions, LogLevel} from "@neptunelabs/fsi-server-api-client";

const myFiles: string[] = ["a.jpg", "ä ö ü.jpg"];
const host = serverVars.host;
const basePath = serverVars.getTempDir() + "/optest/";
const uploadPath = basePath + "test/";
const resourcePath = './files/';
const client = new FSIServerClient(host);
client.setLogLevel(LogLevel.warn);
const opts: IHTTPOptions = {abortController: client.getNewAbortController()};
const uOpts: IUploadOptions = {abortController: opts.abortController, overwriteExisting: true};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('FSI Server Client interface test', () => {

    it('setMaxRecursiveDepth()', async () => {
        const result = client.setMaxRecursiveDepth(300);
        expect(result).to.equal(300);
    });

    it('login()', async () => {
        const result = await client.login(serverVars.userName, serverVars.passWord, opts);
        expect(result.state).to.equal('success');
    });

    it('upload()', async () => {
        const result = await client.upload(resourcePath + "/ü ö ä/" + myFiles[0], uploadPath, uOpts);
        expect(result).to.equal(true);
    });

    it('upload()', async () => {
        const result = await client.upload(resourcePath + "ü ö ä/" + myFiles[1], uploadPath, uOpts);
        expect(result).to.equal(true);
    });

    it('check upload', async () => {
        const result = await client.directoryContains(basePath + "test/files/ü ö ä/", myFiles, undefined, opts);
        expect(result).to.equal(true);
    });

    it('reImportFile()', async () => {
        const result = await client.reImportFile(basePath + "test/files/ü ö ä/" + myFiles[1], true, true, opts);
        expect(result).to.equal(true);
    });

    it('setMetaData', async () => {
        const result = await client.setMetaData(basePath + "test/files/ü ö ä/" + myFiles[1],
            {iptc: {"Copyright Notice": "foo bar"}}, "file", opts);
        expect(result).to.equal(true);
    });

    it('getMetaData', async () => {
        const result = await client.getMetaData(basePath + "test/files/ü ö ä/" + myFiles[1], opts);
        expect(result).to.deep.include({iptc: {"Copyright Notice": "foo bar"}});
    });

    it('deleteMetaData', async () => {
        const result = await client.deleteMetaData(basePath + "test/files/ü ö ä/" + myFiles[1], {iptc: {"Copyright Notice": "foo bar"}}, "file", opts);
        expect(result).to.equal(true);
    });

    it('check deleteMetaData', async () => {
        const result = await client.getMetaData(basePath + "test/files/ü ö ä/" + myFiles[1], opts);
        expect(result).to.not.include({iptc: {"Copyright Notice": "foo bar"}});
    });

    it('reImportDir()', async () => {
        const result = await client.reImportDir(basePath + "test", true, true, opts);
        expect(result).to.equal(true);
    });

    it('createDir()', async () => {
        const result = await client.createDirectory(basePath + "test_move", opts);
        expect(result).to.equal(true);
    });

    it('copyDir()', async () => {
        const result = await client.copyDirectoryContent(basePath + "test", basePath + "test_move",
            {recursive: true, abortController: opts.abortController});
        expect(result).to.equal(true);
    });

    it('check copy', async () => {
        const result = await client.directoryContains(basePath + "test_move/files/ü ö ä/", myFiles, [], opts);
        expect(result).to.equal(true);
    });

    it('deleteDirectory()', async () => {
        const result = await client.deleteDirectory(basePath + "test", opts);
        expect(result).to.equal(true);
    });

    it('check deleteDirectory', async () => {
        const result = await client.directoryContains(basePath, [], ["test"], opts);
        expect(result).to.equal(false);
    });

    it('renameFile()', async () => {
        const result = await client.renameFile(basePath + "test_move/files/ü ö ä/a.jpg", basePath + "test_move/files/ü ö ä/abc.jpg", opts);
        expect(result).to.equal(true);
    });

    it('check renameFile', async () => {
        const result = await client.directoryContains(basePath + "test_move/files/ü ö ä", ["abc.jpg"], [], opts);
        expect(result).to.equal(true);
    });

    it('deleteFile()', async () => {
        const result = await client.deleteFile(basePath + "test_move/files/ü ö ä/abc.jpg", opts);
        expect(result).to.equal(true);
    });

    it('check deleteFile', async () => {
        const result = await client.directoryContains(basePath + "test_move/files/ü ö ä/", ["abc.jpg"], [], opts);
        expect(result).to.equal(false);
    });

    it('deleteDirectory()', async () => {
        const result = await client.deleteDirectory(basePath, opts);
        expect(result).to.equal(true);
    });

    it('check deleteDirectory', async () => {
        const result = await client.directoryContains(basePath, ["test_move"], [], opts);
        expect(result).to.equal(false);
    });

    it('logout()', async () => {
        const result = await client.logout(opts);
        expect(result).to.equal(true);
    });

});
