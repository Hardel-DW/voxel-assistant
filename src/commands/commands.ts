import { handleAsk } from "./handlers/ask";
import { handleContent } from "./handlers/content";
import { handleFoo } from "./handlers/foo";
import { handleInfos } from "./handlers/infos";
import { handleKeywords } from "./handlers/keywords";
import { handleLinks } from "./handlers/links";
import { handleRegenerateEmbeddings as handleReload } from "./handlers/regenerate_embeddings";
import { ApplicationCommandType, type Command, type CommandHandler } from "./types";

/**
 * Liste des commandes disponibles
 */
export const COMMANDS: Command[] = [
    {
        name: "foo",
        description: "Responds with Hello World",
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
        name: "content",
        description: "Gérer le contenu des réponses",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "add",
                description: "Ajouter une nouvelle réponse depuis un message",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "id",
                        description: "ID unique pour la réponse",
                        type: 3, // String type
                        required: true
                    },
                    {
                        name: "message_id",
                        description: "ID du message à enregistrer",
                        type: 3, // String type
                        required: true
                    },
                    {
                        name: "name",
                        description: "Nom d'affichage pour la réponse",
                        type: 3, // String type
                        required: false
                    },
                    {
                        name: "keywords",
                        description: "Mots-clés pour la recherche (séparés par des virgules)",
                        type: 3, // String type
                        required: false
                    }
                ]
            },
            {
                name: "view",
                description: "Voir le contenu d'une réponse spécifique",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "id",
                        description: "ID du contenu à afficher",
                        type: 3, // String type
                        required: true
                    }
                ]
            },
            {
                name: "list",
                description: "Lister tous les IDs enregistrés",
                type: 1 // Sous-commande
            },
            {
                name: "remove",
                description: "Supprimer un contenu",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "id",
                        description: "ID du contenu à supprimer",
                        type: 3, // String type
                        required: true
                    }
                ]
            }
        ]
    },
    {
        name: "reload",
        description: "Reload and regenerate embeddings for all stored content",
        type: ApplicationCommandType.CHAT_INPUT
    },
    {
        name: "infos",
        description: "Display information about all available commands",
        type: ApplicationCommandType.CHAT_INPUT
    },
    {
        name: "keywords",
        description: "Gérer les mots-clés des réponses",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "add",
                description: "Ajouter des mots-clés à une réponse existante",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "id",
                        description: "ID de la réponse",
                        type: 3, // String type
                        required: true
                    },
                    {
                        name: "keywords",
                        description: "Mots-clés à ajouter (séparés par des virgules)",
                        type: 3, // String type
                        required: true
                    }
                ]
            },
            {
                name: "remove",
                description: "Supprimer des mots-clés d'une réponse existante",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "id",
                        description: "ID de la réponse",
                        type: 3, // String type
                        required: true
                    },
                    {
                        name: "keywords",
                        description: "Mots-clés à supprimer (séparés par des virgules, vide pour tous supprimer)",
                        type: 3, // String type
                        required: false
                    }
                ]
            },
            {
                name: "view",
                description: "Voir les mots-clés d'une réponse",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "id",
                        description: "ID de la réponse",
                        type: 3, // String type
                        required: true
                    }
                ]
            }
        ]
    },
    {
        name: "links",
        description: "Gérer les liens entre articles",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "add",
                description: "Ajouter un lien de recommandation",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "target_id",
                        description: "ID de l'article cible",
                        type: 3, // String type
                        required: true
                    },
                    {
                        name: "recommended_id",
                        description: "ID de l'article recommandé",
                        type: 3, // String type
                        required: true
                    }
                ]
            },
            {
                name: "remove",
                description: "Supprimer un lien de recommandation",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "target_id",
                        description: "ID de l'article cible",
                        type: 3, // String type
                        required: true
                    },
                    {
                        name: "recommended_id",
                        description: "ID de l'article recommandé (vide pour supprimer tous les liens)",
                        type: 3, // String type
                        required: false
                    }
                ]
            },
            {
                name: "view",
                description: "Voir les liens de recommandation d'un article",
                type: 1, // Sous-commande
                options: [
                    {
                        name: "target_id",
                        description: "ID de l'article cible",
                        type: 3, // String type
                        required: true
                    }
                ]
            }
        ]
    }
];

// Table de mapping des commandes à leurs handlers
const commandHandlers: Record<string, CommandHandler> = {
    foo: handleFoo,
    ask: handleAsk,
    infos: handleInfos,
    reload: handleReload,
    content: handleContent,
    keywords: handleKeywords,
    links: handleLinks
};

/**
 * Exécute la commande spécifiée
 * @param commandName Nom de la commande à exécuter
 * @param options Options passées à la commande
 * @param interaction Objet d'interaction Discord
 * @param env Variables d'environnement de Cloudflare Workers
 * @returns Contenu de la réponse ou null si la commande n'existe pas
 */
export async function executeCommand(commandName: string, options?: any, interaction?: any, env?: any): Promise<string | null> {
    const handler = commandHandlers[commandName];

    if (!handler) {
        return null; // Commande non trouvée
    }

    return await handler(options, interaction, env);
}
