import { processQuestion } from "./ai-handler";
import { getResponseContent, registerMarkdownResponse } from "./markdown-loader";

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
    },
    {
        name: "register",
        description: "Register a message as a markdown response",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "id",
                description: "ID unique for the response",
                type: 3, // String type
                required: true
            },
            {
                name: "message_id",
                description: "ID of the message to register",
                type: 3, // String type
                required: true
            },
            {
                name: "name",
                description: "Display name for the response",
                type: 3, // String type
                required: false
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
export async function executeCommand(commandName: string, options?: any, interaction?: any): Promise<string | null> {
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

        case "register": {
            if (!options?.id || !options?.message_id) {
                return "Vous devez fournir un ID et un message_id!";
            }

            // Vérifier que l'utilisateur a les droits d'administrateur
            const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
            if (!hasAdminPermission) {
                return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
            }

            try {
                // Récupérer le message via l'API Discord
                const channelId = interaction.channel_id;
                const messageId = options.message_id;
                const token = process.env.DISCORD_BOT_TOKEN;

                if (!token) {
                    return "Token Discord non disponible.";
                }

                // Récupérer le message depuis l'API Discord
                const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
                    headers: {
                        Authorization: `Bot ${token}`
                    }
                });

                if (!messageResponse.ok) {
                    return `Erreur lors de la récupération du message: ${messageResponse.status} ${messageResponse.statusText}`;
                }

                const message = await messageResponse.json();
                const content = message.content;

                if (!content) {
                    return "Le message ne contient pas de texte.";
                }

                // Enregistrer la réponse markdown
                const success = await registerMarkdownResponse(options.id, content, options.name || options.id);

                if (success) {
                    return `La réponse "${options.id}" a été enregistrée avec succès!`;
                }

                return "Erreur lors de l'enregistrement de la réponse.";
            } catch (error) {
                console.error("Erreur lors de l'enregistrement:", error);
                return "Une erreur est survenue lors de l'enregistrement.";
            }
        }

        default:
            return null;
    }
}
