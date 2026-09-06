import { loadEnvFile } from './env.js';

loadEnvFile();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  upstreamTimeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 800),
  upstreamRetries: Number(process.env.UPSTREAM_RETRIES ?? 2),
  cacheTtlMs: Number(process.env.CACHE_TTL_MS ?? 60_000),
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1',
};
