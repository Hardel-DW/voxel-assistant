import { getMarkdownResponses } from "../../markdown-loader";
import { generateEmbedding } from "../../util/embeddings";
import type { CommandHandler } from "../types";

export const handleRegenerateEmbeddings: CommandHandler = async (_, interaction, env) => {
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
};
