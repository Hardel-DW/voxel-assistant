import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";

export interface Env {
    DISCORD_PUBLIC_KEY: string;
    DISCORD_APPLICATION_ID: string;
    DISCORD_BOT_TOKEN: string;
}

// Type pour le contexte d'exécution
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
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

export default {
    async fetch(request: Request, env: Env, _: ExecutionContext): Promise<Response> {
        console.log(`Requête reçue: ${request.method} ${request.url}`);

        // Répondre à une requête GET simple
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

                // Répondre à la commande /foo
                if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data.name === "foo") {
                    return new Response(
                        JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: { content: "Hello World" }
                        }),
                        { headers: { "Content-Type": "application/json" } }
                    );
                }

                // Réponse par défaut pour les autres commandes
                return new Response(
                    JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: "Commande non reconnue" }
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
