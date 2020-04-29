export class ServerVars  {

    // PLEASE ENTER THE HOST,CREDENTIALS AND PATHS FOR THE API SAMPLES HERE

    // FSI Server
    public readonly host: string = "";                   // example: https://fsi.example.tld
    public readonly userName: string = "";               // example: admin
    public readonly passWord: string = "";               // example: admin


    public readonly tempDirRoot: string = "/images/";
    public readonly sampleConnector: string = "/sample-images/";
    public readonly sampleImagesDirectory: string = "/sample-images/Collection/";

    // local
    public readonly localTargetDirectory: string = "";   // example: c://temp
    public readonly localImageDirectory: string = "";    // example: c://images


    public getTempDir(): string{
        return this.tempDirRoot + "ApiTEMP_" + new Date().getTime() + "_" + Math.round(1000000 * Math.random());
    }

    constructor(){

        if (!this.host) this.throwRequiredVar("the FSI Server host")
        if (!this.userName) this.throwRequiredVar("a valid user name");
        if (!this.passWord) this.throwRequiredVar("a valid password");
    }


    public throwRequiredVar(what: string): void{
        throw new Error("Please specify " + what + " in the file \"samples/src/ServerVars.ts\" before running this sample!");
    }
}