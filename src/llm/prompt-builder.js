function stringify(value) {
  if (typeof value !== 'object') return String(value);
  return Object.entries(value).map(([key, item]) => `${key}: ${item}`).join(', ');
}

export function buildPrompt({ question, profile, decision }) {
  const facts = decision.selectedContext.map(({ label, value }) => `- ${label}: ${stringify(value)}`).join('\n');
  return `You are MyNaksh's personalized astrology guidance assistant. Answer only from the supplied facts; do not invent chart placements, dates, or predictions. Frame advice as reflective guidance, not certainty. Do not give medical, legal, or financial instructions.\n\nUser question: ${question}\nResponse language: ${decision.language}\nTone: ${decision.tone}\nMaximum length: ${decision.maxWords} words\nUser name: ${profile?.name ?? 'User'}\n\nSelected grounded context:\n${facts || '- No domain context was available.'}\n\nWrite a direct, helpful response. Mention uncertainty when the context is incomplete.`;
}
