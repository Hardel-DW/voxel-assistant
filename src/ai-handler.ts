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
            temperature: 0.2
        });

        // Étape 6: Traiter la réponse de l'IA
        console.log("Réponse IA brute:", stream);

        // La réponse pourrait être directement l'objet ou une propriété de l'objet retourné
        let aiResponseText = "";

        if (typeof stream === "string") {
            aiResponseText = stream;
        } else if (stream && typeof stream === "object") {
            // Vérifier les différentes propriétés possibles qui pourraient contenir la réponse
            if (stream.response) {
                aiResponseText = stream.response;
            } else if (stream.text) {
                aiResponseText = stream.text;
            } else if (stream.content) {
                aiResponseText = stream.content;
            } else if (stream.result?.response) {
                aiResponseText = stream.result.response;
            } else {
                // Tenter de convertir l'objet entier en JSON
                aiResponseText = JSON.stringify(stream);
            }
        }

        console.log("Texte extrait:", aiResponseText);

        // Essayer de parser le JSON à partir du texte de la réponse
        let aiResponse: { selectedResponseId?: string; confidence?: number; reasoning?: string } | undefined;
        let selectedId = "default";

        try {
            // Trouver le JSON dans la réponse - rechercher un objet entre accolades
            const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                console.log("JSON détecté:", jsonStr);
                aiResponse = JSON.parse(jsonStr);
            } else {
                console.log("Aucun JSON détecté dans la réponse, utilisant la réponse par défaut");
            }

            if (aiResponse && typeof aiResponse === "object") {
                selectedId = aiResponse.selectedResponseId || "default";
                console.log(`IA a sélectionné: ${selectedId} avec confiance: ${aiResponse.confidence || "non spécifiée"}`);
            }
        } catch (parseError) {
            console.error("Erreur lors de l'analyse de la réponse de l'IA:", parseError);
            console.log("Texte qui a causé l'erreur:", aiResponseText);
            // Utiliser la réponse par défaut plutôt que de lancer une erreur
            console.log("Utilisation de la réponse par défaut en raison de l'erreur de parsing");
        }

        // Étape 7: Récupérer le contenu de la réponse sélectionnée
        return await getResponseContent(selectedId, env);
    } catch (error) {
        console.error("Erreur dans processQuestionWithAI:", error);
        throw error; // Ne pas gérer l'erreur ici, la laisser remonter pour que le handler la gère
    }
}
