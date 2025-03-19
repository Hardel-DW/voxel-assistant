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

// Export functions for use in other modules
export { registerCommands };

// Execute operations
async function main() {
    try {
        // Register commands
        await registerCommands();

        console.log("Done!");
    } catch (error) {
        console.error("Failure:", error);
        process.exit(1);
    }
}

main();
