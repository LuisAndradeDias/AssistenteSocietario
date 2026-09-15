((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesObjectAutomation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function normalizeLineEndings(value) {
    return String(value ?? '').replace(/\r\n?/g, '\n');
  }

  function normalizeLabel(value) {
    return String(value ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[?*:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fieldKindFromLabel(value) {
    const label = normalizeLabel(value);
    if (label === 'objeto da empresa') return 'empresa';
    if (label === 'objeto do estabelecimento') return 'estabelecimento';
    return '';
  }

  function objectValueDecision(currentValue, requestedValue) {
    const current = normalizeLineEndings(currentValue);
    const requested = normalizeLineEndings(requestedValue);
    if (!requested.trim()) {
      return { status: 'invalid', detail: 'O texto solicitado está vazio; nada foi alterado.' };
    }
    if (current === requested) {
      return { status: 'verified', detail: 'O portal já contém exatamente o texto solicitado.' };
    }
    if (current.trim()) {
      return { status: 'conflict', detail: 'O portal já contém texto diferente; o conteúdo existente foi preservado para revisão.' };
    }
    return { status: 'apply', detail: 'Campo vazio e pronto para receber o texto solicitado.' };
  }

  function explicitLabelText(element) {
    const documentRef = element?.ownerDocument;
    if (!element || !documentRef) return '';
    if (element.id) {
      const labels = [...documentRef.querySelectorAll('label[for]')]
        .filter((label) => label.getAttribute('for') === element.id);
      if (labels.length === 1) return labels[0].textContent || '';
      if (labels.length > 1) return '';
    }
    const wrapping = element.closest?.('label');
    if (wrapping) return wrapping.textContent || '';
    const aria = element.getAttribute?.('aria-label');
    if (aria) return aria;
    const labelledBy = element.getAttribute?.('aria-labelledby');
    if (labelledBy) {
      const parts = labelledBy.split(/\s+/).filter(Boolean)
        .map((id) => documentRef.getElementById(id)?.textContent || '')
        .filter(Boolean);
      if (parts.length) return parts.join(' ');
    }
    return '';
  }

  function objectFields(documentRef = typeof document !== 'undefined' ? document : null) {
    if (!documentRef) return [];
    const fields = [];
    for (const element of documentRef.querySelectorAll('textarea')) {
      const label = explicitLabelText(element);
      const kind = fieldKindFromLabel(label);
      if (!kind) continue;
      fields.push({ kind, element, label: String(label).trim() });
    }
    return fields;
  }

  function analyze(documentRef = typeof document !== 'undefined' ? document : null) {
    if (!documentRef) return { supported: false, detail: 'Documento indisponível.', fields: [] };
    const fields = objectFields(documentRef);
    const company = fields.filter((item) => item.kind === 'empresa');
    const establishment = fields.filter((item) => item.kind === 'estabelecimento');
    const supported = company.length === 1 && establishment.length === 1;
    const detail = supported
      ? 'Objeto da Empresa e Objeto do Estabelecimento foram localizados de forma inequívoca.'
      : `Esperado 1 campo para cada objeto; encontrados empresa=${company.length}, estabelecimento=${establishment.length}. Nada será preenchido até a estrutura ser inequívoca.`;
    return {
      supported,
      detail,
      fields: fields.map((item) => ({ kind: item.kind, label: item.label, hasValue: Boolean(normalizeLineEndings(item.element.value).trim()) }))
    };
  }

  function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
      || Object.getOwnPropertyDescriptor(typeof HTMLTextAreaElement !== 'undefined' ? HTMLTextAreaElement.prototype : {}, 'value');
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function apply(requestedPayload, documentRef = typeof document !== 'undefined' ? document : null) {
    const requested = {
      empresa: normalizeLineEndings(requestedPayload?.objetoEmpresa),
      estabelecimento: normalizeLineEndings(requestedPayload?.objetoEstabelecimento)
    };
    if (!requested.empresa.trim() || !requested.estabelecimento.trim()) {
      return { ok: false, detail: 'Informe os dois objetos antes de aplicar.', results: [] };
    }
    const analysis = analyze(documentRef);
    if (!analysis.supported) return { ok: false, detail: analysis.detail, results: [] };

    const items = objectFields(documentRef);
    const decisions = items.map((item) => ({
      item,
      decision: objectValueDecision(item.element.value, requested[item.kind])
    }));
    const blocker = decisions.find(({ decision }) => !['apply', 'verified'].includes(decision.status));
    if (blocker) {
      return {
        ok: false,
        detail: `${blocker.item.label}: ${blocker.decision.detail}`,
        results: decisions.map(({ item, decision }) => ({ kind: item.kind, status: decision.status, detail: decision.detail }))
      };
    }

    for (const { item, decision } of decisions) {
      if (decision.status === 'apply') setNativeValue(item.element, requested[item.kind]);
    }

    const confirmed = items.every((item) => normalizeLineEndings(item.element.value) === requested[item.kind]);
    if (!confirmed) {
      return {
        ok: false,
        detail: 'O portal não confirmou exatamente um ou mais textos após o preenchimento. Revise a tela; nenhum avanço foi executado.',
        results: items.map((item) => ({
          kind: item.kind,
          status: normalizeLineEndings(item.element.value) === requested[item.kind] ? 'confirmed' : 'unverified',
          detail: normalizeLineEndings(item.element.value) === requested[item.kind] ? 'Conteúdo confirmado.' : 'Conteúdo não confirmado após eventos do campo.'
        }))
      };
    }

    return {
      ok: true,
      detail: 'Os dois objetos foram confirmados exatamente no DOM. Revise o conteúdo visualmente antes de avançar.',
      results: items.map((item) => ({ kind: item.kind, status: 'confirmed', detail: 'Conteúdo confirmado exatamente.' }))
    };
  }

  return {
    normalizeLineEndings,
    normalizeLabel,
    fieldKindFromLabel,
    objectValueDecision,
    analyze,
    apply
  };
});
