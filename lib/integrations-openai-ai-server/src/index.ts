// Solo se exporta el cliente. Los módulos de imagen/audio/batch de la
// plantilla de Replit exigen sus variables al importarse y la app no los usa.
export { openai, isAiEnabled, AI_MODEL } from "./client";
