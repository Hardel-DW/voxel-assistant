import { processQuestionWithAI } from "../../ai-handler";
import type { CommandHandler } from "../types";

export const handleAsk: CommandHandler = async (options, _, env) => {
    if (!options?.question) {
        return "Vous devez me poser une question!";
    }

    // Obtenir la question des options
    const question = options.question;

    // Vérifier si l'IA de Cloudflare est disponible
    if (!env?.AI) {
        return "Le système d'IA n'est pas disponible actuellement. Veuillez réessayer plus tard.";
    }

    try {
        // Utiliser uniquement le nouveau système d'IA avec Llama 3.3
        return await processQuestionWithAI(question, env);
    } catch (error) {
        console.error("Erreur avec le système d'IA de Cloudflare:", error);
        // Message d'erreur explicite au lieu d'utiliser l'ancien système
        return "Désolé, une erreur s'est produite avec le système d'IA. Veuillez réessayer votre question plus tard.";
    }
};
