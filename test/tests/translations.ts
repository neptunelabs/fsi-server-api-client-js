import {expect} from 'chai';
import 'mocha';
import {FSIServerClient} from "@neptunelabs/fsi-server-api-client";
import {german} from "@neptunelabs/fsi-server-api-client/languages";

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
