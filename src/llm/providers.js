import { buildPrompt } from './prompt-builder.js';
import { log } from '../logger.js';

export class OpenAiProvider {
  constructor({ apiKey, model }) { this.apiKey = apiKey; this.model = model; }

  async generate(input) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: buildPrompt(input) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`LLM request failed with status ${response.status}`);
    const body = await response.json();
    return body.output_text?.trim() || 'I could not generate guidance from the available context.';
  }
}

export class GroundedMockProvider {
  async generate({ question, decision }) {
    const points = decision.selectedContext.map(({ label, value }) => `${label}: ${typeof value === 'object' ? Object.entries(value).map(([k, v]) => `${k} ${v}`).join(', ') : value}`);
    const lead = decision.tone === 'Motivational' ? 'You have a useful foundation to move forward thoughtfully.' : 'Here is grounded guidance from your selected context.';
    return `${lead} For your question about ${decision.intent}, consider this: ${points.join(' ')} Based on these signals, take a measured next step, gather practical information, and revisit the decision as circumstances develop. This is reflective astrological guidance, not a certainty.`;
  }
}

export function createLlmProvider({ apiKey, model }) {
  if (apiKey) return new OpenAiProvider({ apiKey, model });
  log('log', 'llm_mock_enabled');
  return new GroundedMockProvider();
}
