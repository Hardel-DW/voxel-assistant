import { addKeywordsToResponse, getMarkdownResponses, removeKeywordsFromResponse } from "../../markdown-loader";
import type { CommandHandler } from "../types";

export const handleKeywords: CommandHandler = async (options, interaction, env) => {
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
                const id = options.add?.id;
                const keywordsStr = options.add?.keywords;

                if (!id || !keywordsStr) {
                    return "Vous devez fournir un ID et des mots-clés!";
                }

                // Traiter les mots-clés
                const keywords = keywordsStr
                    .split(",")
                    .map((k: string) => k.trim())
                    .filter((k: string) => k.length > 0);

                if (keywords.length === 0) {
                    return "Vous devez fournir au moins un mot-clé valide!";
                }

                // Ajouter les mots-clés
                const result = await addKeywordsToResponse(id, keywords, env);

                if (result.success) {
                    return `${result.message}\nMots-clés actuels: ${result.currentKeywords?.join(", ") || "aucun"}`;
                }

                return `Erreur: ${result.message}`;
            } catch (error) {
                console.error("Erreur lors de l'ajout des mots-clés:", error);
                return "Une erreur est survenue lors de l'ajout des mots-clés.";
            }
        }

        case "remove": {
            try {
                const id = options.remove?.id;
                const keywordsStr = options.remove?.keywords;

                if (!id) {
                    return "Vous devez fournir un ID!";
                }

                // Traiter les mots-clés (si fournis)
                let keywords: string[] | undefined;
                if (keywordsStr) {
                    keywords = keywordsStr
                        .split(",")
                        .map((k: string) => k.trim())
                        .filter((k: string) => k.length > 0);
                    if (keywords && keywords.length === 0) {
                        keywords = undefined; // Supprimer tous les mots-clés si la liste est vide
                    }
                }

                // Supprimer les mots-clés
                const result = await removeKeywordsFromResponse(id, keywords || [], env);

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

        case "view": {
            try {
                const id = options.view?.id;

                if (!id) {
                    return "Vous devez fournir un ID!";
                }

                // Récupérer les réponses
                const responses = await getMarkdownResponses(env);
                const response = responses[id];

                if (!response) {
                    return `Aucune réponse trouvée avec l'ID "${id}".`;
                }

                const keywords = response.keywords || [];

                if (keywords.length === 0) {
                    return `La réponse "${id}" (${response.name}) n'a pas de mots-clés.`;
                }

                return `Mots-clés pour "${id}" (${response.name}):\n\n${keywords.join(", ")}`;
            } catch (error) {
                console.error("Erreur lors de l'affichage des mots-clés:", error);
                return "Une erreur est survenue lors de l'affichage des mots-clés.";
            }
        }

        default:
            return "Sous-commande non reconnue. Utilisez 'add', 'remove' ou 'view'.";
    }
};
