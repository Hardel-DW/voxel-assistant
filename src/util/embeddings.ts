import { pipeline } from "@xenova/transformers";

// Interface pour les embeddings
export interface EmbeddingData {
    id?: string;
    content: string;
    embedding: number[];
    name: string;
}

// Cache pour le modèle d'embedding
let embeddingModel: any = null;

/**
 * Obtient le modèle d'embedding
 */
export async function getEmbeddingModel() {
    if (!embeddingModel) {
        embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embeddingModel;
}

/**
 * Génère un embedding pour un texte
 * @param text Texte à encoder
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const model = await getEmbeddingModel();
        const result = await model(text, { pooling: "mean", normalize: true });

        // Convertir le tensor en array JavaScript standard
        return Array.from(result.data);
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
