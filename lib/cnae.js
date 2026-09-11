((root, factory) => {
  const api = factory(root.JuceesCnaeDescriptions || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesCnae = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (descriptions) => {
  function normalizeCode(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return /^\d{7}$/.test(digits) ? digits : '';
  }
  function formatCode(value) {
    const code = normalizeCode(value);
    return code ? `${code.slice(0,4)}-${code.slice(4,5)}/${code.slice(5)}` : '';
  }
  function officialDescription(value) {
    const code = normalizeCode(value);
    return code ? String(descriptions[code] || '') : '';
  }
  function extractCodes(text) {
    const source = String(text ?? '');
    const matches = source.match(/\d{4}\s*[-.]?\s*\d\s*[\/.]?\s*\d{2}|(?<!\d)\d{7}(?!\d)/g) || [];
    const seen = new Set();
    const result = [];
    for (const match of matches) {
      const code = normalizeCode(match);
      if (code && !seen.has(code)) { seen.add(code); result.push(code); }
    }
    return result;
  }
  function parseList(text) {
    const source = String(text ?? '');
    const seen = new Set();
    const codes = [];
    const invalid = [];
    const matches = source.match(/\d{4}\s*[-.]?\s*\d\s*[\/.]?\s*\d{2}|(?<!\d)\d{7}(?!\d)/g) || [];
    for (const match of matches) {
      const code = normalizeCode(match);
      if (code && !seen.has(code)) { seen.add(code); codes.push(code); }
    }
    const leftovers = source
      .replace(/\d{4}\s*[-.]?\s*\d\s*[\/.]?\s*\d{2}|(?<!\d)\d{7}(?!\d)/g, ' ')
      .split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
    for (const item of leftovers) if (/\d/.test(item)) invalid.push(item);
    return { codes, invalid };
  }
  function makePlan(codes, principalCode) {
    const principal = normalizeCode(principalCode);
    const unique = [];
    const seen = new Set();
    for (const value of Array.isArray(codes) ? codes : []) {
      const code = normalizeCode(value);
      if (!code || seen.has(code)) continue;
      seen.add(code); unique.push(code);
    }
    return unique.map((code) => ({
      code,
      formatted: formatCode(code),
      role: principal && code === principal ? 'principal' : 'secondary',
      expectedDescription: officialDescription(code)
    }));
  }
  return { normalizeCode, formatCode, officialDescription, extractCodes, parseList, makePlan };
});
