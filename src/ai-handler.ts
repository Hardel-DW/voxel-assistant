import { getMarkdownResponses, getResponseContent } from "./markdown-loader";

/**
 * Fonction pour calculer la similarité entre deux textes (méthode simple)
 * Utilise le coefficient de Jaccard sur les mots
 */
function calculateSimilarity(text1: string, text2: string): number {
    // Normaliser et diviser en mots
    const words1 = text1
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/);
    const words2 = text2
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/);

    // Convertir en ensembles pour compter les occurrences uniques
    const set1 = new Set(words1);
    const set2 = new Set(words2);

    // Créer l'intersection
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Si les deux textes sont vides, retourner 0
    if (set1.size === 0 && set2.size === 0) {
        return 0;
    }

    // Calculer similarité par coefficient de Jaccard
    return intersection.size / (set1.size + set2.size - intersection.size);
}

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
        if (responseId === "default" || !response.patterns.length) {
            continue;
        }

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
