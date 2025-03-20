import {
    cleanupDeletedArticleLinks,
    getMarkdownResponses,
    getResponseContent,
    invalidateCache,
    registerMarkdownResponse
} from "../../markdown-loader";
import type { CommandHandler } from "../types";

export const handleContent: CommandHandler = async (options, interaction, env) => {
    // Vérifier que l'utilisateur a les droits d'administrateur
    const subCommand = options ? Object.keys(options)[0] : null;

    // Toutes les sous-commandes nécessitent des droits d'administrateur
    const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
    if (!hasAdminPermission) {
        return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
    }

    if (!subCommand || !options) {
        return "Vous devez spécifier une sous-commande (add, view, list, remove).";
    }

    // Gestion des sous-commandes
    switch (subCommand) {
        case "add": {
            // Correspondant à l'ancienne commande 'register'
            try {
                const id = options.add?.id;
                const messageId = options.add?.message_id;
                const name = options.add?.name;
                const keywordsStr = options.add?.keywords;

                if (!id || !messageId) {
                    return "Vous devez fournir un ID et un message_id!";
                }

                // Récupérer le message via l'API Discord
                const channelId = interaction.channel_id;

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
                if (keywordsStr) {
                    keywords = keywordsStr
                        .split(",")
                        .map((k: string) => k.trim())
                        .filter((k: string) => k.length > 0);
                }

                // Enregistrer la réponse markdown en passant l'objet env
                const success = await registerMarkdownResponse(id, content, name || id, keywords, env);

                if (success) {
                    let responseMessage = `La réponse "${id}" a été enregistrée avec succès!`;
                    if (keywords.length > 0) {
                        responseMessage += ` (${keywords.length} mots-clés ajoutés)`;
                    }
                    return responseMessage;
                }

                return "Erreur lors de l'enregistrement de la réponse.";
            } catch (error) {
                console.error("Erreur lors de l'enregistrement:", error);
                return "Une erreur est survenue lors de l'enregistrement.";
            }
        }

        case "view": {
            // Afficher le contenu d'un ID spécifique (ancien view_content)
            try {
                const id = options.view?.id;

                if (!id) {
                    return "Vous devez fournir un ID pour afficher son contenu.";
                }

                // Récupérer le contenu spécifique
                const content = await getResponseContent(id, env);

                // Si c'est la réponse par défaut et que l'ID n'est pas "default", ça signifie que l'ID n'existe pas
                const responses = await getMarkdownResponses(env);
                if (content === responses.default?.content && id !== "default") {
                    return `Aucun contenu trouvé avec l'ID "${id}".`;
                }

                // Ajouter l'ID et le nom dans l'en-tête
                const response = responses[id];
                const header = `# ${response.name} (ID: ${id})\n\n`;

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

        case "list": {
            // Lister tous les IDs disponibles (ancien list_ids)
            try {
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

        case "remove": {
            // Correspondant à l'ancienne commande 'delete'
            try {
                const id = options.remove?.id;

                if (!id) {
                    return "Vous devez fournir un ID valide.";
                }

                // Vérifier si l'élément existe
                const responses = await getMarkdownResponses(env);
                if (!responses[id]) {
                    return `Aucun contenu trouvé avec l'ID "${id}".`;
                }

                // Protection contre la suppression de la réponse par défaut
                if (id === "default") {
                    return "Vous ne pouvez pas supprimer la réponse par défaut.";
                }

                // Supprimer l'élément
                if (!env?.MARKDOWN_KV) {
                    return "KV store non disponible, impossible de supprimer l'élément.";
                }

                await env.MARKDOWN_KV.delete(id);

                // Nettoyer les liens vers cet article dans les autres articles
                const updatedCount = await cleanupDeletedArticleLinks(id, env);

                // Invalider le cache
                invalidateCache();

                let message = `✅ Élément "${id}" supprimé avec succès.`;
                if (updatedCount > 0) {
                    message += `\n${updatedCount} article(s) qui référençaient cet élément ont été mis à jour.`;
                }

                return message;
            } catch (error) {
                console.error("Erreur lors de la suppression de l'élément:", error);
                return "Une erreur est survenue lors de la suppression de l'élément.";
            }
        }

        default:
            return "Sous-commande non reconnue. Utilisez 'add', 'view', 'list' ou 'remove'.";
    }
};
