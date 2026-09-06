import { CONTEXT_CATALOG, INTENT_RULES } from './intent-rules.js';

const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish' };

function detectIntent(question) {
  const normalized = question.toLowerCase();
  const scored = Object.entries(INTENT_RULES).map(([intent, rule]) => [
    intent, rule.keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0),
  ]);
  // General is deliberately the fallback; a domain-specific tie wins.
  scored.sort(([a, left], [b, right]) => right - left || (a === 'general' ? 1 : b === 'general' ? -1 : 0));
  return scored[0][1] > 0 ? scored[0][0] : 'general';
}

function responseLength(question, subscription) {
  if (/today|this week|summarize/i.test(question)) return 120;
  return subscription === 'premium' ? 250 : 160;
}

export class PersonalizationEngine {
  decide({ question, profile, context, failedSources }) {
    const intent = detectIntent(question);
    const rule = INTENT_RULES[intent];
    const candidateKeys = [...rule.primary, ...rule.secondary];
    const selected = candidateKeys
      .map((key) => ({ key, ...CONTEXT_CATALOG[key], value: CONTEXT_CATALOG[key].read(context) }))
      .filter((item) => item.value !== undefined && item.value !== null);
    const excludedContext = rule.excluded.map((key) => CONTEXT_CATALOG[key].label);
    const missingPrimary = rule.primary.filter((key) => !selected.some((item) => item.key === key));

    return {
      intent,
      language: LANGUAGE_NAMES[profile?.language] ?? 'English',
      tone: profile?.tonePreference ? capitalize(profile.tonePreference) : 'Supportive',
      maxWords: responseLength(question, profile?.subscription),
      selectedContext: selected.map(({ key, label, value }) => ({ key, label, value })),
      excludedContext,
      failedSources,
      confidence: missingPrimary.length === 0 ? 'HIGH' : selected.length > 0 ? 'MEDIUM' : 'LOW',
    };
  }
}

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
