// Interface pour les réponses markdown
export interface MarkdownResponse {
    content: string;
    name: string;
    embedding?: number[];
}

// Interface pour le cache des réponses
export interface MarkdownResponsesCache {
    [key: string]: MarkdownResponse;
}

// Cache pour les réponses chargées
let responseCache: MarkdownResponsesCache | null = null;

// Importer les fonctions d'embedding
import { generateEmbedding } from "./util/embeddings";

/**
 * Récupère les réponses markdown depuis Cloudflare KV
 * @param env L'objet env de Cloudflare Workers contenant le binding KV
 */
export async function getMarkdownResponses(env?: any): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    try {
        // Accès à Cloudflare KV via l'objet env
        if (!env?.MARKDOWN_KV) {
            console.warn("KV store not available (env), using default responses");
            return getDefaultResponses();
        }

        // Récupérer la liste des clés disponibles
        const keys = await env.MARKDOWN_KV.list();
        const responses: MarkdownResponsesCache = {};

        // Charger chaque réponse
        for (const key of keys.keys) {
            try {
                const responseText = await env.MARKDOWN_KV.get(key.name);
                if (responseText) {
                    try {
                        // Essayer d'analyser comme JSON (pour les métadonnées)
                        const parsed = JSON.parse(responseText);
                        responses[key.name] = {
                            content: parsed.content || "",
                            name: parsed.name || key.name,
                            embedding: parsed.embedding || undefined
                        };
                    } catch {
                        // Si ce n'est pas du JSON, considérer que c'est juste le contenu
                        responses[key.name] = {
                            content: responseText,
                            name: key.name,
                            embedding: undefined
                        };
                    }
                }
            } catch (err) {
                console.error(`Error loading response ${key.name}:`, err);
            }
        }

        // Vérifier qu'on a une réponse par défaut
        if (!responses.default) {
            responses.default = {
                content: "Je ne comprends pas votre question.",
                name: "default"
            };

            // Sauvegarder la réponse par défaut dans KV si elle n'existe pas
            try {
                await env.MARKDOWN_KV.put("default", JSON.stringify(responses.default));
            } catch (err) {
                console.error("Error saving default response:", err);
            }
        }

        // Stocker en cache
        responseCache = responses;
        return responses;
    } catch (error) {
        console.error("Error accessing KV store:", error);
        return getDefaultResponses();
    }
}

/**
 * Réponses par défaut si le KV store n'est pas disponible
 */
function getDefaultResponses(): MarkdownResponsesCache {
    return {
        default: {
            content: "Je ne comprends pas votre question.",
            name: "default"
        }
    };
}

/**
 * Récupère le contenu d'une réponse par son identifiant
 * @param id Identifiant de la réponse
 * @param env L'objet env de Cloudflare Workers contenant le binding KV
 */
export async function getResponseContent(id: string, env?: any): Promise<string> {
    const responses = await getMarkdownResponses(env);
    const response = responses[id];

    if (!response) {
        return responses.default?.content || "Je ne comprends pas votre question.";
    }

    return response.content;
}

/**
 * Fonction pour enregistrer une nouvelle réponse markdown dans le KV
 * Cette fonction sera appelée par la commande Discord /register
 * @param id Identifiant de la réponse
 * @param content Contenu markdown
 * @param name Nom optionnel
 * @param env L'objet env de Cloudflare Workers contenant le binding KV
 */
export async function registerMarkdownResponse(id: string, content: string, name?: string, env?: any): Promise<boolean> {
    try {
        // Accéder au KV via l'objet env
        if (!env?.MARKDOWN_KV) {
            console.error("KV store not available, cannot register response");
            return false;
        }

        // Générer l'embedding pour le contenu
        const embedding = await generateEmbedding(content);

        const response: MarkdownResponse = {
            content,
            name: name || id,
            embedding: embedding
        };

        // Sauvegarder dans KV en utilisant le binding depuis env
        await env.MARKDOWN_KV.put(id, JSON.stringify(response));

        // Invalider le cache
        responseCache = null;

        console.log(`Response ${id} registered successfully with embedding`);
        return true;
    } catch (error) {
        console.error("Error registering markdown response:", error);
        return false;
    }
}

/**
 * Convertit les réponses en format compatible avec la recherche d'embeddings
 */
export function responsesToEmbeddingData(responses: MarkdownResponsesCache) {
    return Object.entries(responses).map(([id, response]) => ({
        id,
        content: response.content,
        name: response.name,
        embedding: response.embedding || []
    }));
}
