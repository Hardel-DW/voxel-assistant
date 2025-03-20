// Interface pour les embeddings
export interface EmbeddingData {
    id?: string;
    content: string;
    embedding: number[];
    name: string;
    keywords?: string[];
}

/**
 * Fonction simple pour générer un pseudo-embedding qui fonctionne dans tous les environnements
 * Cette approche utilise un hachage simple des mots pour créer un vecteur d'embedding
 * Ce n'est pas aussi performant qu'un vrai modèle ML, mais ça fonctionne partout
 * @param text Texte à encoder
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        // Normaliser le texte
        const normalizedText = text
            .toLowerCase()
            .replace(/[^\w\s]/g, " ") // Remplacer la ponctuation par des espaces
            .replace(/\s+/g, " ") // Réduire les espaces multiples
            .trim();

        // Découper en mots et filtrer les mots vides
        const words = normalizedText
            .split(" ")
            .filter((word) => word.length > 2) // Ignorer les mots très courts
            .slice(0, 100); // Limiter le nombre de mots

        // Créer un dictionnaire de mots uniques
        const uniqueWords = [...new Set(words)];

        // Dimension de l'embedding (plus petit que les vrais embeddings, mais suffisant)
        const dimension = 64;
        const embedding = new Array(dimension).fill(0);

        // Pour chaque mot, calculer sa contribution à l'embedding
        for (const word of uniqueWords) {
            // Fonction de hachage simple pour convertir un mot en nombre
            let hash = 0;
            for (let i = 0; i < word.length; i++) {
                hash = (hash << 5) - hash + word.charCodeAt(i);
                hash |= 0; // Convertir en entier 32 bits
            }

            // Distribuer la valeur du hash dans plusieurs dimensions
            for (let i = 0; i < dimension; i++) {
                const value = (hash + i * 37) % 997; // Nombre premier pour meilleure distribution
                embedding[i] += (value / 997) * 2 - 1; // Normaliser entre -1 et 1
            }
        }

        // Normaliser le vecteur (important pour la similarité cosinus)
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (let i = 0; i < dimension; i++) {
                embedding[i] /= norm;
            }
        }

        return embedding;
    } catch (error) {
        console.error("Erreur lors de la génération de l'embedding:", error);
        throw error;
    }
}

/**
 * Calcule la similarité cosinus entre deux vecteurs
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error("Les vecteurs doivent avoir la même dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Trouve le document le plus similaire à une requête
 * @param query Texte de la requête
 * @param documents Liste des documents avec embeddings
 * @param threshold Seuil de similarité minimal (défaut: 0.7)
 */
export async function findMostSimilarDocument(
    query: string,
    documents: EmbeddingData[],
    threshold = 0.7
): Promise<{ document: EmbeddingData | null; similarity: number }> {
    try {
        // Générer l'embedding pour la requête
        const queryEmbedding = await generateEmbedding(query);

        let bestMatch: EmbeddingData | null = null;
        let highestSimilarity = -1;

        // Parcourir tous les documents
        for (const doc of documents) {
            if (!doc.embedding || doc.embedding.length === 0) {
                continue;
            }

            const similarity = cosineSimilarity(queryEmbedding, doc.embedding);

            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = doc;
            }
        }

        // Vérifier si la similarité dépasse le seuil
        if (highestSimilarity < threshold) {
            return { document: null, similarity: highestSimilarity };
        }

        return { document: bestMatch, similarity: highestSimilarity };
    } catch (error) {
        console.error("Erreur lors de la recherche du document similaire:", error);
        throw error;
    }
}
