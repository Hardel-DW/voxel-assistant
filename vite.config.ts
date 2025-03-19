import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

// Fonction pour extraire le frontmatter des fichiers markdown
function extractFrontmatter(content: string): { frontmatter: any; content: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return {
            frontmatter: {},
            content
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

// Plugin pour injecter les données des fichiers markdown
function markdownInjectorPlugin() {
    return {
        name: "markdown-injector",
        transform(code: string, id: string) {
            // Ne transformer que le fichier markdown-loader.ts
            if (id.endsWith("markdown-loader.ts")) {
                // Charger tous les fichiers markdown à l'avance
                const responsesDir = path.resolve(process.cwd(), "responses");
                const responses: Record<string, any> = {};

                try {
                    const files = fs.readdirSync(responsesDir).filter((file) => file.endsWith(".md"));

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
                        } catch (err) {
                            console.error(`Erreur lors de la lecture du fichier ${file}:`, err);
                        }
                    }
                } catch (error) {
                    console.error("Erreur lors du chargement des réponses markdown:", error);
                }

                // S'assurer qu'il y a une réponse par défaut
                if (!responses.default) {
                    responses.default = {
                        content: "Je ne comprends pas votre question.",
                        name: "default",
                        patterns: []
                    };
                }

                // Remplacer la fonction getMarkdownResponses par une version avec les données injectées
                const responsesJSON = JSON.stringify(responses, null, 2);
                const replacementFunction = `
export async function getMarkdownResponses(): Promise<MarkdownResponsesCache> {
    // Si déjà en cache, retourner le cache
    if (responseCache) {
        return responseCache;
    }

    // Données injectées par le plugin markdown-injector pendant le build
    const responses: MarkdownResponsesCache = ${responsesJSON};
    
    // Stocker en cache
    responseCache = responses;
    return responses;
}`;

                // Remplacer la fonction dans le code
                return code.replace(/export async function getMarkdownResponses\(\)[\s\S]*?return\s+responses;\s*\}/, replacementFunction);
            }

            return code;
        }
    };
}

export default defineConfig({
    build: {
        ssr: true,
        rollupOptions: {
            input: "src/server.ts",
            output: {
                format: "es",
                entryFileNames: "worker.js"
            }
        },
        minify: false
    },
    plugins: [markdownInjectorPlugin()]
});
