import OpenAI from "openai";

// AI is optional: without a key the server still starts and the AI routes
// respond 503. The old Replit variables are also accepted.
const apiKey =
  process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL =
  process.env.OPENAI_BASE_URL ?? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

export const isAiEnabled = Boolean(apiKey);

export const openai: OpenAI | null = apiKey
  ? new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  : null;

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.1";
