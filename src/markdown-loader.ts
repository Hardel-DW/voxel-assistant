// Imports conditionnels pour éviter que node:fs/path ne soient inclus dans le bundle Workers
let fs: any;
let path: any;

// On ne charge ces modules que si on est dans un environnement Node.js
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    // Pour les environnements Node.js uniquement (dev)
    import("node:fs").then((module) => {
        fs = module;
    });
    import("node:path").then((module) => {
        path = module;
    });
}

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
 * Cette fonction n'est utilisée qu'en développement
 */
export async function readMarkdownResponses(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    // Vérifier qu'on est bien dans un environnement Node
    if (!fs || !path) {
        console.error("Tentative d'utiliser fs/path dans un environnement non-Node");
        return getDefaultResponses();
    }

    const responses: MarkdownResponsesCache = {};

    try {
        const responsesDir = path.resolve(process.cwd(), "responses");

        // Lire tous les fichiers du dossier responses
        const files = fs.readdirSync(responsesDir).filter((file: string) => file.endsWith(".md"));

        // Pour chaque fichier markdown
        for (const file of files) {
            try {
                const filePath = path.resolve(responsesDir, file);
                const fileContent = fs.readFileSync(filePath, "utf-8");
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
        return getDefaultResponses();
    }
}

/**
 * Retourne des réponses par défaut en cas d'erreur
 */
function getDefaultResponses(): MarkdownResponsesCache {
    return {
        default: {
            content: "Je ne comprends pas votre question. Le système de réponses n'est pas disponible.",
            name: "default",
            patterns: []
        }
    };
}

/**
 * Version pour Cloudflare Workers
 * CETTE FONCTION EST REMPLACÉE PENDANT LE BUILD
 * par un plugin Vite/Rollup qui va capturer les données du dossier responses
 * et les injecter directement ici comme un objet statique.
 */
export async function readMarkdownResponsesForWorker(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) return responseCache;

    // ATTENTION: Ce code est remplacé pendant le build par le plugin Vite/Rollup
    // Ne devrait jamais être exécuté tel quel en production
    console.warn("readMarkdownResponsesForWorker: Cette fonction devrait être remplacée pendant le build");

    // Réponse minimaliste par défaut
    return {
        default: {
            content: "Mode Workers en cours de construction.",
            name: "default",
            patterns: []
        }
    };
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
