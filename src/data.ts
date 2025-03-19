// Response structure
export interface ResponseData {
    /** List of triggers that will activate this response */
    triggers: string[];
    /** Message to send when a trigger is detected */
    response: string;
    /** Description of the response for documentation */
    description?: string;
}

/**
 * Database of pre-recorded responses
 * Each entry contains:
 * - triggers: Keywords that will trigger the response
 * - response: Text to send when a trigger is detected
 * - description: Description of the response (optional)
 */
export const RESPONSES: ResponseData[] = [
    {
        triggers: ["help", "need help", "assist me"],
        response: "Here's how I can help you:\n- /foo command to say Hello World\n- Ask me questions and I'll do my best to answer",
        description: "General help response"
    },
    {
        triggers: ["what is", "what's", "what are"],
        response: "That's an excellent question! I'm an assistant bot that automatically responds to certain keywords.",
        description: "Response to 'what is...' questions"
    },
    {
        triggers: ["hello", "hi", "hey", "greetings"],
        response: "Hi there! How can I help you today?",
        description: "Response to greetings"
    },
    {
        triggers: ["thanks", "thank you", "thx", "ty"],
        response: "You're welcome! I'm here to help.",
        description: "Response to thanks"
    },
    {
        triggers: ["discord.js", "discord bot", "bot discord"],
        response: "I'm a Discord bot built with the Discord API, Cloudflare Workers and TypeScript!",
        description: "Information about the bot"
    },
    {
        triggers: ["how does it work", "how it works", "functionality"],
        response: "I monitor messages and automatically respond when I detect certain keywords. I'm hosted on Cloudflare Workers!",
        description: "Explanation of functionality"
    },
    {
        triggers: ["code", "github", "source"],
        response: "My source code is available on Github! Ask my creator for more information.",
        description: "Information about the source code"
    },
    {
        triggers: ["who are you", "your name", "identify yourself"],
        response: "I'm a virtual assistant designed to automatically respond to certain types of questions and messages.",
        description: "Bot introduction"
    },
    {
        triggers: ["lol", "haha", "funny"],
        response: "Glad that made you laugh ! 😄",
        description: "Response to laughter"
    },
    {
        triggers: ["problem", "error", "bug", "issue"],
        response: "If you're encountering a problem, try to describe specifically what's not working. I'll try to help!",
        description: "Help with problems"
    }
];
