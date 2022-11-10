import {expect} from 'chai';
import {APITemplateSupplier} from "library/APITemplateSupplier";

const tsp: APITemplateSupplier = new APITemplateSupplier();


it('APITemplateSupplier.getThousandSeparator should return ","', function () {
  expect(tsp.getThousandSeparator()).equals(",");
});

it('APITemplateSupplier.getDecimalSeparator should return "."', function () {
  expect(tsp.getDecimalSeparator()).equals(".");
});
