((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesPrivacy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function sanitizePagePath(value) {
    try {
      const parsed = new URL(String(value || ''), 'https://simplifica.es.gov.br/');
      return parsed.pathname || '/';
    } catch { return '/'; }
  }
  return { sanitizePagePath };
});
