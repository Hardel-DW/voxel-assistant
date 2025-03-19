/**
 * Fonction pour calculer la similarité entre deux textes (méthode simple)
 * Utilise le coefficient de Jaccard sur les mots
 */
export function calculateSimilarity(text1: string, text2: string): number {
    // Normaliser et diviser en mots
    const words1 = text1
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/);
    const words2 = text2
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/);

    // Convertir en ensembles pour compter les occurrences uniques
    const set1 = new Set(words1);
    const set2 = new Set(words2);

    // Créer l'intersection
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Si les deux textes sont vides, retourner 0
    if (set1.size === 0 && set2.size === 0) return 0;

    // Calculer similarité par coefficient de Jaccard
    return intersection.size / (set1.size + set2.size - intersection.size);
}
