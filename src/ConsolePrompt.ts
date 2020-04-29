import * as readline from "readline";
import {IPromptOptions} from "./utils/IPromptOptions";

export class ConsolePrompt {

    public static GET(question: string, options: IPromptOptions): Promise<string> {

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // tslint:disable-next-line:promise-must-complete
        return new Promise<string>(async (resolve) => {

            const answers: string[] = options.buttonLabels;
            const replyString: string = "(" + answers.join("|") + "):";
            question = question + " " + replyString;


            const doPrompt = async (): Promise<void> => {

                rl.question(question, (input) => {
                    const res: string | undefined = options.validAnswers[input.toLowerCase()];

                    if (res === undefined) {
                        console.log("\"" + input + "\" is not a valid option. Use: " + replyString);
                        return doPrompt();
                    } else {
                        rl.close();
                        return resolve(res);
                    }


                });
            };

            await doPrompt();
        });
    }
}
