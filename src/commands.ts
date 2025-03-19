import { processQuestion } from "./ai-handler";
import { getResponseContent } from "./markdown-loader";

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
    },
    {
        name: "ask",
        description: "Ask a question to the bot",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "question",
                description: "The question you want to ask",
                type: 3, // String type
                required: true
            }
        ]
    }
];

/**
 * Command handler
 * @param commandName Name of the command to execute
 * @param options Options passées à la commande
 * @returns Response content or null if the command doesn't exist
 */
export async function executeCommand(commandName: string, options?: any): Promise<string | null> {
    switch (commandName) {
        case "foo":
            return "Hello World";

        case "help": {
            // Utiliser la réponse markdown d'aide
            return await getResponseContent("help");
        }

        case "info": {
            // Utiliser la réponse markdown d'à propos
            return await getResponseContent("about");
        }

        case "ask": {
            if (!options?.question) {
                return "Vous devez me poser une question!";
            }

            // Obtenir la question des options
            const question = options.question;

            // Utiliser notre système d'IA pour générer une réponse
            return await processQuestion(question);
        }

        default:
            return null;
    }
}
