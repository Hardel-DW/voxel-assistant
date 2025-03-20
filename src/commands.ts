import { processQuestion } from "./ai-handler";
import {
    registerMarkdownResponse,
    getMarkdownResponses,
    getResponseContent,
    invalidateCache,
    addKeywordsToResponse,
    removeKeywordsFromResponse,
    addRecommendedLink,
    removeRecommendedLink,
    cleanupDeletedArticleLinks
} from "./markdown-loader";
import { generateEmbedding } from "./util/embeddings";

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
    options?: CommandOption[];
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
            },
            {
                name: "keywords",
                description: "Keywords for better search (comma separated)",
                type: 3, // String type
                required: false
            }
        ]
    },
    {
        name: "regenerate_embeddings",
        description: "Regenerate embeddings for all stored content",
        type: ApplicationCommandType.CHAT_INPUT
    },
    {
        name: "infos",
        description: "Display information about all available commands",
        type: ApplicationCommandType.CHAT_INPUT
    },
    {
        name: "list_ids",
        description: "List all IDs stored in the database",
        type: ApplicationCommandType.CHAT_INPUT
    },
    {
        name: "view_content",
        description: "View the markdown content of an element by its ID",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "id",
                description: "ID of the content to view",
                type: 3, // String type
                required: true
            }
        ]
    },
    {
        name: "delete",
        description: "Delete an element from the database by its ID",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "id",
                description: "ID of the content to delete",
                type: 3, // String type
                required: true
            }
        ]
    },
    {
        name: "add_keywords",
        description: "Add keywords to an existing response",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "id",
                description: "ID of the response",
                type: 3, // String type
                required: true
            },
            {
                name: "keywords",
                description: "Keywords to add (comma separated)",
                type: 3, // String type
                required: true
            }
        ]
    },
    {
        name: "remove_keywords",
        description: "Remove keywords from an existing response",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "id",
                description: "ID of the response",
                type: 3, // String type
                required: true
            },
            {
                name: "keywords",
                description: "Keywords to remove (comma separated, leave empty to remove all)",
                type: 3, // String type
                required: false
            }
        ]
    },
    {
        name: "view_keywords",
        description: "View keywords for a response",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "id",
                description: "ID of the response",
                type: 3, // String type
                required: true
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

/**
 * Command handler
 * @param commandName Name of the command to execute
 * @param options Options passées à la commande
 * @param interaction Objet d'interaction Discord
 * @param env Variables d'environnement de Cloudflare Workers
 * @returns Response content or null if the command doesn't exist
 */
export async function executeCommand(commandName: string, options?: any, interaction?: any, env?: any): Promise<string | null> {
    switch (commandName) {
        case "foo":
            return "Hello World";
        case "ask": {
            if (!options?.question) {
                return "Vous devez me poser une question!";
            }

            // Obtenir la question des options
            const question = options.question;

            // Utiliser notre système d'IA pour générer une réponse
            return await processQuestion(question, env);
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

                // Utiliser le token depuis l'objet env de Cloudflare Workers
                const token = env?.DISCORD_BOT_TOKEN;

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

                // Traiter les mots-clés s'ils sont fournis
                let keywords: string[] = [];
                if (options.keywords) {
                    keywords = options.keywords
                        .split(",")
                        .map((k: string) => k.trim())
                        .filter((k: string) => k.length > 0);
                }

                // Enregistrer la réponse markdown en passant l'objet env
                const success = await registerMarkdownResponse(options.id, content, options.name || options.id, keywords, env);

                if (success) {
                    let message = `La réponse "${options.id}" a été enregistrée avec succès!`;
                    if (keywords.length > 0) {
                        message += ` (${keywords.length} mots-clés ajoutés)`;
                    }
                    return message;
                }

                return "Erreur lors de l'enregistrement de la réponse.";
            } catch (error) {
                console.error("Erreur lors de l'enregistrement:", error);
                return "Une erreur est survenue lors de l'enregistrement.";
            }
        }

        case "regenerate_embeddings": {
            // Vérifier que l'utilisateur a les droits d'administrateur
            const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
            if (!hasAdminPermission) {
                return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
            }

            try {
                // Récupérer toutes les réponses
                const responses = await getMarkdownResponses(env);

                if (!env?.MARKDOWN_KV) {
                    return "KV store non disponible, impossible de regénérer les embeddings.";
                }

                let count = 0;
                const total = Object.keys(responses).length;

                // Traiter chaque réponse
                for (const [id, response] of Object.entries(responses)) {
                    try {
                        // Générer un nouvel embedding
                        const embedding = await generateEmbedding(response.content);

                        // Mettre à jour la réponse
                        const updatedResponse = {
                            ...response,
                            embedding
                        };

                        // Sauvegarder dans KV
                        await env.MARKDOWN_KV.put(id, JSON.stringify(updatedResponse));
                        count++;
                    } catch (error) {
                        console.error(`Erreur lors de la mise à jour de l'embedding pour ${id}:`, error);
                    }
                }

                return `Embeddings regénérés pour ${count}/${total} réponses.`;
            } catch (error) {
                console.error("Erreur lors de la regénération des embeddings:", error);
                return "Une erreur est survenue lors de la regénération des embeddings.";
            }
        }

        case "infos": {
            const commands = COMMANDS.map((cmd) => {
                let description = `**/${cmd.name}**: ${cmd.description}`;

                if (cmd.options && cmd.options.length > 0) {
                    const options = cmd.options
                        .map((opt) => {
                            const required = opt.required ? " (obligatoire)" : " (optionnel)";
                            return `  • \`${opt.name}\`: ${opt.description}${required}`;
                        })
                        .join("\n");

                    description += `\n${options}`;
                }

                return description;
            }).join("\n\n");

            return `# Commandes disponibles\n\n${commands}\n\n## Système de recherche sémantique\n\nCe bot utilise un système de recherche sémantique (RAG) pour trouver les réponses les plus pertinentes à vos questions. Les réponses sont automatiquement indexées avec des embeddings vectoriels pour une meilleure compréhension du contenu.`;
        }

        case "list_ids": {
            try {
                // Vérifier que l'utilisateur a les droits d'administrateur
                const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
                if (!hasAdminPermission) {
                    return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
                }

                // Récupérer toutes les réponses
                const responses = await getMarkdownResponses(env);

                if (Object.keys(responses).length === 0) {
                    return "Aucun contenu n'est enregistré dans la base de données.";
                }

                // Formater la liste des IDs avec leurs noms
                const idList = Object.entries(responses)
                    .map(([id, response]) => {
                        return `- **${id}**: ${response.name}`;
                    })
                    .join("\n");

                return `# Contenu enregistré\n\n${idList}`;
            } catch (error) {
                console.error("Erreur lors de la récupération des IDs:", error);
                return "Une erreur est survenue lors de la récupération des IDs.";
            }
        }

        case "view_content": {
            try {
                if (!options?.id) {
                    return "Vous devez fournir un ID valide.";
                }

                // Récupérer le contenu de la réponse
                const content = await getResponseContent(options.id, env);

                // Si c'est la réponse par défaut et que l'ID n'est pas "default", ça signifie que l'ID n'existe pas
                const responses = await getMarkdownResponses(env);
                if (content === responses.default?.content && options.id !== "default") {
                    return `Aucun contenu trouvé avec l'ID "${options.id}".`;
                }

                // Ajouter l'ID et le nom dans l'en-tête
                const response = responses[options.id];
                const header = `# ${response.name} (ID: ${options.id})\n\n`;

                // Limiter la longueur pour Discord (max 2000 caractères)
                let finalContent = `${header}${content}`;
                if (finalContent.length > 1950) {
                    finalContent = `${finalContent.substring(0, 1950)}...\n(Contenu tronqué)`;
                }

                return finalContent;
            } catch (error) {
                console.error("Erreur lors de la récupération du contenu:", error);
                return "Une erreur est survenue lors de la récupération du contenu.";
            }
        }

        case "delete": {
            try {
                // Vérifier que l'utilisateur a les droits d'administrateur
                const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
                if (!hasAdminPermission) {
                    return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
                }

                if (!options?.id) {
                    return "Vous devez fournir un ID valide.";
                }

                // Vérifier si l'élément existe
                const responses = await getMarkdownResponses(env);
                if (!responses[options.id]) {
                    return `Aucun contenu trouvé avec l'ID "${options.id}".`;
                }

                // Protection contre la suppression de la réponse par défaut
                if (options.id === "default") {
                    return "Vous ne pouvez pas supprimer la réponse par défaut.";
                }

                // Supprimer l'élément
                if (!env?.MARKDOWN_KV) {
                    return "KV store non disponible, impossible de supprimer l'élément.";
                }

                const deletedId = options.id;
                await env.MARKDOWN_KV.delete(deletedId);

                // Nettoyer les liens vers cet article dans les autres articles
                const updatedCount = await cleanupDeletedArticleLinks(deletedId, env);

                // Invalider le cache
                invalidateCache();

                let message = `✅ Élément "${deletedId}" supprimé avec succès.`;
                if (updatedCount > 0) {
                    message += `\n${updatedCount} article(s) qui référençaient cet élément ont été mis à jour.`;
                }

                return message;
            } catch (error) {
                console.error("Erreur lors de la suppression de l'élément:", error);
                return "Une erreur est survenue lors de la suppression de l'élément.";
            }
        }

        case "add_keywords": {
            try {
                // Vérifier que l'utilisateur a les droits d'administrateur
                const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
                if (!hasAdminPermission) {
                    return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
                }

                if (!options?.id || !options?.keywords) {
                    return "Vous devez fournir un ID et des mots-clés!";
                }

                // Traiter les mots-clés
                const keywords = options.keywords
                    .split(",")
                    .map((k: string) => k.trim())
                    .filter((k: string) => k.length > 0);

                if (keywords.length === 0) {
                    return "Vous devez fournir au moins un mot-clé valide!";
                }

                // Ajouter les mots-clés
                const result = await addKeywordsToResponse(options.id, keywords, env);

                if (result.success) {
                    return `${result.message}\nMots-clés actuels: ${result.currentKeywords?.join(", ") || "aucun"}`;
                }

                return `Erreur: ${result.message}`;
            } catch (error) {
                console.error("Erreur lors de l'ajout des mots-clés:", error);
                return "Une erreur est survenue lors de l'ajout des mots-clés.";
            }
        }

        case "remove_keywords": {
            try {
                // Vérifier que l'utilisateur a les droits d'administrateur
                const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
                if (!hasAdminPermission) {
                    return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
                }

                if (!options?.id) {
                    return "Vous devez fournir un ID!";
                }

                // Traiter les mots-clés (si fournis)
                let keywords: string[] | undefined;
                if (options.keywords) {
                    keywords = options.keywords
                        .split(",")
                        .map((k: string) => k.trim())
                        .filter((k: string) => k.length > 0);
                    if (keywords && keywords.length === 0) {
                        keywords = undefined; // Supprimer tous les mots-clés si la liste est vide
                    }
                }

                // Supprimer les mots-clés
                const result = await removeKeywordsFromResponse(options.id, keywords || [], env);

                if (result.success) {
                    let message = `${result.message}`;
                    if (result.removedKeywords && result.removedKeywords.length > 0) {
                        message += `\nMots-clés supprimés: ${result.removedKeywords.join(", ")}`;
                    }
                    message += `\nMots-clés restants: ${result.currentKeywords?.join(", ") || "aucun"}`;
                    return message;
                }

                return `Erreur: ${result.message}`;
            } catch (error) {
                console.error("Erreur lors de la suppression des mots-clés:", error);
                return "Une erreur est survenue lors de la suppression des mots-clés.";
            }
        }

        case "view_keywords": {
            try {
                if (!options?.id) {
                    return "Vous devez fournir un ID!";
                }

                // Récupérer les réponses
                const responses = await getMarkdownResponses(env);
                const response = responses[options.id];

                if (!response) {
                    return `Aucune réponse trouvée avec l'ID "${options.id}".`;
                }

                const keywords = response.keywords || [];

                if (keywords.length === 0) {
                    return `La réponse "${options.id}" n'a pas de mots-clés.`;
                }

                return `Mots-clés pour "${options.id}" (${response.name}):\n\n${keywords.join(", ")}`;
            } catch (error) {
                console.error("Erreur lors de l'affichage des mots-clés:", error);
                return "Une erreur est survenue lors de l'affichage des mots-clés.";
            }
        }

        case "links": {
            // Vérifier que l'utilisateur a les droits d'administrateur pour add/remove
            const subCommand = options ? Object.keys(options)[0] : null;

            if ((subCommand === "add" || subCommand === "remove") && interaction) {
                const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
                if (!hasAdminPermission) {
                    return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
                }
            }

            if (!subCommand || !options) {
                return "Vous devez spécifier une sous-commande (add, remove ou view).";
            }

            // Gestion des sous-commandes
            switch (subCommand) {
                case "add": {
                    try {
                        const targetId = options.add?.target_id;
                        const recommendedId = options.add?.recommended_id;

                        if (!targetId || !recommendedId) {
                            return "Vous devez fournir les IDs de l'article cible et de l'article recommandé.";
                        }

                        // Ajouter le lien
                        const result = await addRecommendedLink(targetId, recommendedId, env);

                        if (result.success) {
                            return `${result.message}\nLiens actuels: ${result.currentLinks?.join(", ") || "aucun"}`;
                        }

                        return `Erreur: ${result.message}`;
                    } catch (error) {
                        console.error("Erreur lors de l'ajout du lien:", error);
                        return "Une erreur est survenue lors de l'ajout du lien.";
                    }
                }

                case "remove": {
                    try {
                        const targetId = options.remove?.target_id;
                        const recommendedId = options.remove?.recommended_id;

                        if (!targetId) {
                            return "Vous devez fournir l'ID de l'article cible.";
                        }

                        // Supprimer le lien
                        const result = await removeRecommendedLink(targetId, recommendedId, env);

                        if (result.success) {
                            let message = `${result.message}`;
                            if (result.removedLinks && result.removedLinks.length > 0) {
                                message += `\nLiens supprimés: ${result.removedLinks.join(", ")}`;
                            }
                            message += `\nLiens restants: ${result.currentLinks?.join(", ") || "aucun"}`;
                            return message;
                        }

                        return `Erreur: ${result.message}`;
                    } catch (error) {
                        console.error("Erreur lors de la suppression du lien:", error);
                        return "Une erreur est survenue lors de la suppression du lien.";
                    }
                }

                case "view": {
                    try {
                        const targetId = options.view?.target_id;

                        if (!targetId) {
                            return "Vous devez fournir l'ID de l'article cible.";
                        }

                        // Récupérer les réponses
                        const responses = await getMarkdownResponses(env);
                        const response = responses[targetId];

                        if (!response) {
                            return `Aucun article trouvé avec l'ID "${targetId}".`;
                        }

                        const links = response.recommendedIds || [];

                        if (links.length === 0) {
                            return `L'article "${targetId}" (${response.name}) n'a pas de liens.`;
                        }

                        // Formater la liste des liens avec noms
                        const linksList = links
                            .map((linkId) => {
                                const linkedResponse = responses[linkId];
                                return linkedResponse ? `- **${linkId}**: ${linkedResponse.name}` : `- **${linkId}**: (article supprimé)`;
                            })
                            .join("\n");

                        return `# Liens pour "${targetId}" (${response.name})\n\n${linksList}`;
                    } catch (error) {
                        console.error("Erreur lors de l'affichage des liens:", error);
                        return "Une erreur est survenue lors de l'affichage des liens.";
                    }
                }

                default:
                    return "Sous-commande non reconnue. Utilisez 'add', 'remove' ou 'view'.";
            }
        }

        default:
            return null;
    }
}
