require('shelljs/make');
const path = require('path');
var os = require("os");
const isWin32 = os.platform() === "win32";

const rp = function (relPath) {
    return path.join(__dirname, relPath);
};


const safePath = function(path){

    if (isWin32 && path.match(/\s/)) path = '"' + path + '"';

    return path;
};

const buildPath = path.join(__dirname, 'dist');
const testPath = path.join(__dirname, 'test');

const run = function (cl) {
    try {
        console.log('> ' + cl);
        const rc = exec(cl).code;
        if (rc !== 0) {
            echo('Exec failed with rc ' + rc);
            exit(rc);
        }
    } catch (err) {
        echo(err.message);
        exit(1);
    }
};

target.clean = function () {
    rm('-Rf', buildPath);
};

target.build = function () {
    run(safePath(path.join(__dirname, 'node_modules/.bin/tsc')) + ' --outDir ' + safePath(buildPath));

    cp(rp('LICENSE'), buildPath);
    cp(rp('package.json'), buildPath);
    cp(rp('package-lock.json'), buildPath);
    cp(rp('README.md'), buildPath);
};

target.units = function() {
    // install the just built lib into the test proj
    pushd('test');
    run('npm install ../_build');
    popd();

    console.log("-------Unit Tests-------");
    run('tsc -p ./test/units');
    run('mocha test/units');
};

target.test = function() {
    // install the just built lib into the test proj
    target.units();

    console.log("-------Integration Tests-------");
    run('tsc -p ./test/tests');
    run('mocha test/tests');
};

//Deprecated since we automatically build in units before testing, keeping for back compat
target.buildtest = function() {
    target.test();
};

target.samples = function () {
    pushd('samples');
    run('npm install ../_build');
    run('tsc');
    run('node samples.js');
    run('npm install');
    run('npm run react');
    popd();
    console.log('done');
};

target.validate = function() {
    target.test();
    target.samples();
};
