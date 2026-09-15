((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesPerformance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const DEFAULT_PROFILE = 'balanced';
  const profiles = Object.freeze({
    conservative: Object.freeze({ keyDelayMs: 260, afterTypingMs: 950, stableSuggestionMs: 850, betweenCodesMs: 1900 }),
    balanced: Object.freeze({ keyDelayMs: 170, afterTypingMs: 750, stableSuggestionMs: 750, betweenCodesMs: 1300 }),
    fast: Object.freeze({ keyDelayMs: 110, afterTypingMs: 650, stableSuggestionMs: 700, betweenCodesMs: 950 })
  });
  function normalizeProfile(value) { return Object.hasOwn(profiles, value) ? value : DEFAULT_PROFILE; }
  function timingsFor(value) {
    return Object.freeze({ ...profiles[normalizeProfile(value)], suggestionTimeoutMs: 18000, selectionTimeoutMs: 8500, persistentErrorMs: 3200 });
  }
  function profileHint(value) {
    const key = normalizeProfile(value);
    if (key === 'conservative') return 'Conservadora: mais lenta, indicada para homologação e conexões instáveis.';
    if (key === 'fast') return 'Rápida: mantém as mesmas confirmações e timeouts máximos, com intervalos menores.';
    return 'Equilibrada: perfil padrão, prioriza fluidez sem reduzir as confirmações.';
  }
  return { DEFAULT_PROFILE, profiles, normalizeProfile, timingsFor, profileHint };
});
