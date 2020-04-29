/*
    SAMPLE
    -----------------------------------------------------
    changing the password of a user
 */

// PLEASE NOTE: you need to enter the FSI Server credentials in this file
import {ServerVars} from "./ServerVars";
const serverVars = new ServerVars();

import {FSIServerClient, LogLevel} from "@neptunelabs/fsi-server-api-client";

const client = new FSIServerClient(serverVars.host);
client.setLogLevel(LogLevel.trace);


const queue = client.createQueue({continueOnError:true});

// start session
queue.login(serverVars.userName, serverVars.passWord);

const newPassWord = serverVars.passWord; // set desired password here

// change the password to newPassWord
queue.changePassword(serverVars.passWord, newPassWord);

// close session
queue.logout();

// run the queued commands
queue.runWithResult();
