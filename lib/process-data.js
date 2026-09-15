((root, factory) => {
  const api = factory(root.JuceesProcessBaseline);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesProcessData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (baseline) => {
  function getPath(source, path) {
    if (!source || !path) return undefined;
    return String(path).split('.').reduce((value, key) => {
      if (value === null || value === undefined || typeof value !== 'object') return undefined;
      return value[key];
    }, source);
  }

  function hasValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  function firstDefined(source, paths) {
    for (const path of paths || []) {
      const value = getPath(source, path);
      if (hasValue(value) || value === false || value === 0) return { value, path };
    }
    return { value: undefined, path: '' };
  }

  function extractStageValues(documentData, stageId) {
    const stage = baseline?.getStage?.(stageId);
    if (!stage) return {};
    const result = {};
    for (const field of stage.fields) {
      const found = firstDefined(documentData, field.dossierPaths);
      if (found.value !== undefined) {
        result[field.key] = { value: found.value, source: 'dossier', path: found.path };
      }
    }
    return result;
  }

  function mergeStageValues(documentData, stageId, manualValues = {}) {
    const fromDossier = extractStageValues(documentData, stageId);
    const merged = { ...fromDossier };
    for (const [key, raw] of Object.entries(manualValues || {})) {
      const value = raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'value') ? raw.value : raw;
      if (!hasValue(value) && value !== false && value !== 0) continue;
      merged[key] = { value, source: 'manual', path: '' };
    }
    return merged;
  }

  function serializeManualValue(field, value) {
    if (!field) return value;
    if (field.kind === 'boolean') {
      if (value === true || value === 'true' || value === 'sim' || value === '1') return true;
      if (value === false || value === 'false' || value === 'nao' || value === 'não' || value === '0') return false;
      return null;
    }
    if (field.kind === 'multi_choice') {
      if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
      return String(value ?? '').split(/[\n;,]+/).map((item) => item.trim()).filter(Boolean);
    }
    if (field.kind === 'number') return String(value ?? '').trim();
    return typeof value === 'string' ? value : value == null ? '' : String(value);
  }

  function redactLongIdentifier(value) {
    return String(value ?? '')
      .replace(/\b\d{14}\b/g, '**.***.***/****-**')
      .replace(/\b\d{11}\b/g, '***.***.***-**')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, ':id');
  }

  function previewValue(field, value) {
    if (value === undefined) return 'Não informado';
    if (value === null) return 'Manual';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (Array.isArray(value)) return `${value.length} item(ns)`;
    if (typeof value === 'object') return `${Object.keys(value).length} item(ns)`;
    const text = redactLongIdentifier(String(value));
    if (/cpf|cnpj/i.test(field?.key || '')) return redactLongIdentifier(text);
    return text.length > 90 ? `${text.slice(0, 87)}...` : text;
  }

  function checkpointFromResults(stage, results = []) {
    const counts = { confirmed: 0, ready: 0, manual: 0, conflict: 0, unmapped: 0, notInformed: 0, blocked: 0 };
    for (const item of results) {
      if (['confirmed', 'verified', 'same_existing'].includes(item.status)) counts.confirmed += 1;
      else if (['ready', 'apply'].includes(item.status)) counts.ready += 1;
      else if (['manual', 'conference'].includes(item.status)) counts.manual += 1;
      else if (['conflict', 'ambiguous', 'unverified', 'screen_error', 'invalid'].includes(item.status)) counts.conflict += 1;
      else if (['not_found', 'unmapped'].includes(item.status)) counts.unmapped += 1;
      else if (item.status === 'not_informed') counts.notInformed += 1;
      else if (item.status === 'blocked') counts.blocked += 1;
    }
    const reviewRequired = counts.conflict > 0 || counts.unmapped > 0 || counts.notInformed > 0 || counts.ready > 0 || counts.manual > 0 || counts.blocked > 0;
    return {
      stageId: stage?.id || '',
      counts,
      status: reviewRequired ? 'review_required' : 'ready_for_human_review'
    };
  }

  return {
    getPath,
    hasValue,
    firstDefined,
    extractStageValues,
    mergeStageValues,
    serializeManualValue,
    previewValue,
    checkpointFromResults
  };
});
