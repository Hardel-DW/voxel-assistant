import { processQuestion } from "../../ai-handler";
import type { CommandHandler } from "../types";

export const handleAsk: CommandHandler = async (options, _, env) => {
    if (!options?.question) {
        return "Vous devez me poser une question!";
    }

    // Obtenir la question des options
    const question = options.question;

    // Utiliser notre système d'IA pour générer une réponse
    return await processQuestion(question, env);
};
