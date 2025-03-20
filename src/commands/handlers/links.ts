import { addRecommendedLink, getMarkdownResponses, removeRecommendedLink } from "../../markdown-loader";
import type { CommandHandler } from "../types";

export const handleLinks: CommandHandler = async (originalOptions, interaction, env) => {
    console.log("Options reçues:", JSON.stringify(originalOptions));
    console.log("Interaction reçue:", JSON.stringify(interaction));

    // Extraire les options de l'interaction si elles sont vides
    let options = originalOptions || {};
    if (Object.keys(options).length === 0 && interaction?.data?.options) {
        // Reconstruire l'objet options à partir de l'interaction
        const subCommandGroup = interaction.data.options[0];
        if (subCommandGroup) {
            const subCommandName = subCommandGroup.name;
            options = {
                [subCommandName]: {}
            };

            // Ajouter les options du sous-groupe
            if (subCommandGroup.options) {
                for (const opt of subCommandGroup.options) {
                    options[subCommandName][opt.name] = opt.value;
                }
            }
        }
    }

    console.log("Options utilisées:", JSON.stringify(options));

    // Vérifier que l'utilisateur a les droits d'administrateur pour add/remove
    const subCommand = options ? Object.keys(options)[0] : null;

    console.log("Sous-commande détectée:", subCommand);

    if ((subCommand === "add" || subCommand === "remove") && interaction) {
        const hasAdminPermission = interaction?.member?.permissions?.includes("8") || false;
        if (!hasAdminPermission) {
            return "Vous n'avez pas les droits d'administrateur pour utiliser cette commande.";
        }
    }

    if (!subCommand) {
        return "Vous devez spécifier une sous-commande (add, remove ou view).";
    }

    // Gestion des sous-commandes
    switch (subCommand) {
        case "add": {
            try {
                const targetId = options.add?.target_id;
                const recommendedId = options.add?.recommended_id;

                console.log("Paramètres add:", { targetId, recommendedId });

                if (!targetId || !recommendedId) {
                    return "Vous devez fournir les IDs de l'article cible et de l'article recommandé.";
                }

                // Vérifier que les IDs existent dans la base
                const responses = await getMarkdownResponses(env);
                if (!responses[targetId]) {
                    return `Erreur: L'article cible avec l'ID "${targetId}" n'existe pas.`;
                }
                if (!responses[recommendedId]) {
                    return `Erreur: L'article recommandé avec l'ID "${recommendedId}" n'existe pas.`;
                }

                // Ajouter le lien
                const result = await addRecommendedLink(targetId, recommendedId, env);
                console.log("Résultat add:", result);

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
};
