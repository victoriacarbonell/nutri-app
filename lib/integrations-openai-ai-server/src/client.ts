import OpenAI from "openai";

// La IA es opcional: sin clave, el servidor arranca igual y las rutas de IA
// responden 503. Se aceptan también las variables antiguas de Replit.
const apiKey =
  process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL =
  process.env.OPENAI_BASE_URL ?? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

export const isAiEnabled = Boolean(apiKey);

export const openai: OpenAI | null = apiKey
  ? new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  : null;

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.1";
