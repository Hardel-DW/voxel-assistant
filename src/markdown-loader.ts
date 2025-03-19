// Interface pour les réponses markdown
export interface MarkdownResponse {
    content: string;
    name: string;
    patterns: string[];
}

// Interface pour le cache des réponses
export interface MarkdownResponsesCache {
    [key: string]: MarkdownResponse;
}

// Importer les réponses depuis le module virtuel généré par le plugin
import markdownResponses from "virtual:markdown-responses";

// Cache pour les réponses chargées
let responseCache: MarkdownResponsesCache | null = null;

/**
 * Récupère les réponses markdown depuis le bundle
 */
export async function getMarkdownResponses(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    // Utiliser les réponses du module virtuel bundlé
    responseCache = markdownResponses as MarkdownResponsesCache;
    return responseCache;
}

/**
 * Récupère le contenu d'une réponse par son identifiant
 * @param id Identifiant de la réponse
 */
export async function getResponseContent(id: string): Promise<string> {
    const responses = await getMarkdownResponses();
    const response = responses[id];

    if (!response) {
        return responses.default?.content || "Je ne comprends pas votre question.";
    }

    return response.content;
}
