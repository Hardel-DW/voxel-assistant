import { config } from "dotenv";
import { COMMANDS } from "./commands";

// Load environment variables
config();

// Constants from environment variables
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;

if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID) {
    console.error("Missing environment variables. Check your .env file");
    process.exit(1);
}

// Function to register commands
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
            console.log("Commands registered successfully:", data);
            return data;
        }

        const error = await response.text();
        console.error("Error registering commands:", error);
        throw new Error(`HTTP Error: ${response.status} - ${error}`);
    } catch (error) {
        console.error("Error registering commands:", error);
        throw error;
    }
}

// Function to configure bot intents
async function configureBotIntents() {
    try {
        // Get current bot information
        const botInfoResponse = await fetch(`https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/bot`, {
            method: "GET",
            headers: {
                Authorization: `Bot ${DISCORD_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        if (!botInfoResponse.ok) {
            const error = await botInfoResponse.text();
            console.error("Error retrieving bot information:", error);
            throw new Error(`HTTP Error: ${botInfoResponse.status} - ${error}`);
        }

        // Update intents (privileged) to allow message reading
        // Required intents include GUILD_MESSAGES (1 << 9) and MESSAGE_CONTENT (1 << 15)
        // https://discord.com/developers/docs/topics/gateway#message-content-intent
        const intents = (1 << 9) | (1 << 15); // GUILD_MESSAGES | MESSAGE_CONTENT

        const updateResponse = await fetch(`https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/bot`, {
            method: "PATCH",
            headers: {
                Authorization: `Bot ${DISCORD_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                flags: 0, // Reset flags
                intents: intents
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.text();
            console.error("Error updating bot intents:", error);
            throw new Error(`HTTP Error: ${updateResponse.status} - ${error}`);
        }

        console.log("Bot intents configured successfully to read messages");
        return true;
    } catch (error) {
        console.error("Error configuring bot intents:", error);
        console.log('IMPORTANT: You will need to manually enable the "Message Content Intent" in the Discord Developer Portal');
        console.log(
            'Go to https://discord.com/developers/applications, select your application, then "Bot" and enable "Message Content Intent"'
        );
        return false;
    }
}

// Execute operations
async function main() {
    try {
        // Register commands
        await registerCommands();

        // Configure intents
        await configureBotIntents();

        console.log("Done!");
    } catch (error) {
        console.error("Failure:", error);
        process.exit(1);
    }
}

main();
