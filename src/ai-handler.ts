import { getMarkdownResponses, getResponseContent, responsesToEmbeddingData } from "./markdown-loader";
import { findMostSimilarDocument } from "./util/embeddings";

// Interface pour les résultats avec score
interface SearchResult {
    document: {
        id?: string;
        content: string;
        name: string;
        embedding: number[];
    };
    keywordScore: number;
    embeddingScore: number;
    aggregateScore: number;
}

/**
 * Calcule un score de correspondance directe basé sur les mots-clés
 * @param query Requête de l'utilisateur
 * @param content Contenu à comparer
 * @param manualKeywords Mots-clés manuels qui ont plus de poids
 */
function calculateKeywordMatchScore(query: string, content: string, manualKeywords?: string[]): number {
    // Normaliser textes
    const normalizedQuery = query
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const normalizedContent = content
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Extraire les mots-clés (mots de 3+ caractères)
    const queryWords = normalizedQuery.split(" ").filter((word) => word.length > 2);
    const uniqueQueryWords = [...new Set(queryWords)];

    if (uniqueQueryWords.length === 0) return 0;

    // Compter les mots-clés trouvés dans le contenu
    let matchCount = 0;
    let manualMatchCount = 0;
    let manualKeywordCount = 0;

    // Vérifier les correspondances avec les mots-clés manuels (si présents)
    if (manualKeywords && manualKeywords.length > 0) {
        manualKeywordCount = manualKeywords.length;
        for (const word of uniqueQueryWords) {
            for (const keyword of manualKeywords) {
                if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
                    manualMatchCount++;
                    break;
                }
            }
        }
    }

    // Vérifier les correspondances dans le contenu normal
    for (const word of uniqueQueryWords) {
        if (normalizedContent.includes(word)) {
            matchCount++;
        }
    }

    // Calculer le score: % de mots-clés trouvés (contenu) + bonus pour les mots-clés manuels
    const contentScore = matchCount / uniqueQueryWords.length;

    // Si aucun mot-clé manuel, retourner simplement le score de contenu
    if (!manualKeywords || manualKeywordCount === 0) {
        return contentScore;
    }

    // Sinon, calculer un score pondéré (les mots-clés manuels ont un poids plus important)
    const manualScore = manualMatchCount / uniqueQueryWords.length;
    return contentScore * 0.3 + manualScore * 0.7; // 70% pour les mots-clés manuels, 30% pour le contenu
}

/**
 * Fonction pour trouver la réponse la plus pertinente
 * Utilise une approche hybride combinant embeddings et mots-clés
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

        // Scoring hybride: combiner embeddings et mots-clés
        const results: SearchResult[] = [];

        for (const doc of documents) {
            // Score par mots-clés (0-1), en utilisant les mots-clés manuels s'ils existent
            const keywordScore = calculateKeywordMatchScore(query, doc.content, doc.keywords);

            // On calcule le score embedding si on a un embedding
            if (doc.embedding && doc.embedding.length > 0) {
                // Ce score sera calculé plus tard avec findMostSimilarDocument
                results.push({
                    document: doc,
                    keywordScore,
                    embeddingScore: 0, // Sera mis à jour plus tard
                    aggregateScore: 0 // Sera calculé après
                });
            } else if (keywordScore > 0.3) {
                // Si pas d'embedding mais bon score par mots-clés, on considère quand même
                results.push({
                    document: doc,
                    keywordScore,
                    embeddingScore: 0,
                    aggregateScore: 0
                });
            }
        }

        // Si aucun résultat, on abandonne
        if (results.length === 0) {
            console.log("Aucun document pertinent trouvé par mots-clés");
            return null;
        }

        // Calculer les scores d'embedding pour les documents pré-filtrés
        // (optimisation: on ne calcule pas pour tous les documents)
        const validDocs = results.map((r) => r.document);
        const embeddingResult = await findMostSimilarDocument(query, validDocs, 0.2); // Seuil très bas

        // Mettre à jour les scores d'embedding
        for (const result of results) {
            if (result.document.id === embeddingResult.document?.id) {
                result.embeddingScore = embeddingResult.similarity;
            }
        }

        // Score agrégé: 70% embeddings + 30% mots-clés
        for (const result of results) {
            result.aggregateScore = result.embeddingScore * 0.7 + result.keywordScore * 0.3;
        }

        // Trier par score agrégé
        results.sort((a, b) => b.aggregateScore - a.aggregateScore);

        // Log pour débogage
        console.log(`Requête: "${query}"`);
        console.log("Top 3 résultats:");
        for (let i = 0; i < Math.min(3, results.length); i++) {
            const r = results[i];
            console.log(
                `${i + 1}. ${r.document.id} (${r.document.name}): Score=${r.aggregateScore.toFixed(2)} [E=${r.embeddingScore.toFixed(2)}, K=${r.keywordScore.toFixed(2)}]`
            );
        }

        // Sélectionner le meilleur résultat si score suffisant
        if (results.length > 0 && results[0].aggregateScore > 0.25) {
            return results[0].document.id || null;
        }

        return null;
    } catch (error) {
        console.error("Erreur lors de la recherche:", error);
        return null;
    }
}

/**
 * Fonction principale pour traiter une question et obtenir une réponse
 */
export async function processQuestion(question: string, env?: any): Promise<string> {
    try {
        // Chercher la meilleure réponse avec notre approche hybride
        const bestMatch = await findBestResponseWithEmbeddings(question, env);

        if (bestMatch) {
            return await getResponseContent(bestMatch, env);
        }

        // Aucune correspondance trouvée, utiliser la réponse par défaut
        return await getResponseContent("default", env);
    } catch (error) {
        console.error("Erreur lors du traitement de la question:", error);
        return "Désolé, une erreur s'est produite lors du traitement de votre question.";
    }
}
