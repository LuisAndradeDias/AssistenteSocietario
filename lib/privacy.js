((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesPrivacy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function sanitizePagePath(value) {
    try {
      const parsed = new URL(String(value || ''), 'https://simplifica.es.gov.br/');
      const segments = (parsed.pathname || '/').split('/').map((segment) => {
        if (/^\d{7,}$/.test(segment)) return ':id';
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) return ':id';
        return segment;
      });
      return segments.join('/') || '/';
    } catch { return '/'; }
  }
  return { sanitizePagePath };
});
