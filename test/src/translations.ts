import {expect} from 'chai';
import 'mocha';
import {FSIServerClient} from "library/index";
import {german} from "library/languages";

describe('FSI Server Client, translation test', () => {

  it('german', () => {
    expect(FSIServerClient.VALIDATE_TRANSLATION(german)).to.equal(true);
  });

  /*
  it('french', () => {
    expect(FSIServerClient.validateTranslation(french)).to.equal(true);
  });
   */

});
