import http from 'node:http';
import { config } from './config.js';
import { log } from './logger.js';
import { TtlCache } from './services/cache.js';
import { ContextLoader } from './services/context-loader.js';
import { mockUpstreams } from './services/mock-upstreams.js';
import { PersonalizationEngine } from './personalization/engine.js';
import { createLlmProvider } from './llm/providers.js';

export function createDependencies(overrides = {}) {
  const cache = overrides.cache ?? new TtlCache(config.cacheTtlMs);
  return {
    loader: overrides.loader ?? new ContextLoader({
      client: overrides.upstreamClient ?? mockUpstreams, cache,
      timeoutMs: config.upstreamTimeoutMs, retries: config.upstreamRetries,
    }),
    engine: overrides.engine ?? new PersonalizationEngine(),
    llm: overrides.llm ?? createLlmProvider({ apiKey: config.openAiApiKey, model: config.openAiModel }),
  };
}

function send(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function parseJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new HttpError(413, 'Request body is too large');
  }
  try { return JSON.parse(body); } catch { throw new HttpError(400, 'Request body must be valid JSON'); }
}

function validate(payload) {
  if (!payload || typeof payload.userId !== 'string' || !payload.userId.trim()) throw new HttpError(400, 'userId is required');
  if (typeof payload.question !== 'string' || !payload.question.trim()) throw new HttpError(400, 'question is required');
  if (payload.question.length > 2_000) throw new HttpError(400, 'question must be at most 2000 characters');
}

async function prepare(payload, deps) {
  const loaded = await deps.loader.load(payload.userId);
  if (!loaded.context.user) throw new HttpError(404, 'User profile could not be retrieved');
  const decision = deps.engine.decide({
    question: payload.question, profile: loaded.context.user,
    context: loaded.context, failedSources: loaded.failedSources,
  });
  return { loaded, decision };
}

export function createServer(deps = createDependencies()) {
  return http.createServer(async (request, response) => {
    const requestId = crypto.randomUUID();
    try {
      if (request.method === 'GET' && request.url === '/health') return send(response, 200, { status: 'ok' });
      if (request.method !== 'POST' || !['/personalize', '/debug/personalization'].includes(request.url)) {
        return send(response, 404, { error: { message: 'Route not found', requestId } });
      }
      const payload = await parseJson(request);
      validate(payload);
      const { loaded, decision } = await prepare(payload, deps);
      const common = { requestId, userId: payload.userId, intent: decision.intent, sources: decision.selectedContext.map(({ label }) => label), cacheHit: loaded.cacheHit };

      if (request.url === '/debug/personalization') {
        log('log', 'personalization_debugged', common);
        return send(response, 200, {
          intent: decision.intent,
          selectedContext: decision.selectedContext.map(({ label }) => label),
          excludedContext: decision.excludedContext,
          language: decision.language, tone: decision.tone,
          maxWords: decision.maxWords, confidence: decision.confidence,
          unavailableSources: decision.failedSources,
        });
      }

      let answer;
      try {
        answer = await deps.llm.generate({ question: payload.question, profile: loaded.context.user, decision });
      } catch (error) {
        log('error', 'llm_generation_failed', { requestId, reason: error.message });
        // A provider failure should not discard the safely assembled personalization decision.
        answer = 'I could not generate personalized guidance right now. Please try again shortly.';
      }
      log('log', 'personalization_completed', common);
      return send(response, 200, {
        answer, confidence: decision.confidence,
        sourcesUsed: decision.selectedContext.map(({ label }) => label),
      });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) log('error', 'request_failed', { requestId, reason: error.message });
      return send(response, status, { error: { message: error.message || 'Internal server error', requestId } });
    }
  });
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
