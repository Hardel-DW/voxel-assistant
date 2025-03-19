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
