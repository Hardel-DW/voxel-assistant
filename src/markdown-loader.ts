import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
 * Fonction pour extraire le frontmatter d'un fichier markdown
 * @param content Contenu du fichier markdown
 * @returns Objet contenant le frontmatter et le contenu
 */
function extractFrontmatter(content: string): { frontmatter: any; content: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return {
            frontmatter: {},
            content: content
        };
    }

    const [, frontmatterStr, contentStr] = match;

    // Parsing simplifié du YAML
    const frontmatter: Record<string, any> = {};
    for (const line of frontmatterStr.split("\n")) {
        // Ignorer les lignes vides
        if (!line.trim()) continue;

        // Traiter les lignes qui contiennent des clés et des valeurs
        if (line.includes(":")) {
            const [key, value] = line.split(":");
            const trimmedKey = key.trim();
            const trimmedValue = value ? value.trim() : "";

            // Si la valeur n'est pas vide, l'ajouter
            if (trimmedValue) {
                frontmatter[trimmedKey] = trimmedValue;
            } else {
                // Si la valeur est vide, c'est probablement un tableau
                frontmatter[trimmedKey] = [];
            }
        }
        // Traiter les éléments de tableau (commençant par -)
        else if (line.trim().startsWith("-")) {
            // Trouver la dernière clé ajoutée (qui devrait être un tableau)
            const lastKey = Object.keys(frontmatter).pop();
            if (lastKey && Array.isArray(frontmatter[lastKey])) {
                // Ajouter l'élément au tableau
                const item = line.trim().substring(1).trim();
                frontmatter[lastKey].push(item);
            }
        }
    }

    return {
        frontmatter,
        content: contentStr
    };
}

/**
 * Fonction pour charger les réponses markdown depuis le système de fichiers
 * Note: Cette approche fonctionne en développement local, mais pour Cloudflare Workers,
 * les fichiers devront être packagés ou stockés dans KV
 */
export async function readMarkdownResponses(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    const responses: MarkdownResponsesCache = {};

    try {
        // Liste des réponses disponibles
        const responsesList = ["greeting", "help", "about", "weather", "default"];

        // Pour chaque réponse, lire le fichier markdown
        for (const name of responsesList) {
            try {
                const path = resolve(process.cwd(), "responses", `${name}.md`);
                const fileContent = readFileSync(path, "utf-8");

                // Extraire frontmatter et contenu
                const { frontmatter, content } = extractFrontmatter(fileContent);

                // Créer l'objet de réponse
                responses[name] = {
                    content: content.trim(),
                    name: frontmatter.name || name,
                    patterns: frontmatter.patterns || []
                };
            } catch (err) {
                console.error(`Erreur lors de la lecture du fichier ${name}.md:`, err);
                // Définir une réponse par défaut en cas d'échec
                responses[name] = {
                    content: `Je n'ai pas pu trouver de réponse pour "${name}".`,
                    name,
                    patterns: []
                };
            }
        }

        // Stocker en cache
        responseCache = responses;
        return responses;
    } catch (error) {
        console.error("Erreur lors du chargement des réponses markdown:", error);
        // Retourner un objet vide en cas d'erreur
        return {};
    }
}

/**
 * Version pour Cloudflare Workers - À utiliser en production
 * Utilise des imports statiques pour packager les fichiers avec le worker
 */
export async function readMarkdownResponsesForWorker(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    // En production, ces fichiers seraient importés directement ou stockés dans KV
    // Définir les réponses manuellement ou les précharger dans le worker
    const responses: MarkdownResponsesCache = {
        greeting: {
            content: "# Bonjour! 👋\n\nRavi de vous rencontrer. Comment puis-je vous aider aujourd'hui?",
            name: "greeting",
            patterns: ["hello", "hi", "hey", "good morning", "salut", "bonjour", "bonsoir", "coucou"]
        },
        help: {
            content: "## Aide 🔍\n\nVoici les commandes disponibles...",
            name: "help",
            patterns: ["help me", "need help", "assistance", "support", "aide", "besoin d'aide", "comment ça marche"]
        },
        about: {
            content: "## À propos de moi 🤖\n\nJe suis **Voxel Assistant**...",
            name: "about",
            patterns: ["who are you", "what are you", "about you", "your purpose", "qui es-tu", "que fais-tu", "à propos de toi"]
        },
        weather: {
            content: "## Météo ☁️\n\nJe n'ai pas accès aux données météo en temps réel...",
            name: "weather",
            patterns: [
                "weather",
                "forecast",
                "temperature",
                "rain",
                "snow",
                "sunny",
                "météo",
                "température",
                "pluie",
                "neige",
                "temps qu'il fait"
            ]
        },
        default: {
            content: "## Hmm... 🤔\n\nJe ne suis pas certain de comprendre votre question...",
            name: "default",
            patterns: []
        }
    };

    // Stocker en cache
    responseCache = responses;
    return responses;
}

/**
 * Fonction qui détermine quelle méthode de chargement utiliser
 * En fonction de l'environnement (dev vs prod)
 */
export async function getMarkdownResponses(): Promise<MarkdownResponsesCache> {
    // Si on est sur Cloudflare Workers (déterminé par l'environnement)
    if (typeof process === "undefined" || !process.cwd) {
        return readMarkdownResponsesForWorker();
    }

    // Sinon, utiliser la méthode de développement local
    return readMarkdownResponses();
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
