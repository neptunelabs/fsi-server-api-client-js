export interface IPromptOptions {
    readonly buttons: string[],
    buttonLabels: string[],
    validAnswers: { [key: string]: string },
    validReplies: { [key: string]: string }
}
