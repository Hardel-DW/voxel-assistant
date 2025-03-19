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

// Plugin pour créer un module virtuel qui contient toutes les réponses MD
function bundleMarkdownPlugin() {
    const virtualModuleId = "virtual:markdown-responses";
    const resolvedVirtualModuleId = `\0${virtualModuleId}`;

    return {
        name: "bundle-markdown",
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                const responsesDir = path.resolve(process.cwd(), "responses");
                const responses: Record<string, any> = {};

                try {
                    const files = fs.readdirSync(responsesDir).filter((file) => file.endsWith(".md"));
                    console.log(`Bundling ${files.length} markdown files...`);

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

                            console.log(`Bundled: ${fileId}`);
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

                // Génération du code JS pour le module virtuel
                return `
                    // Module généré automatiquement contenant toutes les réponses markdown
                    const responses = ${JSON.stringify(responses, null, 2)};
                    export default responses;
                `;
            }
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
    plugins: [bundleMarkdownPlugin()]
});
