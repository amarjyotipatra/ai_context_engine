import test from 'node:test';
import assert from 'node:assert/strict';
import { PersonalizationEngine } from '../src/personalization/engine.js';
import { ContextLoader } from '../src/services/context-loader.js';
import { TtlCache } from '../src/services/cache.js';
import { mockUpstreams } from '../src/services/mock-upstreams.js';
import { createServer } from '../src/app.js';

const profile = { language: 'en', tonePreference: 'motivational', subscription: 'premium' };
const context = {
  horoscope: { career: 'Networking may bring new opportunities.', relationship: 'Communication improves.', health: 'Prioritize sleep.', finance: 'Avoid risk.' },
  kundli: { moonSign: 'Scorpio', currentDasha: { mahadasha: 'Rahu', antardasha: 'Mars' }, houses: { 6: { strength: 'Average' }, 7: { strength: 'Weak' }, 10: { strength: 'Strong' } } },
  panchang: { tithi: 'Shukla Panchami' },
};

test('career selects career-specific sources and excludes relationship data', () => {
  const decision = new PersonalizationEngine().decide({ question: 'Should I switch jobs?', profile, context, failedSources: [] });
  assert.equal(decision.intent, 'career');
  assert.deepEqual(decision.selectedContext.map(({ label }) => label), ['Career Horoscope', '10th House', 'Current Dasha', "Today's Panchang"]);
  assert.ok(decision.excludedContext.includes('Relationship Horoscope'));
  assert.equal(decision.confidence, 'HIGH');
});

test('missing primary context lowers confidence without rejecting the decision', () => {
  const decision = new PersonalizationEngine().decide({ question: 'How is my health?', profile, context: { kundli: context.kundli }, failedSources: ['Horoscope'] });
  assert.equal(decision.intent, 'health');
  assert.equal(decision.confidence, 'MEDIUM');
  assert.deepEqual(decision.selectedContext.map(({ label }) => label), ['6th House', 'Moon Sign']);
});

test('context loader tolerates one failed service and caches successful result', async () => {
  const client = { ...mockUpstreams, getHoroscope: async () => { throw new Error('unavailable'); } };
  const loader = new ContextLoader({ client, cache: new TtlCache(10_000), timeoutMs: 50, retries: 0 });
  const first = await loader.load('user_101');
  const second = await loader.load('user_101');
  assert.deepEqual(first.failedSources, ['Horoscope']);
  assert.equal(second.cacheHit, true);
});

test('debug route returns a decision without invoking the LLM', async (t) => {
  let llmCalls = 0;
  const loader = { load: async () => ({ context: { user: profile, ...context }, failedSources: [], cacheHit: false }) };
  const server = createServer({ loader, engine: new PersonalizationEngine(), llm: { generate: async () => { llmCalls += 1; } } });
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/debug/personalization`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 'user_101', question: 'Should I change my job?' }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.intent, 'career');
  assert.equal(llmCalls, 0);
});
