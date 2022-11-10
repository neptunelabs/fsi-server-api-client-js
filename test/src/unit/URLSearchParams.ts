import {expect} from "chai";
import URLSearchParams from "@ungap/url-search-params";

const query = "foo=bar&ampersant=%26&quote=%22&questionmark=%3F";

it('URLSearchParams.set() should build an encoded HTTP query', function () {

  const usp = new URLSearchParams();
  usp.set("foo", "bar");
  usp.set("ampersant", "&");
  usp.set("quote", '"');
  usp.set("questionmark", '?');

  const result = usp.toString();

  expect(result).to.equal(query);
});


it('URLSearchParams.get() should get values from an encoded HTTP query', function () {

  const usp = new URLSearchParams(query);

  expect(usp.get("foo")).to.equal("bar");
  expect(usp.get("ampersant")).to.equal("&");
  expect(usp.get("quote")).to.equal('"');
  expect(usp.get("questionmark")).to.equal('?');
});
