export function log(level, event, fields = {}) {
  const safeFields = { ...fields };
  // Never include question, birth details, prompt, answer, or an API key in logs.
  console[level === 'error' ? 'error' : 'log'](JSON.stringify({
    timestamp: new Date().toISOString(), level, event, ...safeFields,
  }));
}
