/**
 * Definition of types for Discord commands
 */
export enum ApplicationCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3
}

export enum InteractionResponseType {
    PONG = 1,
    CHANNEL_MESSAGE_WITH_SOURCE = 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
    DEFERRED_UPDATE_MESSAGE = 6,
    UPDATE_MESSAGE = 7,
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
    MODAL = 9,
    PREMIUM_REQUIRED = 10
}

export interface CommandOption {
    name: string;
    description: string;
    type: number;
    required?: boolean;
    choices?: { name: string; value: string }[];
}

export interface Command {
    name: string;
    description: string;
    type: ApplicationCommandType;
    options?: CommandOption[];
}

/**
 * List of available slash commands
 */
export const COMMANDS: Command[] = [
    {
        name: "foo",
        description: "Responds with Hello World",
        type: ApplicationCommandType.CHAT_INPUT
    },
    {
        name: "help",
        description: "Displays the list of keywords recognized by the bot",
        type: ApplicationCommandType.CHAT_INPUT
    },
    {
        name: "info",
        description: "Displays information about the bot",
        type: ApplicationCommandType.CHAT_INPUT
    }
];

/**
 * Command handler
 * @param commandName Name of the command to execute
 * @returns Response content or null if the command doesn't exist
 */
export function executeCommand(commandName: string): string | null {
    switch (commandName) {
        case "foo":
            return "Hello World";

        case "help":
            return `**Keywords recognized by the bot:**
- help, need help: To get assistance
- hello, hi, hey: To greet me
- thanks, thank you: To thank me
- "what is", "what's": To ask questions about what I am
- "how does it work": To learn how I function
- code, github, source: For info about my source code
- who are you, your name: To learn more about me
- problem, error, bug: To report an issue`;

        case "info":
            return `**Discord Bot - Voxel Assistant**
Version: 1.0.0
Technology: TypeScript, Cloudflare Workers
Features: Slash commands and keyword detection`;

        default:
            return null;
    }
}
