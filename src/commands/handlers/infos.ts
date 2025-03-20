import type { CommandHandler } from "../types";
import type { Command } from "../types";

export const handleInfos: CommandHandler = async () => {
    // Importer ici pour éviter les dépendances circulaires
    const { COMMANDS } = await import("../commands");

    const commands = COMMANDS.map((cmd: Command) => {
        let description = `**/${cmd.name}**: ${cmd.description}`;

        if (cmd.options && cmd.options.length > 0) {
            const options = cmd.options
                .map((opt) => {
                    const required = opt.required ? " (obligatoire)" : " (optionnel)";
                    return `  • \`${opt.name}\`: ${opt.description}${required}`;
                })
                .join("\n");

            description += `\n${options}`;
        }

        return description;
    }).join("\n\n");

    return `# Commandes disponibles\n\n${commands}\n\n## Système de recherche sémantique\n\nCe bot utilise un système de recherche sémantique (RAG) pour trouver les réponses les plus pertinentes à vos questions. Les réponses sont automatiquement indexées avec des embeddings vectoriels pour une meilleure compréhension du contenu.`;
};
