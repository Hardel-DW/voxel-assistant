/// <reference types="vite/client" />

// Définition pour le module virtuel de réponses markdown
declare module "virtual:markdown-responses" {
    import type { MarkdownResponsesCache } from "./markdown-loader";
    const responses: MarkdownResponsesCache;
    export default responses;
}
