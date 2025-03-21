import { getMarkdownResponses, getResponseContent } from "./markdown-loader";

/**
 * Fonction qui utilise l'IA de Cloudflare (Llama 3.3) avec KV existant
 * pour sélectionner la réponse prédéfinie la plus pertinente
 */
export async function processQuestionWithAI(question: string, env?: any): Promise<string> {
    try {
        // Étape 1: Normaliser la question
        const normalizedQuestion = question.trim().replace(/\s+/g, " ");

        if (normalizedQuestion.length < 5) {
            return await getResponseContent("default", env);
        }

        // Étape 2: Récupérer toutes les réponses prédéfinies depuis KV
        const responses = await getMarkdownResponses(env);

        if (!responses || Object.keys(responses).length === 0) {
            console.log("Aucune réponse prédéfinie trouvée dans KV");
            return await getResponseContent("default", env);
        }

        // Étape 3: Créer un message système pour l'IA
        const systemMessage = `
Tu es un assistant Discord qui doit sélectionner la réponse prédéfinie la plus appropriée.
Tu dois analyser la question de l'utilisateur et choisir la réponse prédéfinie qui correspond le mieux.
Tu répondras UNIQUEMENT au format JSON avec la structure suivante:
{
  "selectedResponseId": "id-de-la-réponse-choisie",
  "confidence": 0.85, // entre 0 et 1
  "reasoning": "Brève explication de ton choix (max 50 mots)"
}
Si aucune réponse ne correspond bien (confidence < 0.6), retourne "default" comme selectedResponseId.`;

        // Étape 4: Construire le message utilisateur avec les réponses disponibles
        const contextResponses = Object.entries(responses).map(([id, response]) => ({
            id,
            name: response.name || id,
            keywords: response.keywords || [],
            content: response.content
        }));

        const userMessage = `Question: "${normalizedQuestion}"

Voici les réponses prédéfinies disponibles:
${contextResponses
    .map(
        (r) => `ID: ${r.id}
${r.keywords?.length ? `Mots-clés: ${r.keywords.join(", ")}` : ""}
Nom: ${r.name}
Contenu: ${r.content.substring(0, 150)}...
---`
    )
    .join("\n")}

Choisis la réponse la plus appropriée pour la question.`;

        // Étape 5: Appeler l'IA de Cloudflare
        const stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            stream: false,
            temperature: 0.2,
            response_format: { type: "json" }
        });

        // Étape 6: Traiter la réponse de l'IA
        const aiResponse = await stream.json();
        console.log("Réponse IA:", aiResponse);

        let selectedId = "default";
        try {
            if (aiResponse && typeof aiResponse === "object") {
                selectedId = aiResponse.selectedResponseId || "default";
                console.log(`IA a sélectionné: ${selectedId} avec confiance: ${aiResponse.confidence}`);
            }
        } catch (parseError) {
            console.error("Erreur lors de l'analyse de la réponse de l'IA:", parseError);
            throw new Error("Impossible d'analyser la réponse de l'IA");
        }

        // Étape 7: Récupérer le contenu de la réponse sélectionnée
        return await getResponseContent(selectedId, env);
    } catch (error) {
        console.error("Erreur dans processQuestionWithAI:", error);
        throw error; // Ne pas gérer l'erreur ici, la laisser remonter pour que le handler la gère
    }
}
