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

// Cache pour les réponses chargées
let responseCache: MarkdownResponsesCache | null = null;

/**
 * Cette fonction est remplacée pendant le build par le plugin Vite/Rollup
 * qui va injecter directement toutes les réponses comme un objet statique.
 */
export async function getMarkdownResponses(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    // En production, le code ci-dessous sera remplacé par un objet contenant
    // toutes les réponses précompilées
    console.warn("getMarkdownResponses: Cette fonction devrait être remplacée pendant le build");

    // Réponse par défaut
    const responses: MarkdownResponsesCache = {
        default: {
            content: "Je ne comprends pas votre question.",
            name: "default",
            patterns: []
        }
    };

    responseCache = responses;
    return responses;
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
