import { readFileSync, readdirSync } from "node:fs";
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
 */
export async function readMarkdownResponses(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    const responses: MarkdownResponsesCache = {};

    try {
        const responsesDir = resolve(process.cwd(), "responses");

        // Lire tous les fichiers du dossier responses
        const files = readdirSync(responsesDir).filter((file) => file.endsWith(".md"));

        // Pour chaque fichier markdown
        for (const file of files) {
            try {
                const filePath = resolve(responsesDir, file);
                const fileContent = readFileSync(filePath, "utf-8");
                const fileId = file.replace(/\.md$/, ""); // Enlever l'extension .md

                // Extraire frontmatter et contenu
                const { frontmatter, content } = extractFrontmatter(fileContent);

                // Créer l'objet de réponse
                responses[fileId] = {
                    content: content.trim(),
                    name: frontmatter.name || fileId,
                    patterns: frontmatter.patterns || []
                };

                console.log(`Loaded response: ${fileId}`);
            } catch (err) {
                console.error(`Erreur lors de la lecture du fichier ${file}:`, err);
            }
        }

        // Vérifier qu'on a une réponse par défaut
        if (!responses.default) {
            responses.default = {
                content: "Je ne comprends pas votre question.",
                name: "default",
                patterns: []
            };
        }

        // Stocker en cache
        responseCache = responses;
        return responses;
    } catch (error) {
        console.error("Erreur lors du chargement des réponses markdown:", error);

        // Retourner au moins une réponse par défaut en cas d'erreur
        return {
            default: {
                content: "Je ne comprends pas votre question. Le système de réponses n'est pas disponible.",
                name: "default",
                patterns: []
            }
        };
    }
}

/**
 * Version pour Cloudflare Workers
 * Génère dynamiquement lors du build et est inclus dans le bundle
 */
export async function readMarkdownResponsesForWorker(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    // En production (Worker), on utilise readMarkdownResponses()
    // Cette fonction est automatiquement réécrite pendant le build
    // grâce au plugin Rollup/Vite qui capture les données au moment du build

    try {
        // Pendant le build, ce code est exécuté une fois et le résultat est "inlined"
        // dans le bundle final
        return await readMarkdownResponses();
    } catch (error) {
        console.error("Erreur lors du chargement des réponses en production:", error);

        // Réponse minimale par défaut
        return {
            default: {
                content: "Je ne comprends pas votre question. Le système de réponses n'est pas disponible.",
                name: "default",
                patterns: []
            }
        };
    }
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
