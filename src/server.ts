import { InteractionType, verifyKey } from "discord-interactions";
import { processQuestion } from "./ai-handler";
import { InteractionResponseType, executeCommand } from "./commands";

export interface Env {
    DISCORD_PUBLIC_KEY: string;
    DISCORD_APPLICATION_ID: string;
    DISCORD_BOT_TOKEN: string;
}

// Type pour le contexte d'exécution
interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
}

// Fonction pour vérifier la signature Discord
async function verifyDiscordSignature(request: Request, env: Env): Promise<boolean> {
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");

    if (!signature || !timestamp) {
        return false;
    }

    const bodyText = await request.clone().text();
    return verifyKey(bodyText, signature, timestamp, env.DISCORD_PUBLIC_KEY);
}

// Fonction pour envoyer un message à Discord
async function sendDiscordMessage(channelId: string, content: string, env: Env): Promise<Response> {
    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Erreur lors de l'envoi du message:", error);
            return new Response(`Erreur: ${response.status} - ${error}`, { status: 500 });
        }

        return new Response("Message envoyé", { status: 200 });
    } catch (error) {
        console.error("Erreur lors de l'envoi du message:", error);
        return new Response("Erreur serveur", { status: 500 });
    }
}

// Fonction pour trouver une réponse avec l'IA
async function findAIResponse(messageText: string, env?: any): Promise<string | null> {
    try {
        // Utiliser directement processQuestion qui gère l'ensemble du processus
        return await processQuestion(messageText, env);
    } catch (error) {
        console.error("Erreur lors de la recherche d'une réponse IA:", error);
        return null;
    }
}

// Gestionnaire principal des requêtes Discord
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        console.log(`Requête reçue: ${request.method} ${request.url}`);

        // Répondre à une requête GET simple pour vérifier que le service fonctionne
        if (request.method === "GET") {
            return new Response("Bot Discord en ligne!", {
                headers: { "Content-Type": "text/plain" }
            });
        }

        // Traiter les interactions Discord
        if (request.method === "POST") {
            try {
                const isValid = await verifyDiscordSignature(request.clone(), env);

                if (!isValid) {
                    return new Response("Signature invalide", { status: 401 });
                }

                const interaction = await request.json();
                console.log("Interaction reçue:", JSON.stringify(interaction));

                // Répondre au ping Discord (vérification du webhook)
                if (interaction.type === InteractionType.PING) {
                    return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }

                // Répondre aux commandes slash
                if (interaction.type === InteractionType.APPLICATION_COMMAND) {
                    const commandName = interaction.data.name;

                    // Construire la structure d'options en préservant la hiérarchie des sous-commandes
                    let options: Record<string, any> | undefined = undefined;

                    if (interaction.data.options && Array.isArray(interaction.data.options) && interaction.data.options.length > 0) {
                        options = {};

                        for (const option of interaction.data.options) {
                            // Pour les sous-commandes (type 1) ou groupes (type 2), préserver la structure hiérarchique
                            if (option.type === 1 || option.type === 2) {
                                options[option.name] = {};

                                // Traiter les options de la sous-commande
                                if (option.options && Array.isArray(option.options)) {
                                    for (const subOption of option.options) {
                                        options[option.name][subOption.name] = subOption.value;
                                    }
                                }
                            } else {
                                // Options simples pour les commandes de base
                                options[option.name] = option.value;
                            }
                        }
                    }

                    console.log("Options construites:", JSON.stringify(options));

                    // Exécuter la commande de manière asynchrone en passant l'objet interaction et env
                    const commandResponse = await executeCommand(commandName, options, interaction, env);

                    if (commandResponse) {
                        return new Response(
                            JSON.stringify({
                                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: { content: commandResponse }
                            }),
                            { headers: { "Content-Type": "application/json" } }
                        );
                    }

                    return new Response(
                        JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: { content: "Commande non reconnue" }
                        }),
                        { headers: { "Content-Type": "application/json" } }
                    );
                }

                // Traiter les composants de message (boutons, menus déroulants, etc.)
                if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
                    return new Response(
                        JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: { content: "Action reçue!" }
                        }),
                        { headers: { "Content-Type": "application/json" } }
                    );
                }

                // Réception d'un message normal
                if (interaction.type === 0 && interaction.content) {
                    const messageContent = interaction.content;
                    const channelId = interaction.channel_id;

                    // Chercher une réponse avec notre système d'IA en passant l'objet env
                    const aiResponse = await findAIResponse(messageContent, env);

                    // Si l'IA trouve une réponse, l'utiliser
                    if (aiResponse) {
                        ctx.waitUntil(sendDiscordMessage(channelId, aiResponse, env));
                    }

                    // Ne pas bloquer l'interaction
                    return new Response(JSON.stringify({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }

                // Réponse par défaut pour les autres interactions
                return new Response(
                    JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: "Type d'interaction non pris en charge" }
                    }),
                    { headers: { "Content-Type": "application/json" } }
                );
            } catch (error) {
                console.error("Erreur:", error);
                return new Response("Erreur serveur", { status: 500 });
            }
        }

        // Méthode non autorisée
        return new Response("Méthode non autorisée", { status: 405 });
    }
};
