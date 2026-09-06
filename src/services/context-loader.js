import { withResilience } from './resilient-client.js';
import { log } from '../logger.js';

const SOURCE_OPERATIONS = [
  ['User Profile', 'user', (client, userId) => client.getUser(userId)],
  ['Kundli', 'kundli', (client, userId) => client.getKundli(userId)],
  ['Horoscope', 'horoscope', (client, userId) => client.getHoroscope(userId)],
  ["Today's Panchang", 'panchang', (client) => client.getPanchang()],
];

export class ContextLoader {
  constructor({ client, cache, timeoutMs, retries }) {
    this.client = client;
    this.cache = cache;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
  }

  async load(userId) {
    const cached = this.cache.get(`context:${userId}`);
    if (cached) {
      log('log', 'context_cache_hit', { userId, availableSources: cached.availableSources });
      return { ...cached, cacheHit: true };
    }

    // Construct all promises first: no source waits for another source.
    const results = await Promise.allSettled(SOURCE_OPERATIONS.map(([label, key, invoke]) =>
      withResilience({
        source: label,
        operation: () => invoke(this.client, userId),
        timeoutMs: this.timeoutMs,
        retries: this.retries,
      }).then((data) => ({ label, key, data })),
    ));

    const context = {};
    const failedSources = [];
    results.forEach((result, index) => {
      const [label] = SOURCE_OPERATIONS[index];
      if (result.status === 'fulfilled') context[result.value.key] = result.value.data;
      else failedSources.push(label);
    });
    const loaded = {
      context, failedSources,
      availableSources: SOURCE_OPERATIONS.filter(([, key]) => context[key]).map(([label]) => label),
      cacheHit: false,
    };
    this.cache.set(`context:${userId}`, loaded);
    log('log', 'context_loaded', { userId, availableSources: loaded.availableSources, failedSources });
    return loaded;
  }
}
