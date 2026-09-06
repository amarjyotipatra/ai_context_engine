import { log } from '../logger.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withResilience({ source, operation, timeoutMs, retries }) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error(`${source} timed out after ${timeoutMs}ms`)), timeoutMs,
        )),
      ]);
    } catch (error) {
      lastError = error;
      log('error', 'upstream_attempt_failed', { source, attempt: attempt + 1, reason: error.message });
      if (attempt < retries) await delay(30 * (2 ** attempt));
    }
  }
  throw lastError;
}
