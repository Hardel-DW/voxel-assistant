import { getMarkdownResponses, getResponseContent, responsesToEmbeddingData } from "./markdown-loader";
import { findMostSimilarDocument } from "./util/embeddings";

/**
 * Fonction pour trouver la réponse la plus pertinente en utilisant les embeddings
 */
export async function findBestResponseWithEmbeddings(query: string, env?: any): Promise<string | null> {
    try {
        // Récupérer toutes les réponses
        const responses = await getMarkdownResponses(env);

        // Ignorer les recherches très courtes
        if (query.length < 5) {
            return null;
        }

        // Convertir les réponses en format compatible
        const documents = responsesToEmbeddingData(responses);

        // Filtrer les documents qui n'ont pas d'embedding
        const validDocuments = documents.filter((doc) => doc.embedding && doc.embedding.length > 0);

        // Si aucun document valide, retourner null
        if (validDocuments.length === 0) {
            console.log("Aucun document avec embedding trouvé");
            return null;
        }

        // Loggons les documents disponibles
        console.log(`Documents disponibles: ${validDocuments.length}`);
        for (const doc of validDocuments) {
            console.log(`- Document: ${doc.id}, Nom: ${doc.name}`);
        }

        // Trouver le document le plus similaire avec un seuil de similarité plus bas (0.3)
        const result = await findMostSimilarDocument(query, validDocuments, 0.3);

        // Log détaillé pour le débogage
        console.log(`Requête: "${query}"`);
        console.log(`Meilleur score: ${result.similarity.toFixed(4)}`);
        if (result.document) {
            console.log(`Document trouvé: ${result.document.name}`);
            console.log(`Contenu: ${result.document.content.substring(0, 50)}...`);
        }

        if (result.document?.id) {
            console.log(`Document trouvé: ${result.document.name} avec score: ${result.similarity.toFixed(2)}`);
            return result.document.id;
        }

        console.log(`Aucun document trouvé avec un score suffisant (max: ${result.similarity.toFixed(2)})`);
        return null;
    } catch (error) {
        console.error("Erreur lors de la recherche avec embeddings:", error);
        return null;
    }
}

/**
 * Fonction principale pour traiter une question et obtenir une réponse
 */
export async function processQuestion(question: string, env?: any): Promise<string> {
    try {
        // Chercher la meilleure réponse avec les embeddings
        const embeddingMatch = await findBestResponseWithEmbeddings(question, env);

        if (embeddingMatch) {
            return await getResponseContent(embeddingMatch, env);
        }

        // Aucune correspondance trouvée, utiliser la réponse par défaut
        return await getResponseContent("default", env);
    } catch (error) {
        console.error("Erreur lors du traitement de la question:", error);
        return "Désolé, une erreur s'est produite lors du traitement de votre question.";
    }
}
