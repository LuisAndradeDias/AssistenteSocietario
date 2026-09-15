((root, factory) => {
  const api = factory(root.JuceesProcessBaseline, root.JuceesProcessData);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesProcessAutomation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (baseline, processData) => {
  const FORBIDDEN = ['avancar', 'proximo', 'prosseguir', 'continuar', 'salvar', 'gravar', 'enviar', 'finalizar', 'concluir', 'transmitir', 'protocolar', 'assinar', 'gerar taxa'];
  const BLOCKING_STATUSES = Object.freeze(['conflict', 'ambiguous', 'unverified', 'screen_error', 'not_found', 'invalid']);

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\u00a0\s]+/g, ' ')
      .replace(/[“”"'`´]/g, '')
      .replace(/[?:*]+$/g, '')
      .trim();
  }

  function normalizeValue(value) {
    return String(value ?? '').replace(/\r\n?/g, '\n');
  }

  function isForbiddenActionLabel(value) {
    const label = normalizeText(value);
    return FORBIDDEN.some((term) => label === term || label.startsWith(`${term} `) || label.includes(` ${term} `));
  }

  function scalarValueDecision(currentValue, requestedValue) {
    const current = normalizeValue(currentValue);
    const requested = normalizeValue(requestedValue);
    if (!requested.trim()) return { status: 'invalid', detail: 'Valor solicitado vazio.' };
    if (current === requested) return { status: 'verified', detail: 'Valor já idêntico no portal.' };
    if (current.trim()) return { status: 'conflict', detail: 'O portal já possui valor diferente; o conteúdo existente foi preservado.' };
    return { status: 'apply', detail: 'Campo vazio e pronto para aplicação.' };
  }

  function setValueDecision(currentValues, requestedValues) {
    const current = [...new Set((currentValues || []).map((value) => normalizeText(value)).filter(Boolean))].sort();
    const requested = [...new Set((requestedValues || []).map((value) => normalizeText(value)).filter(Boolean))].sort();
    if (!requested.length) return { status: 'invalid', detail: 'Nenhuma opção foi solicitada.' };
    if (current.length && JSON.stringify(current) === JSON.stringify(requested)) return { status: 'verified', detail: 'Seleção já idêntica no portal.' };
    if (current.length) return { status: 'conflict', detail: 'O portal já possui seleção diferente; as opções existentes foram preservadas.' };
    return { status: 'apply', detail: 'Grupo vazio e pronto para aplicação.' };
  }

  function optionMatchesRequested(option, requested) {
    const target = normalizeText(requested);
    if (!target) return false;
    return [option.label, option.value].some((candidate) => normalizeText(candidate) === target);
  }

  function labelElementsFor(control) {
    const documentRef = control?.ownerDocument;
    if (!control || !documentRef) return [];
    const labels = [];
    if (control.id) {
      for (const label of documentRef.querySelectorAll('label[for]')) {
        if (label.getAttribute('for') === control.id) labels.push(label);
      }
    }
    const wrapping = control.closest?.('label');
    if (wrapping && !labels.includes(wrapping)) labels.push(wrapping);
    return labels;
  }

  function explicitControlTexts(control) {
    const texts = [];
    for (const label of labelElementsFor(control)) texts.push(label.textContent || '');
    const ariaLabel = control.getAttribute?.('aria-label');
    if (ariaLabel) texts.push(ariaLabel);
    const labelledBy = control.getAttribute?.('aria-labelledby');
    if (labelledBy) {
      for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
        const text = control.ownerDocument?.getElementById(id)?.textContent;
        if (text) texts.push(text);
      }
    }
    const placeholder = control.getAttribute?.('placeholder');
    if (placeholder) texts.push(placeholder);
    return [...new Set(texts.map((item) => String(item).trim()).filter(Boolean))];
  }

  function elementIdentifierText(control) {
    return [control?.name, control?.id, control?.getAttribute?.('data-field'), control?.getAttribute?.('formcontrolname')]
      .map((item) => String(item || '').replace(/[\[\]_.-]+/g, ' '))
      .filter(Boolean)
      .join(' ');
  }

  function aliasScore(aliases, texts, identifier = '') {
    const normalizedAliases = (aliases || []).map(normalizeText).filter(Boolean);
    const normalizedTexts = (texts || []).map(normalizeText).filter(Boolean);
    let score = 0;
    let exact = false;
    for (const alias of normalizedAliases) {
      for (const text of normalizedTexts) {
        if (text === alias) { score = Math.max(score, 12); exact = true; }
        else if (alias.length >= 6 && text.includes(alias)) score = Math.max(score, 7);
        else if (text.length >= 6 && alias.includes(text)) score = Math.max(score, 5);
      }
      const normalizedIdentifier = normalizeText(identifier);
      if (normalizedIdentifier && normalizedIdentifier.includes(alias.replace(/\s+/g, ' '))) score = Math.max(score, 4);
      const compactIdentifier = normalizedIdentifier.replace(/\s+/g, '');
      const compactAlias = alias.replace(/\s+/g, '');
      if (compactAlias.length >= 5 && compactIdentifier.includes(compactAlias)) score = Math.max(score, 6);
    }
    return { score, exact };
  }

  function isUsableControl(control) {
    if (!control || control.disabled) return false;
    const type = String(control.type || '').toLowerCase();
    return !['hidden', 'submit', 'button', 'reset', 'file', 'image'].includes(type);
  }

  function simpleBinding(field, documentRef) {
    const selector = field.kind === 'textarea'
      ? 'textarea'
      : field.kind === 'choice'
        ? 'select, input:not([type]), input[type="text"], input[type="search"]'
        : 'input:not([type="radio"]):not([type="checkbox"]), textarea, select';
    const candidates = [];
    for (const control of documentRef.querySelectorAll(selector)) {
      if (!isUsableControl(control)) continue;
      const texts = explicitControlTexts(control);
      const scored = aliasScore(field.aliases, texts, elementIdentifierText(control));
      if (scored.score < 7) continue;
      candidates.push({ type: 'simple', control, label: texts[0] || field.label, score: scored.score, exact: scored.exact });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return { status: 'not_found', field };
    if (candidates.length > 1 && candidates[0].score === candidates[1].score) return { status: 'ambiguous', field, candidates: candidates.slice(0, 4) };
    if (!candidates[0].exact && candidates[0].score < 10) return { status: 'ambiguous', field, candidates: candidates.slice(0, 4) };
    return { status: 'mapped', field, ...candidates[0] };
  }

  function commonAncestor(elements) {
    if (!elements.length) return null;
    let node = elements[0];
    while (node) {
      if (elements.every((item) => node.contains(item))) return node;
      node = node.parentElement;
    }
    return null;
  }

  function groupQuestionTexts(controls) {
    const first = controls[0];
    if (!first) return [];
    const texts = [];
    const ancestor = commonAncestor(controls);
    const fieldset = first.closest?.('fieldset');
    const container = fieldset || ancestor;
    if (fieldset?.querySelector('legend')) texts.push(fieldset.querySelector('legend').textContent || '');
    if (container) {
      for (const selector of [':scope > label', ':scope > .label', ':scope > .form-label', ':scope > p', ':scope > h4', ':scope > h5', ':scope > h6']) {
        try {
          for (const item of container.querySelectorAll(selector)) {
            const text = String(item.textContent || '').trim();
            if (text && !/^sim$|^n[aã]o$/i.test(text)) texts.push(text);
          }
        } catch {}
      }
      const aria = container.getAttribute?.('aria-label');
      if (aria) texts.push(aria);
    }
    return [...new Set(texts.filter(Boolean))];
  }

  function controlOption(control) {
    const labels = labelElementsFor(control);
    const label = labels[0]?.textContent?.trim() || control.getAttribute?.('aria-label') || String(control.value || '');
    return { control, label, value: String(control.value ?? ''), checked: Boolean(control.checked) };
  }

  function groupedControls(documentRef, selector) {
    const groups = new Map();
    let anonymous = 0;
    for (const control of documentRef.querySelectorAll(selector)) {
      if (!isUsableControl(control)) continue;
      const key = control.name ? `name:${control.name}` : `anon:${anonymous++}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(control);
    }
    return [...groups.entries()].map(([key, controls]) => ({ key, controls }));
  }

  function semanticContainerGroups(field, documentRef, selector) {
    const aliases = new Set((field.aliases || []).map(normalizeText).filter(Boolean));
    const candidates = [];
    const seen = new Set();
    const labelNodes = documentRef.querySelectorAll('legend,h1,h2,h3,h4,h5,h6,label,p,strong,[role="heading"]');
    for (const node of labelNodes) {
      const label = String(node.textContent || '').trim();
      if (!aliases.has(normalizeText(label))) continue;
      let ancestor = node.parentElement;
      let best = null;
      for (let depth = 0; ancestor && depth < 5; depth += 1, ancestor = ancestor.parentElement) {
        const controls = [...ancestor.querySelectorAll(selector)].filter(isUsableControl);
        if (!controls.length || controls.length > 40) continue;
        if (!best || controls.length < best.controls.length) best = { controls, container: ancestor };
      }
      if (!best) continue;
      const signature = best.controls.map((control) => control.name || control.id || control.value).join('|');
      if (seen.has(signature)) continue;
      seen.add(signature);
      candidates.push({
        type: 'group', controls: best.controls, options: best.controls.map(controlOption),
        label, score: 12, exact: true
      });
    }
    return candidates;
  }

  function groupBinding(field, documentRef) {
    const selector = field.kind === 'multi_choice' ? 'input[type="checkbox"]' : 'input[type="radio"]';
    const candidates = [];
    for (const group of groupedControls(documentRef, selector)) {
      const questionTexts = groupQuestionTexts(group.controls);
      const identifier = group.controls.map(elementIdentifierText).join(' ');
      const scored = aliasScore(field.aliases, questionTexts, identifier);
      if (scored.score < 7) continue;
      candidates.push({
        type: 'group', controls: group.controls, options: group.controls.map(controlOption),
        label: questionTexts[0] || field.label, score: scored.score, exact: scored.exact
      });
    }
    if (!candidates.length) candidates.push(...semanticContainerGroups(field, documentRef, selector));
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return { status: 'not_found', field };
    if (candidates.length > 1 && candidates[0].score === candidates[1].score) return { status: 'ambiguous', field, candidates: candidates.slice(0, 4) };
    if (!candidates[0].exact && candidates[0].score < 10) return { status: 'ambiguous', field, candidates: candidates.slice(0, 4) };
    return { status: 'mapped', field, ...candidates[0] };
  }

  function findFieldBinding(field, documentRef = typeof document !== 'undefined' ? document : null) {
    if (!documentRef || !field) return { status: 'not_found', field };
    if (['collection', 'dynamic_questions', 'status'].includes(field.kind)) return { status: 'manual', field };
    if (['boolean', 'multi_choice'].includes(field.kind)) return groupBinding(field, documentRef);
    if (field.kind === 'choice') {
      const select = simpleBinding(field, documentRef);
      if (select.status === 'mapped' && select.control.tagName === 'SELECT') return select;
      const radios = groupBinding({ ...field, kind: 'choice' }, documentRef);
      if (select.status === 'mapped' && radios.status === 'mapped') return { status: 'ambiguous', field, candidates: [select, radios] };
      return radios.status === 'mapped' ? radios : select;
    }
    return simpleBinding(field, documentRef);
  }

  function currentBindingValues(binding) {
    if (binding?.type === 'simple') {
      if (binding.control.tagName === 'SELECT') {
        const selected = binding.control.selectedOptions?.[0];
        return selected ? [selected.textContent?.trim() || selected.value] : [];
      }
      return [normalizeValue(binding.control.value)];
    }
    if (binding?.type === 'group') return binding.options.filter((option) => option.control.checked).map((option) => option.label || option.value);
    return [];
  }

  function setNativeValue(control, value) {
    const prototype = Object.getPrototypeOf(control);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor?.set) descriptor.set.call(control, value);
    else control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    control.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function clickControl(control) {
    const label = labelElementsFor(control)[0];
    if (label && typeof label.click === 'function') label.click();
    else if (typeof control.click === 'function') control.click();
    else {
      control.checked = true;
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function selectOptionDecision(control, requestedValue) {
    const options = [...control.options].map((option) => ({ option, label: option.textContent?.trim() || '', value: option.value }));
    const matches = options.filter((item) => optionMatchesRequested(item, requestedValue));
    if (matches.length !== 1) return { status: matches.length ? 'ambiguous' : 'not_found', detail: matches.length ? 'Mais de uma opção corresponde ao valor solicitado.' : 'Opção solicitada não localizada de forma exata.' };
    const selected = control.selectedOptions?.[0];
    const current = selected && selected.value !== '' ? { label: selected.textContent?.trim() || '', value: selected.value } : null;
    if (current && optionMatchesRequested(current, requestedValue)) return { status: 'verified', detail: 'Opção já selecionada.', target: matches[0] };
    if (current) return { status: 'conflict', detail: 'O portal já possui opção diferente; a seleção existente foi preservada.' };
    return { status: 'apply', detail: 'Seleção vazia e pronta para aplicação.', target: matches[0] };
  }

  function requestedOptionValues(field, requested) {
    if (field.kind === 'boolean') {
      if (requested === true) return ['sim', 'true', '1'];
      if (requested === false) return ['não', 'nao', 'false', '0'];
      return [];
    }
    return Array.isArray(requested) ? requested.map(String) : [String(requested ?? '')];
  }

  function groupDecision(binding, requested) {
    const requestedValues = requestedOptionValues(binding.field, requested);
    if (!requestedValues.length) return { status: 'invalid', detail: 'Valor solicitado inválido para este grupo.' };

    let targets = [];
    if (binding.field.kind === 'boolean') {
      const matches = binding.options.filter((option) => requestedValues.some((requestedValue) => optionMatchesRequested(option, requestedValue)));
      const uniqueMatches = [...new Set(matches)];
      if (uniqueMatches.length !== 1) {
        return {
          status: uniqueMatches.length ? 'ambiguous' : 'not_found',
          detail: uniqueMatches.length ? 'Mais de uma opção corresponde ao valor booleano solicitado.' : 'A opção Sim/Não solicitada não foi localizada de forma inequívoca.'
        };
      }
      targets = uniqueMatches;
    } else {
      for (const requestedValue of requestedValues) {
        const matches = binding.options.filter((option) => optionMatchesRequested(option, requestedValue));
        if (matches.length !== 1) return { status: matches.length ? 'ambiguous' : 'not_found', detail: matches.length ? 'Mais de uma opção corresponde ao valor solicitado.' : `Opção "${requestedValue}" não localizada exatamente.` };
        if (!targets.includes(matches[0])) targets.push(matches[0]);
      }
    }

    const current = binding.options.filter((option) => option.control.checked);
    const currentLabels = current.map((option) => option.label || option.value);
    const targetLabels = targets.map((option) => option.label || option.value);
    const decision = setValueDecision(currentLabels, targetLabels);
    return { ...decision, targets };
  }

  function analyzeField(field, requestedRecord, documentRef) {
    const requestedProvided = requestedRecord && Object.prototype.hasOwnProperty.call(requestedRecord, 'value');
    const requested = requestedProvided ? requestedRecord.value : undefined;
    if (field.mode === baseline?.MODES?.BLOCKED) return { key: field.key, label: field.label, mode: field.mode, status: 'blocked', detail: 'Automação proibida para este campo/ação.', requestedProvided };
    if (field.mode === baseline?.MODES?.MANUAL) return { key: field.key, label: field.label, mode: field.mode, status: 'manual', detail: 'Ação/decisão mantida manual.', requestedProvided };
    if (['collection', 'dynamic_questions'].includes(field.kind)) return { key: field.key, label: field.label, mode: field.mode, status: requestedProvided ? 'manual' : 'not_informed', detail: requestedProvided ? 'Dado disponível, mas esta coleção exige módulo específico ou DOM homologado.' : 'Dado não informado.', requestedProvided };

    const binding = findFieldBinding(field, documentRef);
    if (binding.status !== 'mapped') return { key: field.key, label: field.label, mode: field.mode, status: binding.status, detail: binding.status === 'ambiguous' ? 'Mais de um controle pode corresponder a este campo.' : 'Controle não localizado com evidência suficiente.', requestedProvided };

    const currentValues = currentBindingValues(binding);
    if (!requestedProvided) return { key: field.key, label: field.label, mode: field.mode, status: 'not_informed', detail: 'Campo reconhecido, mas nenhum valor foi informado.', requestedProvided, current: currentValues };
    if (field.mode === baseline?.MODES?.CONFERENCE) {
      const comparable = binding.type === 'group' ? groupDecision(binding, requested) : binding.control.tagName === 'SELECT' ? selectOptionDecision(binding.control, requested) : scalarValueDecision(binding.control.value, requested);
      return { key: field.key, label: field.label, mode: field.mode, status: comparable.status === 'verified' ? 'confirmed' : 'conference', detail: comparable.status === 'verified' ? 'Valor conferido e idêntico.' : 'Campo de conferência: compare o valor atual com o solicitado; nenhuma alteração foi feita.', requestedProvided, current: currentValues };
    }

    const decision = binding.type === 'group'
      ? groupDecision(binding, requested)
      : binding.control.tagName === 'SELECT'
        ? selectOptionDecision(binding.control, requested)
        : scalarValueDecision(binding.control.value, requested);
    return { key: field.key, label: field.label, mode: field.mode, status: decision.status === 'verified' ? 'confirmed' : decision.status === 'apply' ? 'ready' : decision.status, detail: decision.detail, requestedProvided, current: currentValues };
  }

  function headings(documentRef) {
    return [...documentRef.querySelectorAll('h1,h2,h3,h4,h5,h6,legend,[role="heading"]')]
      .map((item) => String(item.textContent || '').trim()).filter(Boolean).slice(0, 120);
  }

  function stageTextScore(stage, documentRef, cachedHeadings = null, cachedBodyText = null) {
    const headingTexts = cachedHeadings || headings(documentRef).map(normalizeText);
    const bodyText = cachedBodyText ?? normalizeText((documentRef.body?.innerText || documentRef.body?.textContent || '').slice(0, 24000));
    let score = 0;
    let exactHeading = false;
    for (const aliasRaw of stage.aliases || []) {
      const alias = normalizeText(aliasRaw);
      if (!alias || alias.length < 4) continue;
      if (headingTexts.some((heading) => heading === alias)) { score += 10; exactHeading = true; }
      else if (headingTexts.some((heading) => heading.includes(alias) || alias.includes(heading))) score += 5;
      else if (bodyText.includes(alias)) score += 2;
    }
    return { stage, score, exactHeading, mappedFields: 0 };
  }

  function enrichStageScore(candidate, documentRef) {
    let mappedFields = 0;
    let extra = 0;
    for (const field of candidate.stage.fields.slice(0, 8)) {
      if (['collection', 'dynamic_questions', 'status'].includes(field.kind)) continue;
      const binding = findFieldBinding(field, documentRef);
      if (binding.status === 'mapped') { extra += binding.exact ? 3 : 1; mappedFields += 1; }
    }
    return { ...candidate, score: candidate.score + extra, mappedFields };
  }

  function detectStage(documentRef = typeof document !== 'undefined' ? document : null) {
    if (!documentRef || !baseline?.STAGES) return { supported: false, detail: 'Baseline de processo indisponível.' };
    const headingTexts = headings(documentRef).map(normalizeText);
    const bodyText = normalizeText((documentRef.body?.innerText || documentRef.body?.textContent || '').slice(0, 24000));
    const textScored = baseline.STAGES.map((stage) => stageTextScore(stage, documentRef, headingTexts, bodyText)).sort((a, b) => b.score - a.score);
    const shortlist = textScored.slice(0, 6).map((item) => item.score > 0 ? enrichStageScore(item, documentRef) : item);
    const scored = [...shortlist, ...textScored.slice(6)].sort((a, b) => b.score - a.score);
    const best = scored[0];
    const second = scored[1];
    if (!best || best.score < 6) return { supported: false, detail: 'A tela atual ainda não possui evidência estrutural suficiente para uma etapa da baseline.', candidates: scored.slice(0, 3).map((item) => ({ id: item.stage.id, title: item.stage.title, score: item.score })) };
    if (second && second.score === best.score && best.stage.id !== second.stage.id) return { supported: false, ambiguous: true, detail: `A tela corresponde igualmente a ${best.stage.id} e ${second.stage.id}; nenhuma ação será executada.`, candidates: scored.slice(0, 3).map((item) => ({ id: item.stage.id, title: item.stage.title, score: item.score })) };
    const confidence = best.exactHeading || best.mappedFields >= 2 || best.score >= 12 ? 'high' : 'medium';
    return { supported: true, stage: best.stage, stageId: best.stage.id, title: best.stage.title, confidence, score: best.score, detail: `${best.stage.id} — ${best.stage.title} reconhecida com confiança ${confidence === 'high' ? 'alta' : 'moderada'}.` };
  }

  function forbiddenActions(documentRef) {
    if (!documentRef) return [];
    const found = [];
    for (const element of documentRef.querySelectorAll('button,a,input[type="button"],input[type="submit"]')) {
      const label = String(element.textContent || element.value || element.getAttribute?.('aria-label') || '').trim();
      if (label && isForbiddenActionLabel(label)) found.push(label);
    }
    return [...new Set(found)].slice(0, 20);
  }

  function valuesRecord(values, key) {
    if (!values || !Object.prototype.hasOwnProperty.call(values, key)) return null;
    const raw = values[key];
    return raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'value') ? raw : { value: raw, source: 'manual' };
  }

  function analyzeCurrentScreen(values = {}, documentRef = typeof document !== 'undefined' ? document : null) {
    const detected = detectStage(documentRef);
    if (!detected.supported) return { ok: false, ...detected, forbiddenActions: forbiddenActions(documentRef), fields: [] };
    const stage = detected.stage;
    const fields = stage.fields.map((field) => analyzeField(field, valuesRecord(values, field.key), documentRef));
    const counts = fields.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});
    return { ok: true, supported: true, stageId: stage.id, title: stage.title, phase: stage.phase, mode: stage.mode, status: stage.status, confidence: detected.confidence, detail: detected.detail, notes: stage.notes, applyEnabled: stage.applyEnabled, specialized: stage.specialized, fields, counts, forbiddenActions: forbiddenActions(documentRef) };
  }

  function applySimpleBinding(binding, requested) {
    const control = binding.control;
    if (control.tagName === 'SELECT') {
      const decision = selectOptionDecision(control, requested);
      if (decision.status !== 'apply') return decision;
      control.value = decision.target.option.value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
      const confirmed = control.value === decision.target.option.value;
      return { status: confirmed ? 'confirmed' : 'unverified', detail: confirmed ? 'Seleção aplicada e confirmada no DOM.' : 'O portal não confirmou a seleção após o evento.' };
    }
    const decision = scalarValueDecision(control.value, requested);
    if (decision.status !== 'apply') return decision.status === 'verified' ? { status: 'confirmed', detail: decision.detail } : decision;
    setNativeValue(control, normalizeValue(requested));
    const confirmed = normalizeValue(control.value) === normalizeValue(requested);
    return { status: confirmed ? 'confirmed' : 'unverified', detail: confirmed ? 'Valor aplicado e confirmado no DOM.' : 'O portal não confirmou exatamente o valor após o preenchimento.' };
  }

  function applyGroupBinding(binding, requested) {
    const decision = groupDecision(binding, requested);
    if (decision.status !== 'apply') return decision.status === 'verified' ? { status: 'confirmed', detail: decision.detail } : decision;
    for (const target of decision.targets) clickControl(target.control);
    const checked = binding.options.filter((option) => option.control.checked).map((option) => option.label || option.value);
    const expected = decision.targets.map((option) => option.label || option.value);
    const confirmed = setValueDecision(checked, expected).status === 'verified';
    return { status: confirmed ? 'confirmed' : 'unverified', detail: confirmed ? 'Opção aplicada e confirmada pelo estado checked.' : 'O estado checked não confirmou exatamente a seleção solicitada.' };
  }

  function applyCurrentStage(values = {}, requestedStageId = '', documentRef = typeof document !== 'undefined' ? document : null) {
    const analysis = analyzeCurrentScreen(values, documentRef);
    if (!analysis.ok) return { ok: false, detail: analysis.detail, analysis, results: [] };
    if (requestedStageId && analysis.stageId !== requestedStageId) return { ok: false, detail: `A aba está em ${analysis.stageId}, mas o painel solicitou ${requestedStageId}. Nada foi alterado.`, analysis, results: [] };
    if (analysis.confidence !== 'high') return { ok: false, detail: 'A etapa foi reconhecida apenas com confiança moderada. Envie o DOM desta tela para homologação antes de aplicar dados.', analysis, results: [] };
    const stage = baseline.getStage(analysis.stageId);
    if (!stage?.applyEnabled || [baseline.MODES.BLOCKED, baseline.MODES.MANUAL, baseline.MODES.CONFERENCE].includes(stage.mode)) return { ok: false, detail: 'Esta etapa é somente manual/conferência na baseline; nenhuma alteração foi executada.', analysis, results: [] };
    if (stage.specialized === 'activities') return { ok: false, detail: 'Objetos/CNAEs usam módulos especializados. Utilize os controles específicos do painel.', analysis, results: [] };
    if (stage.specialized === 'questions') return { ok: false, detail: 'Perguntas complementares usam o módulo dinâmico específico.', analysis, results: [] };

    const preflightBlocker = analysis.fields.find((item) => item.requestedProvided && BLOCKING_STATUSES.includes(item.status));
    if (preflightBlocker) {
      return {
        ok: false,
        detail: `${preflightBlocker.label}: ${preflightBlocker.detail} Nenhum campo da etapa foi alterado.`,
        stageId: stage.id,
        results: analysis.fields,
        analysis
      };
    }

    const results = [];
    for (const field of stage.fields) {
      const record = valuesRecord(values, field.key);
      if (!record || record.value === null || record.value === undefined || record.value === '') {
        results.push({ key: field.key, label: field.label, status: 'not_informed', detail: 'Sem valor explícito; nada foi alterado.' });
        continue;
      }
      if (![baseline.MODES.AUTO_SAFE, baseline.MODES.ASSISTED].includes(field.mode)) {
        results.push({ key: field.key, label: field.label, status: field.mode === baseline.MODES.BLOCKED ? 'blocked' : 'manual', detail: 'Campo mantido apenas para conferência/decisão humana.' });
        continue;
      }
      if (['collection', 'dynamic_questions'].includes(field.kind)) {
        results.push({ key: field.key, label: field.label, status: 'manual', detail: 'Coleção requer módulo específico ou DOM homologado.' });
        continue;
      }
      const binding = findFieldBinding(field, documentRef);
      if (binding.status !== 'mapped') {
        results.push({ key: field.key, label: field.label, status: binding.status, detail: binding.status === 'ambiguous' ? 'Controle ambíguo; nada foi alterado.' : 'Controle não localizado; nada foi alterado.' });
        if (record) break;
        continue;
      }
      const result = binding.type === 'group' ? applyGroupBinding(binding, record.value) : applySimpleBinding(binding, record.value);
      results.push({ key: field.key, label: field.label, ...result });
      if (BLOCKING_STATUSES.includes(result.status)) break;
    }
    const hasBlocker = results.some((item) => BLOCKING_STATUSES.includes(item.status));
    const confirmed = results.filter((item) => item.status === 'confirmed').length;
    return { ok: !hasBlocker, detail: hasBlocker ? 'A aplicação foi interrompida em modo fail-closed. Revise o primeiro conflito antes de continuar.' : `${confirmed} campo(s) confirmado(s). Nenhum comando de avanço/salvamento foi executado.`, stageId: stage.id, results, analysis: analyzeCurrentScreen(values, documentRef) };
  }

  function stableQuestionKey(text, name = '') {
    const stableName = normalizeText(name).replace(/\d{4,}/g, ':id');
    const input = `${normalizeText(text)}|${stableName}`;
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `q-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function scanDynamicQuestions(documentRef = typeof document !== 'undefined' ? document : null) {
    if (!documentRef) return [];
    const questions = [];
    const seen = new Set();
    for (const group of groupedControls(documentRef, 'input[type="radio"]')) {
      const texts = groupQuestionTexts(group.controls);
      const questionText = texts.find((text) => text.includes('?')) || texts[0] || '';
      if (!questionText) continue;
      const key = stableQuestionKey(questionText, group.controls[0]?.name || '');
      if (seen.has(key)) continue;
      seen.add(key);
      const options = group.controls.map(controlOption);
      questions.push({ key, questionText: questionText.trim(), inputType: 'radio', nameHint: String(group.controls[0]?.name || '').replace(/\d{4,}/g, ':id'), options: options.map((option) => ({ label: option.label, value: option.value, checked: option.checked })) });
    }
    for (const select of documentRef.querySelectorAll('select')) {
      const texts = explicitControlTexts(select);
      const questionText = texts.find((text) => text.includes('?')) || texts[0] || '';
      if (!questionText) continue;
      const key = stableQuestionKey(questionText, select.name || select.id || '');
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push({ key, questionText: questionText.trim(), inputType: 'select', nameHint: String(select.name || '').replace(/\d{4,}/g, ':id'), options: [...select.options].map((option) => ({ label: option.textContent?.trim() || '', value: option.value, checked: option.selected })) });
    }
    return questions.slice(0, 80);
  }

  function findQuestionByKey(questionKey, documentRef) {
    const all = scanDynamicQuestions(documentRef);
    return all.find((item) => item.key === questionKey) || null;
  }

  function resolveDynamicQuestion(questionKey, documentRef) {
    const question = findQuestionByKey(questionKey, documentRef);
    if (!question) return { status: 'not_found', key: questionKey, detail: 'Pergunta não localizada novamente no DOM.' };

    if (question.inputType === 'radio') {
      const matchedGroups = groupedControls(documentRef, 'input[type="radio"]').filter((group) => {
        const texts = groupQuestionTexts(group.controls);
        const text = texts.find((item) => item.includes('?')) || texts[0] || '';
        return stableQuestionKey(text, group.controls[0]?.name || '') === questionKey;
      });
      if (matchedGroups.length !== 1) {
        return {
          status: matchedGroups.length ? 'ambiguous' : 'not_found',
          key: questionKey,
          questionText: question.questionText,
          detail: 'Não foi possível reencontrar um único grupo de opções para a pergunta.'
        };
      }
      const actualControls = matchedGroups[0].controls;
      return {
        status: 'mapped',
        question,
        binding: { type: 'group', field: { kind: 'choice' }, controls: actualControls, options: actualControls.map(controlOption) }
      };
    }

    const matchingSelects = [...documentRef.querySelectorAll('select')].filter((select) => {
      const texts = explicitControlTexts(select);
      const text = texts.find((item) => item.includes('?')) || texts[0] || '';
      return stableQuestionKey(text, select.name || select.id || '') === questionKey;
    });
    if (matchingSelects.length !== 1) {
      return {
        status: matchingSelects.length ? 'ambiguous' : 'not_found',
        key: questionKey,
        questionText: question.questionText,
        detail: 'Não foi possível reencontrar um único select para a pergunta.'
      };
    }
    return { status: 'mapped', question, binding: { type: 'simple', control: matchingSelects[0] } };
  }

  function dynamicQuestionDecision(binding, requested) {
    if (binding.type === 'group') return groupDecision(binding, requested);
    return selectOptionDecision(binding.control, requested);
  }

  function applyDynamicQuestions(answers = {}, documentRef = typeof document !== 'undefined' ? document : null) {
    const entries = Object.entries(answers || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
    if (!entries.length) return { ok: false, detail: 'Nenhuma resposta explícita foi informada; nada foi alterado.', results: [] };

    const planned = [];
    const preflightResults = [];
    for (const [questionKey, requested] of entries) {
      const resolved = resolveDynamicQuestion(questionKey, documentRef);
      if (resolved.status !== 'mapped') {
        const failure = { key: questionKey, questionText: resolved.questionText || '', status: resolved.status, detail: resolved.detail };
        return { ok: false, detail: `${failure.detail} Nenhuma resposta foi alterada.`, results: [...preflightResults, failure] };
      }
      const decision = dynamicQuestionDecision(resolved.binding, requested);
      const normalizedStatus = decision.status === 'verified' ? 'confirmed' : decision.status === 'apply' ? 'ready' : decision.status;
      const diagnostic = { key: questionKey, questionText: resolved.question.questionText, status: normalizedStatus, detail: decision.detail };
      preflightResults.push(diagnostic);
      if (BLOCKING_STATUSES.includes(decision.status)) {
        return { ok: false, detail: `${resolved.question.questionText}: ${decision.detail} Nenhuma resposta foi alterada.`, results: preflightResults };
      }
      planned.push({ questionKey, requested, resolved });
    }

    const results = [];
    for (const item of planned) {
      const result = item.resolved.binding.type === 'group'
        ? applyGroupBinding(item.resolved.binding, item.requested)
        : applySimpleBinding(item.resolved.binding, item.requested);
      results.push({ key: item.questionKey, questionText: item.resolved.question.questionText, ...result });
      if (BLOCKING_STATUSES.includes(result.status)) break;
    }
    const hasBlocker = results.some((item) => BLOCKING_STATUSES.includes(item.status));
    return {
      ok: !hasBlocker,
      detail: hasBlocker
        ? 'Uma resposta não foi confirmada após a ação; a execução foi interrompida imediatamente para revisão.'
        : `${results.filter((item) => item.status === 'confirmed').length} resposta(s) confirmada(s).`,
      results
    };
  }

  function checkpoint(values = {}, documentRef = typeof document !== 'undefined' ? document : null) {
    const analysis = analyzeCurrentScreen(values, documentRef);
    if (!analysis.ok) return { status: 'review_required', detail: analysis.detail, analysis, counts: { confirmed: 0, pending: 0, conflicts: 1 } };
    const confirmed = analysis.fields.filter((item) => item.status === 'confirmed').length;
    const conflicts = analysis.fields.filter((item) => ['conflict', 'ambiguous', 'not_found', 'unverified', 'screen_error', 'invalid'].includes(item.status)).length;
    const pending = analysis.fields.filter((item) => ['not_informed', 'ready', 'manual', 'conference', 'blocked'].includes(item.status)).length;
    return { status: conflicts || pending ? 'review_required' : 'ready_for_human_review', detail: conflicts || pending ? `${conflicts} conflito(s)/campo(s) não mapeado(s) e ${pending} pendência(s) nesta etapa.` : 'Etapa sem conflitos conhecidos. Faça a revisão visual antes de avançar manualmente.', stageId: analysis.stageId, counts: { confirmed, pending, conflicts }, fields: analysis.fields, forbiddenActions: analysis.forbiddenActions };
  }

  return {
    normalizeText,
    normalizeValue,
    isForbiddenActionLabel,
    scalarValueDecision,
    setValueDecision,
    optionMatchesRequested,
    groupDecision,
    detectStage,
    analyzeCurrentScreen,
    applyCurrentStage,
    scanDynamicQuestions,
    applyDynamicQuestions,
    checkpoint,
    stableQuestionKey,
    findFieldBinding
  };
});
