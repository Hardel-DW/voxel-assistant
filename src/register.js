/**
 * This file is meant to be run from the command line, and is not used by the
 * application server.  It's allowed to use node.js primitives, and only needs
 * to be run once.
 */

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	RouteBases,
	Routes,
} from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { FOO_COMMAND } from "./commands.js";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config({ path: ".dev.vars" });

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;

if (!token) {
	throw new Error("The DISCORD_TOKEN environment variable is required.");
}
if (!applicationId) {
	throw new Error(
		"The DISCORD_APPLICATION_ID environment variable is required.",
	);
}

/**
 * The main function that runs the script.
 */
async function main() {
	console.log("Registering commands...");
	const rest = new REST({ version: "10" }).setToken(token);

	const commands = [
		{
			type: ApplicationCommandType.ChatInput,
			...FOO_COMMAND,
		},
	];

	const route = Routes.applicationCommands(applicationId);
	await rest.put(route, { body: commands });
	console.log("Commands registered!");
}

main()
	.then(() => {
		console.log("Done!");
		process.exit(0);
	})
	.catch((e) => {
		console.error("Error during deployment:");
		console.error(e);
		process.exit(1);
	});
