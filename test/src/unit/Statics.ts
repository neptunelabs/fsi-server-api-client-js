import {expect} from 'chai';
import {FSIServerClient, ImportStatus} from "library/index";
import {IArchiveType} from "library/utils/IArchiveType";

const client = new FSIServerClient('http://fsi.fake.tld');


it('ListServer.ImportStatus should return valid status values', function () {

  expect(ImportStatus.none).to.equal(0);
  expect(ImportStatus.imported).to.equal(1);
  expect(ImportStatus.queued).to.equal(2);
  expect(ImportStatus.error).to.equal(3);
  expect(ImportStatus.reimport).to.equal(4);
  expect(ImportStatus.flat).to.equal(5);

});


it('check client static properties and public functions', function () {

  expect(client.lookupMimeType("../foo/bar.next.JPG")).to.equal("image/jpeg");
  expect(FSIServerClient.ImportStatus).to.deep.equal(ImportStatus);
  expect(FSIServerClient.ArchiveType).to.deep.equal(IArchiveType);
  expect(FSIServerClient.ArchiveType["zip"]).equals("zip");
  expect(FSIServerClient.ArchiveType["tar.gz"]).equals("tar.gz");
  expect(FSIServerClient.ArchiveType["tar.bz2"]).equals("tar.bz2");
  expect(FSIServerClient.defaultPrompt).to.be.a("object");
  expect(FSIServerClient.defaultPrompt).to.have.property("ctx");
  expect(FSIServerClient.defaultPrompt).to.have.property("fn");

  expect(FSIServerClient.connectorTypesAll).to.equal("*");
  expect(FSIServerClient.connectorTypesDefault).to.have.ordered.members(["STORAGE", "MULTIRESOLUTION", "STATIC"]);
  expect(FSIServerClient.connectorTypesImage).to.have.ordered.members(["STORAGE", "MULTIRESOLUTION"]);

  const arFunctions = [
    client.setProgressFunction,
    client.setPromptFunction,
    client.getLogLevel,
    client.setTranslations
  ];

  for (const item of arFunctions) {
    expect(item).to.be.a("function");
  }

  expect(client.getServerBaseURL()).to.equal('http://fsi.fake.tld/fsi/server');

  client.setSessionCookie("foo");
  expect(client.getSessionCookie()).to.equal("foo");

  expect(client.isAbortError(new Error("foo"))).equals(false);

  client.hash("foo bar").then((result) => {
    expect(result).equals("fbc1a9f858ea9e177916964bd88c3d37b91a1e84412765e29950777f265c4b75");
  })


});


it('APIAbortController.reset()', function () {

  const abortController = client.getNewAbortController();
  abortController.abort();
  expect(abortController.getAborted()).to.equal(true);
  abortController.reset();
  expect(abortController.getAborted()).to.equal(false);
});
