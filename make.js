require('shelljs/make');
const path = require('path');
const os = require("os");
const isWin32 = os.platform() === "win32";

const rp = function (relPath) {
    return path.join(__dirname, relPath);
};

const safePath = function(path){

    if (isWin32 && path.match(/\s/)) path = '"' + path + '"';

    return path;
};

const buildPath = path.join(__dirname, 'dist');

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
