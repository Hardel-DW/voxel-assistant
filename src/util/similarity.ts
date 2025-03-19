/**
 * Calcule la similarité simple entre deux chaînes de caractères
 * Utilisé pour la compatibilité avec le système existant
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Si l'une des chaînes contient l'autre, forte similarité
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.9;
    }

    // Compter les mots en commun
    const words1 = new Set(s1.split(/\s+/).filter((word) => word.length > 3));
    const words2 = new Set(s2.split(/\s+/).filter((word) => word.length > 3));

    let commonWords = 0;
    for (const word of words1) {
        if (words2.has(word)) {
            commonWords++;
        }
    }

    // Calculer le score en fonction des mots communs
    const totalUniqueWords = new Set([...words1, ...words2]).size;
    if (totalUniqueWords === 0) return 0;

    return commonWords / totalUniqueWords;
}
