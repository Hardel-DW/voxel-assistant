import { getMarkdownResponses, getResponseContent } from "./markdown-loader";
import { calculateSimilarity } from "./util/similarity";

/**
 * Fonction pour détecter l'intent d'un message à partir des patterns
 * définis dans les fichiers markdown
 */
export async function detectIntentFromMessage(message: string): Promise<string | null> {
    const responses = await getMarkdownResponses();
    let bestMatch: string | null = null;
    let highestScore = 0.3; // Seuil minimal de confiance

    // Parcourir toutes les réponses et leurs patterns
    for (const [responseId, response] of Object.entries(responses)) {
        // Ignorer la réponse par défaut qui n'a pas de patterns
        if (responseId === "default" || !response.patterns.length) continue;

        for (const pattern of response.patterns) {
            const score = calculateSimilarity(message, pattern);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = responseId;
            }
        }
    }

    return bestMatch;
}

/**
 * Fonction principale pour traiter une question et obtenir une réponse
 */
export async function processQuestion(question: string): Promise<string> {
    // Détecter l'intent du message
    const intentId = await detectIntentFromMessage(question);

    if (intentId) {
        // Si un intent est détecté, récupérer le contenu
        return await getResponseContent(intentId);
    }

    // Aucun intent détecté, utiliser la réponse par défaut
    return await getResponseContent("default");
}
