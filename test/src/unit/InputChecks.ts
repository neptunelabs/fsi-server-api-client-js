import {expect} from 'chai';
import {InputChecks} from "library/InputChecks";


it('InputChecks.IS_STRING', function() {
    expect(function(){InputChecks.IS_STRING(undefined, "stringArg")}).to.throw("Expected argument 'stringArg' to be of type 'string', but received type 'undefined'");
    expect(function(){InputChecks.IS_STRING(123, "stringArg")}).to.throw("Expected argument 'stringArg' to be of type 'string', but received type 'number'");
    expect(function(){InputChecks.IS_STRING("abc", "stringArg")}).to.not.throw();
});


it('InputChecks.IS_STRING_NOT_EMPTY', function() {
    expect(function(){InputChecks.IS_STRING_NOT_EMPTY(undefined, "stringArg")}).to.throw("Expected argument 'stringArg' to be of type 'string', but received type 'undefined'");

    expect(function(){InputChecks.IS_STRING_NOT_EMPTY("", "stringArg")}).to.throw("Argument 'stringArg' may not be an empty string.");

    expect(function(){InputChecks.IS_STRING_NOT_EMPTY("a", "stringArg")}).to.not.throw();
});

it('InputChecks.IS_OBJECT', function() {
    expect(function(){InputChecks.IS_OBJECT(undefined, "objArg")}).to.throw("Expected argument 'objArg' to be of type 'object', but received type 'undefined'");

    expect(function(){InputChecks.IS_OBJECT(null, "objArg")}).to.throw("Expected argument 'objArg' to be an object, but received 'null'");

    expect(function(){InputChecks.IS_OBJECT({}, "objArg")}).to.not.throw();
});

it('InputChecks.IS_FN', function() {
    expect(function(){InputChecks.IS_FN(undefined, "fnArg")}).to.throw("Expected argument 'fnArg' to be of type 'function', but received type 'undefined'");

    expect(function(){InputChecks.IS_FN(InputChecks.IS_FN, "fnArg")}).to.not.throw();
});

it('InputChecks.IS_ARRAY', function() {
    expect(function(){InputChecks.IS_ARRAY(undefined, "arrayArg")}).to.throw("Expected argument 'arrayArg' to be an array, but received type 'undefined'.");

    expect(function(){InputChecks.IS_ARRAY([], "arrayArg")}).to.not.throw();
    expect(function(){InputChecks.IS_ARRAY([1,2,3], "arrayArg")}).to.not.throw();
});


it('InputChecks.IS_ARRAY_NOT_EMPTY', function() {
    expect(function(){InputChecks.IS_ARRAY_NOT_EMPTY(undefined, "arrayArg")}).to.throw("Expected argument 'arrayArg' to be an array, but received type 'undefined'.");

    expect(function(){InputChecks.IS_ARRAY_NOT_EMPTY("abc", "arrayArg")}).to.throw("Expected argument 'arrayArg' to be an array, but received type 'string'.");

    expect(function(){InputChecks.IS_ARRAY_NOT_EMPTY([], "arrayArg")}).to.throw("Expected 'arrayArg' to be a non empty array.");

    expect(function(){InputChecks.IS_ARRAY_NOT_EMPTY([1], "arrayArg")}).to.not.throw();

    expect(function(){InputChecks.IS_ARRAY_NOT_EMPTY(["a","b","c"], "arrayArg")}).to.not.throw();
});


it('InputChecks.ARRAY_CONTAINS', function() {
    expect(function(){InputChecks.ARRAY_CONTAINS([1], "arrayArg", "string")}).to.throw("Argument 'arrayArg' may only contain elements of type 'string'.");

    expect(function(){InputChecks.ARRAY_CONTAINS(["a", 1, "c"], "arrayArg", "string")}).to.throw("Argument 'arrayArg' may only contain elements of type 'string'.");

    expect(function(){InputChecks.ARRAY_CONTAINS([], "arrayArg", "string")}).to.not.throw();

    expect(function(){InputChecks.ARRAY_CONTAINS(["a"], "arrayArg", "string")}).to.not.throw();

    expect(function(){InputChecks.ARRAY_CONTAINS(["foo", "bar"], "arrayArg", "string")}).to.not.throw();
});

it('InputChecks.PATH', function() {
    expect(function(){InputChecks.PATH(1, "pathArg")}).to.throw("Expected argument 'pathArg' to be of type 'string', but received type 'number'");

    expect(function(){InputChecks.PATH("", "pathArg")}).to.throw("Argument 'pathArg' may not be an empty string.");
});

it('InputChecks.FN_CTX_OR_UNDEFINED', function() {
    expect(function(){InputChecks.FN_CTX_OR_UNDEFINED(undefined, "pathArg")}).to.not.throw();

    expect(function(){InputChecks.FN_CTX_OR_UNDEFINED({}, "someArg")}).to.throw("Expected argument 'someArg.ctx' to be of type 'object', but received type 'undefined'");

    expect(function(){InputChecks.FN_CTX_OR_UNDEFINED({ctx:{}}, "someArg")}).to.throw("Expected argument 'someArg.fn' to be of type 'function', but received type 'undefined'");

    expect(function(){InputChecks.FN_CTX_OR_UNDEFINED({ctx:{}, fn: InputChecks.FN_CTX_OR_UNDEFINED}, "someArg")}).to.not.throw();

});

it('InputChecks.SERVICE_FD', function() {
    expect(function(){InputChecks.SERVICE_FD("foo")}).to.throw("Expected 'service' to be either 'file' or 'directory', but received 'foo'.");
    expect(function(){InputChecks.SERVICE_FD("file")}).to.not.throw();
    expect(function(){InputChecks.SERVICE_FD("directory")}).to.not.throw();
});

it('InputChecks.notEmptyTwoTypes', function() {
    expect(function(){InputChecks.NotEmptyTwoTypes(undefined, "someArg", "string", "number")}).to.throw("Argument 'someArg' empty or missing.");
    expect(function(){InputChecks.NotEmptyTwoTypes({}, "someArg", "string", "number")}).to.throw("Expected 'someArg' to be of type 'string' or 'number', but received 'object'.");

    expect(function(){InputChecks.NotEmptyTwoTypes("foo", "someArg", "string", "number")}).to.not.throw();
    expect(function(){InputChecks.NotEmptyTwoTypes(123, "someArg", "string", "number")}).to.not.throw();

});

it('InputChecks.STRING_ARRAY_OR_EMPTY_ARRAY', function() {
    expect(function(){InputChecks.STRING_ARRAY_OR_EMPTY_ARRAY([1,2,3], "someArg")}).to.throw("Argument 'someArg' may only contain elements of type 'string'");

    expect(function(){InputChecks.STRING_ARRAY_OR_EMPTY_ARRAY([], "someArg")}).to.not.throw();

    expect(function(){InputChecks.STRING_ARRAY_OR_EMPTY_ARRAY(["a","b","c"], "someArg")}).to.not.throw();


});






