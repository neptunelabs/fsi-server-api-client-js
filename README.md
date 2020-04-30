<div>
    <a href="https://github.com/neptunelabs/fsi-server-api-client-js">
        <img width="200" height="70" src="https://fsi-site.neptunelabs.com/fsi/static/assets/logos/fsi_server.svg" alt="FSI Server">
    </a>
</div>

# FSI Server API Client JS

API client for NeptuneLabs FSI Server

![Node.js CI](https://github.com/neptunelabs/fsi-server-api-client-js/workflows/Node.js%20CI/badge.svg)

## Table of Contents

-   [About](#about)
-   [How to install](#how-to-install)
-   [Concepts](#concepts)
    -   [Promise based API versus queue API](#Promise-based-API-versus-queue-API)    
-   [Getting started](#getting-started)
    -   [Basic examples](#Basic-Examples)
    -   [Running the samples](#Running-the-samples)
- [Documentation](../../wiki)

## About
FSI Server API Client JS offers developers a flexible interface to control the REST OpenAPI of FSI server.

Uploading, deleting, modifying, creating and managing files and directory structures, as well as complex tasks can be easily accomplished using this high level API client. The FSI Server web interface uses this API client to communicate with FSI Server. You can see the API in action on this [demo FSI Server](https://demo.fsi-server.com/fsi/interface/). 

### How to install

Install with npm:

```bash
npm install @neptunelabs/fsi-server-api-client
```

Install with yarn:

```bash
yarn add @neptunelabs/fsi-server-api-client
```
## Concepts

##### Promise based API versus queue API

There are two ways of using the API:
- a promise based API
- a queue API

Queueing command results in a far more readable code while using the promise-based API gives you more flexibility, but a deeply nested code.

Let's have a look at an example which just logs in and out of FSI Server:

##### Example: Promise based API

~~~javascript
const FSIServerClient = require("@neptunelabs/fsi-server-api-client");
const client = new FSIServerClient('https://my.fsi-server.tld');

client.login("user", "password")
  .then( () => {
    client.logout()
    .catch(console.error);
})
.catch(console.error);
~~~

##### Example: Queue API
~~~javascript
const FSIServerClient = require("@neptunelabs/fsi-server-api-client");
const client = new FSIServerClient('https://my.fsi-server.tld');

const queue = client.createQueue({continueOnError:false});
queue.login("user", "password");
queue.logout();

// the following line actually starts the execution
queue.runWithResult();
~~~

Besides the code style, the queue API simplifies working with many files, because you can run commands against all files selected by the queue.

## Getting started

### Basic Examples

##### Renaming all files in a folder
~~~javascript
const queue = client.createQueue({continueOnError:false});
queue.login("user", "password");

// recursively read all files and folder entries in images/foo
queue.listServer("images/foo", {recursive:true});
// recursively read all files and folder entries in images/bar
queue.listServer("images/bar", {recursive:true});

//rename each collected file
queue.batchRename( (entry) => {
  return (entry.type === "file")?"renamed_" + entry.src:entry.src;
});

queue.logout();
queue.runWithResult();
~~~

##### Downloading assets
~~~javascript
const queue = client.createQueue({continueOnError:false});
queue.login("user", "password");

queue.listServer("/path/to/images", {recursive:true});

queue.batchDownload("/target/path/", {
    flattenTargetPath:false,
    overwriteExisting:true
});

queue.logout();
queue.runWithResult();
~~~

##### Uploading assets
~~~javascript
const queue = client.createQueue({continueOnError:false});
queue.login("user", "password");

queue.listLocal("/local_path/to/images", {
    fnFileFilter: FSIServerClient.FN_FILE_FILTER_VALID_IMAGES,
    recursive:true
});

queue.batchUpload("/images/", {
    flattenTargetPath:false,
    overwriteExisting:true
});

queue.logout();
queue.runWithResult();
~~~

### Running the samples
- build the module by running these commands in the project root directory:

```bash
npm i
npm run build-mod
```

- go to <b>/samples/src</b> directory.<br/>
- edit the file <b>/samples/src/ServerVars.ts</b> and enter the host and credentials of the FSI Server instance to use.
- modify the local directories vars if you want to run the upload/download samples.<br/>
- run the following commands in the samples/src folder to compile the samples:
```bash
npm i
tsc
```
To run a samples type e.g.:
```bash
node readMetaData.js
```


Please refer to the wiki for a [complete documentation](../../wiki).
