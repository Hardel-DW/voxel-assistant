import { config } from "dotenv";

// Charge les variables d'environnement
config();

// Type pour les commandes Discord
enum ApplicationCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3
}

// Constantes depuis les variables d'environnement
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;

if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID) {
    console.error("Variables d'environnement manquantes. Vérifiez votre fichier .env");
    process.exit(1);
}

// Commande slash à enregistrer
const COMMANDS = [
    {
        name: "foo",
        description: "Répond avec Hello World",
        type: ApplicationCommandType.CHAT_INPUT
    }
];

// Fonction pour enregistrer les commandes
async function registerCommands() {
    try {
        const response = await fetch(`https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`, {
            method: "PUT",
            headers: {
                Authorization: `Bot ${DISCORD_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(COMMANDS)
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Les commandes ont été enregistrées avec succès:", data);
            return data;
        }

        const error = await response.text();
        console.error("Erreur lors de l'enregistrement des commandes:", error);
        throw new Error(`Erreur HTTP: ${response.status} - ${error}`);
    } catch (error) {
        console.error("Erreur lors de l'enregistrement des commandes:", error);
        throw error;
    }
}

// Exécute l'enregistrement
registerCommands()
    .then(() => console.log("Terminé !"))
    .catch((error) => {
        console.error("Échec:", error);
        process.exit(1);
    });
