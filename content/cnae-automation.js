(function initAutomation(root, factory) {
  const api = factory(root.JuceesCnae);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesCnaeAutomation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (cnaeTools) => {
  const FORBIDDEN_ACTION = /\b(avancar|salvar|enviar|finalizar|protocolar|transmitir|concluir)\b/;
  const SEARCH_ACTION = /\b(pesquisar|buscar|consultar|localizar)\b/;
  const ADD_ACTION = /\b(adicionar|incluir|selecionar|escolher)\b/;
  const MAIN_WORDS = /\b(atividade\s+principal|cnae\s+principal)\b/;
  const SECONDARY_WORDS = /\b(atividades?\s+secundarias?|cnaes?\s+secundarios?)\b/;
  const ADDRESS_QUESTION = /\bexerce\s+atividade\s+no\s+endereco\s+informado\b/;

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function elementText(element) {
    if (!element) return '';
    return normalizeText([
      element.innerText,
      element.textContent,
      element.value,
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('title'),
      element.getAttribute?.('placeholder')
    ].filter(Boolean).join(' '));
  }

  function isForbiddenActionLabel(value) {
    return FORBIDDEN_ACTION.test(normalizeText(value));
  }

  function containsExactCode(value, code) {
    const wanted = cnaeTools.normalizeCode(code);
    return Boolean(wanted && cnaeTools.extractCodes(String(value ?? '')).includes(wanted));
  }

  function normalizeDescription(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function suggestionDescription(value, code) {
    const wanted = cnaeTools.normalizeCode(code);
    if (!wanted) return '';
    const codePattern = new RegExp(
      `${wanted.slice(0, 4)}\\s*[-.]?\\s*${wanted[4]}\\s*[\\/.]?\\s*${wanted.slice(5)}`,
      'i'
    );
    const source = String(value ?? '');
    const match = codePattern.exec(source);
    const description = match ? source.slice(match.index + match[0].length) : source;
    return description.replace(/^\s*[-–—:|]+\s*/, '').trim();
  }

  function descriptionsEquivalent(expected, presented) {
    const official = normalizeDescription(expected);
    const portal = normalizeDescription(presented);
    return Boolean(official && portal && official === portal);
  }

  function suggestionEvidence(value, code, expectedDescription) {
    const wanted = cnaeTools.normalizeCode(code);
    const codes = [...new Set(cnaeTools.extractCodes(String(value ?? '')))];
    const singleExactCode = Boolean(wanted && codes.length === 1 && codes[0] === wanted);
    const presentedDescription = singleExactCode ? suggestionDescription(value, wanted) : '';
    return {
      codes,
      singleExactCode,
      presentedDescription,
      descriptionMatch: singleExactCode && descriptionsEquivalent(expectedDescription, presentedDescription)
    };
  }

  function exactSuggestionDecision(candidates = []) {
    const exact = candidates.filter((item) => item.singleExactCode && item.descriptionMatch);
    if (exact.length === 1) return { status: 'exact', choice: exact[0] };
    if (exact.length > 1) return { status: 'ambiguous' };
    if (candidates.some((item) => item.singleExactCode)) return { status: 'description_mismatch' };
    return { status: 'not_found' };
  }

  function exactPortalSuggestionDecision(candidates = []) {
    const exact = candidates.filter((item) => (
      item.singleExactCode && normalizeDescription(item.presentedDescription)
    ));
    if (exact.length === 1) return { status: 'exact', choice: exact[0] };
    if (exact.length > 1) return { status: 'ambiguous' };
    return { status: 'not_found' };
  }

  function visible(element) {
    if (!element || element.disabled || element.getAttribute?.('aria-disabled') === 'true') return false;
    if (element.hidden || element.type === 'hidden') return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0
      && rect.width > 0 && rect.height > 0;
  }

  function compactText(element, limit = 500) {
    return String(element?.innerText || element?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit);
  }

  function explicitLabel(element) {
    let label = null;
    if (element.id) {
      try { label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`); } catch { label = null; }
    }
    const described = (element.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => compactText(document.getElementById(id), 160))
      .join(' ');
    return [
      compactText(label, 180),
      compactText(element.closest('label'), 180),
      element.getAttribute('aria-label'),
      element.getAttribute('placeholder'),
      described,
      element.id,
      element.name
    ].filter(Boolean).join(' ');
  }

  function contextText(element, depth = 5) {
    const parts = [];
    let parent = element?.parentElement;
    for (let index = 0; parent && index < depth; index += 1, parent = parent.parentElement) {
      const heading = parent.querySelector?.(':scope > legend, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > .card-header, :scope > .panel-heading, :scope > label');
      if (heading) parts.push(compactText(heading, 180));
    }
    return parts.join(' ');
  }

  function rolePattern(role) {
    return role === 'principal' ? MAIN_WORDS : SECONDARY_WORDS;
  }

  function headingRole(element) {
    const text = normalizeText(compactText(element, 180));
    if (/^atividade\s+principal$/.test(text)) return 'principal';
    if (/^atividade(?:\(s\)|s)?\s+secundaria(?:\(s\)|s)?$/.test(text)) return 'secondary';
    return '';
  }

  function nearestPrecedingRole(element) {
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, legend')];
    let role = '';
    for (const heading of headings) {
      if (!(heading.compareDocumentPosition(element) & 4)) continue;
      const candidate = headingRole(heading);
      if (candidate) role = candidate;
    }
    return role;
  }

  function scoreInput(element, role) {
    const metadata = normalizeText(`${explicitLabel(element)} ${element.type || ''}`);
    const context = normalizeText(contextText(element));
    let score = 0;
    if (/\bcnae\b/.test(metadata)) score += 70;
    if (/\batividade/.test(metadata)) score += 38;
    if (/\bcodigo\b/.test(metadata)) score += 25;
    if (element.type === 'search') score += 10;
    if (rolePattern(role).test(`${metadata} ${context}`)) score += 36;
    const structuralRole = nearestPrecedingRole(element);
    if (structuralRole === role) score += 240;
    else if (structuralRole) score -= 300;
    if (role === 'principal' && SECONDARY_WORDS.test(`${metadata} ${context}`)) score -= 50;
    if (role === 'secondary' && MAIN_WORDS.test(`${metadata} ${context}`) && !SECONDARY_WORDS.test(`${metadata} ${context}`)) score -= 50;
    return score;
  }

  function candidateInputs(role) {
    return [...document.querySelectorAll('input:not([type="hidden"]), textarea')]
      .filter(visible)
      .filter((element) => !element.readOnly)
      .map((element) => ({ element, score: scoreInput(element, role) }))
      .filter((item) => item.score >= 30)
      .sort((a, b) => b.score - a.score);
  }

  function actionLabel(element) {
    return normalizeText([
      compactText(element, 180),
      element.value,
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('title')
    ].filter(Boolean).join(' '));
  }

  function actionElements(scope = document) {
    return [...scope.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]')]
      .filter(visible)
      .filter((element) => !isForbiddenActionLabel(actionLabel(element)));
  }

  function nearestScope(element, role) {
    let node = element;
    for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
      const text = normalizeText(compactText(node, 1300));
      if (rolePattern(role).test(text)) return node;
    }
    return element?.closest('form, fieldset, section, .card, .panel, .modal-content') || document;
  }

  function findSearchAction(input, role) {
    const scopes = [input.parentElement, nearestScope(input, role), input.closest('form')]
      .filter(Boolean);
    for (const scope of scopes) {
      const candidate = actionElements(scope).find((element) => SEARCH_ACTION.test(actionLabel(element)));
      if (candidate) return candidate;
    }
    return null;
  }

  function findOpenActivityAction(role) {
    const candidates = actionElements(document)
      .map((element) => ({ element, label: actionLabel(element), context: normalizeText(contextText(element, 4)) }))
      .filter((item) => ADD_ACTION.test(item.label) && /\b(atividade|cnae)\b/.test(`${item.label} ${item.context}`))
      .filter((item) => rolePattern(role).test(`${item.label} ${item.context}`));
    return candidates[0]?.element || null;
  }

  function setNativeValue(element, value, eventTypes = ['input']) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(element, value); else element.value = value;
    for (const type of eventTypes) element.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function boundedTiming(value, fallback, minimum, maximum) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, Math.round(numeric))) : fallback;
  }

  function normalizeTimings(value = {}) {
    return {
      keyDelayMs: boundedTiming(value.keyDelayMs, 260, 80, 400),
      afterTypingMs: boundedTiming(value.afterTypingMs, 950, 500, 1600),
      stableSuggestionMs: boundedTiming(value.stableSuggestionMs, 850, 600, 1600)
    };
  }

  async function typeCodeSlowly(element, code, timingOptions = {}) {
    const timings = normalizeTimings(timingOptions);
    element.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    element.click();
    element.focus();
    setNativeValue(element, '', ['input', 'change']);
    await wait(450);

    for (const character of cnaeTools.normalizeCode(code)) {
      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: character, code: `Digit${character}`, bubbles: true, cancelable: true
      }));
      const current = String(element.value || '');
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(element, `${current}${character}`); else element.value = `${current}${character}`;
      const inputEvent = typeof InputEvent === 'function'
        ? new InputEvent('input', { data: character, inputType: 'insertText', bubbles: true })
        : new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      element.dispatchEvent(new KeyboardEvent('keyup', {
        key: character, code: `Digit${character}`, bubbles: true, cancelable: true
      }));
      await wait(timings.keyDelayMs);
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(timings.afterTypingMs);
  }

  function pressEnter(element) {
    for (const type of ['keydown', 'keypress', 'keyup']) {
      element.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
      }));
    }
  }

  function isSelectedActivityText(value, code = '') {
    const text = normalizeText(value);
    const hasQuestion = ADDRESS_QUESTION.test(text);
    return hasQuestion && (!code || containsExactCode(value, code));
  }

  function activityCardRole(element) {
    const structuralRole = nearestPrecedingRole(element);
    if (structuralRole) return structuralRole;
    const context = normalizeText(contextText(element, 7));
    if (SECONDARY_WORDS.test(context)) return 'secondary';
    if (MAIN_WORDS.test(context)) return 'principal';
    return '';
  }

  function smallestContainers(candidates) {
    return candidates.filter((candidate) => !candidates.some((other) => (
      other !== candidate && candidate.element.contains(other.element)
    )));
  }

  function selectedActivityCardRecords() {
    const selectors = 'article, fieldset, .card, .panel, [class*="atividade"], div, li, tr';
    const candidates = [...document.querySelectorAll(selectors)]
      .filter(visible)
      .filter((element) => !element.closest('[role="listbox"], .ui-autocomplete-items, .p-autocomplete-items, [class*="autocomplete"]'))
      .map((element) => ({ element, text: compactText(element, 5000) }))
      .map((item) => ({ ...item, codes: [...new Set(cnaeTools.extractCodes(item.text))] }))
      .filter((item) => item.codes.length && isSelectedActivityText(item.text));
    return smallestContainers(candidates).map((card) => ({
      ...card,
      role: activityCardRole(card.element)
    }));
  }

  function selectedActivityRecords() {
    const records = [];
    const seen = new Set();
    for (const card of selectedActivityCardRecords()) {
      for (const code of card.codes) {
        const key = `${code}:${card.role}`;
        if (seen.has(key)) continue;
        seen.add(key);
        records.push({ code, role: card.role, element: card.element, text: card.text });
      }
    }
    return records;
  }

  function addressAnswerFromText(value) {
    const text = normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
    if (text === 'sim' || text === 'true') return true;
    if (text === 'nao' || text === 'false') return false;
    return null;
  }

  function associatedLabel(element) {
    if (!element) return null;
    if (element.labels?.length) return element.labels[0];
    if (element.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return label;
      } catch {}
    }
    return element.closest?.('label') || null;
  }

  function nearbyRadioTexts(element) {
    if (!element) return [];
    const snippets = [];
    const push = (value) => {
      const text = String(value ?? '').replace(/\s+/g, ' ').trim();
      if (text && !snippets.includes(text)) snippets.push(text);
    };
    const readNode = (node) => {
      if (!node) return '';
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (node.nodeType === Node.ELEMENT_NODE) return compactText(node, 80);
      return '';
    };
    const scanSibling = (start, direction) => {
      let node = start;
      for (let steps = 0; node && steps < 3; steps += 1, node = direction === 'next' ? node.nextSibling : node.previousSibling) {
        const text = readNode(node);
        if (text) push(text);
      }
    };

    scanSibling(element.previousSibling, 'previous');
    scanSibling(element.nextSibling, 'next');

    const parent = element.parentElement;
    if (parent) {
      const localSiblings = [...parent.childNodes]
        .filter((node) => node !== element)
        .map((node) => readNode(node))
        .filter(Boolean)
        .join(' ');
      push(localSiblings);
      if (parent.childElementCount <= 2) push(compactText(parent, 80));
    }
    return snippets;
  }

  function addressAnswerFromFieldValue(name, id, value) {
    const fieldSignature = `${name || ''} ${id || ''}`.replace(/[^a-z0-9]+/gi, '').toLowerCase();
    if (!fieldSignature.includes('exercenoendereco')) return null;
    const normalizedValue = String(value ?? '').trim().toLowerCase();
    if (normalizedValue === '1' || normalizedValue === 'true') return true;
    if (normalizedValue === '0' || normalizedValue === 'false') return false;
    return null;
  }

  function isAddressAnswerControl(element) {
    if (!element) return false;
    return addressAnswerFromFieldValue(
      element.getAttribute?.('name'),
      element.id || element.getAttribute?.('id'),
      element.getAttribute?.('value')
    ) !== null || /exercenoendereco/i.test(`${element.getAttribute?.('name') || ''} ${element.id || element.getAttribute?.('id') || ''}`);
  }

  function radioAnswerEvidence(element) {
    const structuralAnswer = addressAnswerFromFieldValue(
      element.getAttribute?.('name'),
      element.id || element.getAttribute?.('id'),
      element.getAttribute?.('value')
    );
    const rawSignals = [
      compactText(associatedLabel(element), 120),
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('title'),
      element.getAttribute?.('data-value'),
      element.getAttribute?.('data-label'),
      element.getAttribute?.('role') === 'radio' ? compactText(element, 120) : '',
      ...nearbyRadioTexts(element)
    ].filter(Boolean);
    const signals = rawSignals.map(addressAnswerFromText).filter((value) => value !== null);
    if (structuralAnswer !== null) signals.push(structuralAnswer);
    const distinct = [...new Set(signals)];
    return {
      answer: distinct.length === 1 ? distinct[0] : null,
      conflicting: distinct.length > 1
    };
  }

  function radioCheckedState(element) {
    if (!element) return null;
    if (element.matches?.('input[type="radio"]')) return Boolean(element.checked);
    if (element.getAttribute?.('role') === 'radio') {
      const value = element.getAttribute('aria-checked');
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
    return null;
  }

  function addressControlDecision(controls = [], requestedAnswer) {
    if (![true, false].includes(requestedAnswer)) {
      return { status: 'manual', detail: 'O dossiê não definiu Sim/Não para este CNAE.' };
    }
    const usable = controls.filter((item) => item && item.answer !== null && item.conflicting !== true);
    if (controls.some((item) => item?.conflicting)) {
      return { status: 'ambiguous', detail: 'Um controle de resposta contém sinais contraditórios de Sim/Não.' };
    }
    const yes = usable.filter((item) => item.answer === true);
    const no = usable.filter((item) => item.answer === false);
    if (yes.length !== 1 || no.length !== 1 || usable.length !== 2 || controls.length !== 2) {
      return { status: 'ambiguous', detail: `Não foi possível isolar exatamente um controle Sim e um controle Não no cartão. Controles candidatos: ${controls.length}; Sim reconhecidos: ${yes.length}; Não reconhecidos: ${no.length}.` };
    }
    if (yes[0].checked === null || no[0].checked === null) {
      return { status: 'screen_error', detail: 'Os controles Sim/Não foram localizados, mas o estado marcado não pôde ser confirmado.' };
    }
    if (yes[0].checked && no[0].checked) {
      return { status: 'screen_error', detail: 'Sim e Não aparecem marcados ao mesmo tempo. Nenhuma alteração foi feita.' };
    }
    const desired = requestedAnswer ? yes[0] : no[0];
    const opposite = requestedAnswer ? no[0] : yes[0];
    if (desired.checked && !opposite.checked) {
      return { status: 'verified', control: desired, detail: `Resposta ${requestedAnswer ? 'Sim' : 'Não'} já estava marcada e foi confirmada.` };
    }
    if (opposite.checked) {
      return { status: 'conflict', control: opposite, detail: `A tela já contém ${requestedAnswer ? 'Não' : 'Sim'}, mas o dossiê solicita ${requestedAnswer ? 'Sim' : 'Não'}. A resposta existente foi preservada.` };
    }
    return { status: 'apply', control: desired, detail: `Aplicar ${requestedAnswer ? 'Sim' : 'Não'}.` };
  }

  function radioElements(cardElement) {
    const raw = [...cardElement.querySelectorAll('input[type="radio"], [role="radio"]')]
      .filter((element) => !element.disabled && element.getAttribute?.('aria-disabled') !== 'true');
    const semanticAddressControls = raw.filter(isAddressAnswerControl);
    const pool = semanticAddressControls.length ? semanticAddressControls : raw;
    const interactable = pool.filter((element) => {
      if (visible(element)) return true;
      const label = associatedLabel(element);
      try { return Boolean(label && visible(label)); } catch { return false; }
    });
    return interactable.filter((element) => !interactable.some((other) => (
      other !== element && element.contains?.(other) && other.matches?.('input[type="radio"]')
    )));
  }

  function addressControlsForCard(card) {
    if (!card?.element || !ADDRESS_QUESTION.test(normalizeText(card.text))) return [];
    return radioElements(card.element).map((element) => {
      const evidence = radioAnswerEvidence(element);
      return {
        element,
        answer: evidence.answer,
        conflicting: evidence.conflicting,
        checked: radioCheckedState(element)
      };
    });
  }

  function exactAddressCard(code, role) {
    const normalized = cnaeTools.normalizeCode(code);
    const matches = selectedActivityCardRecords().filter((card) => (
      card.role === role && card.codes.length === 1 && card.codes[0] === normalized
    ));
    if (matches.length === 1) return { status: 'exact', card: matches[0] };
    if (matches.length > 1) return { status: 'ambiguous' };
    return { status: 'not_found' };
  }

  function addressAnswerState(code, role, requestedAnswer) {
    if (![true, false].includes(requestedAnswer)) {
      return { status: 'manual', detail: 'Sem resposta automática: preencha Sim/Não manualmente.' };
    }
    const cardDecision = exactAddressCard(code, role);
    if (cardDecision.status === 'ambiguous') {
      return { status: 'ambiguous', detail: 'Há mais de um cartão equivalente para o mesmo CNAE e papel. Nenhuma resposta foi alterada.' };
    }
    if (cardDecision.status !== 'exact') {
      return { status: 'screen_error', detail: 'Não foi possível localizar um único cartão exato do CNAE para aplicar a resposta de endereço.' };
    }
    const controls = addressControlsForCard(cardDecision.card);
    return { ...addressControlDecision(controls, requestedAnswer), card: cardDecision.card };
  }

  function addressClickable(control) {
    const element = control?.element;
    if (!element) return null;
    const label = associatedLabel(element);
    try {
      if (label && visible(label)) return label;
    } catch {}
    return element;
  }

  function activateAddressControl(control) {
    const target = addressClickable(control);
    if (!target) return false;
    target.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    target.focus?.({ preventScroll: true });
    for (const type of ['mouseover', 'mousedown', 'mouseup']) {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: type === 'mousedown' ? 1 : 0
      }));
    }
    target.click?.();
    return true;
  }

  async function applyAddressAnswer(code, role, requestedAnswer, timeout = 5000) {
    const initial = addressAnswerState(code, role, requestedAnswer);
    if (initial.status === 'manual') return { status: 'address_manual', detail: initial.detail };
    if (initial.status === 'verified') return { status: 'address_verified', detail: initial.detail };
    if (initial.status === 'conflict') return { status: 'address_conflict', detail: initial.detail };
    if (initial.status === 'ambiguous') return { status: 'address_ambiguous', detail: initial.detail };
    if (initial.status === 'screen_error') return { status: 'address_screen_error', detail: initial.detail };
    if (initial.status !== 'apply' || !initial.control) {
      return { status: 'address_screen_error', detail: 'O estado dos controles de endereço não pôde ser determinado com segurança.' };
    }
    if (!activateAddressControl(initial.control)) {
      return { status: 'address_screen_error', detail: 'O controle solicitado foi localizado, mas não pôde ser acionado.' };
    }
    const confirmed = await waitUntil(() => {
      const state = addressAnswerState(code, role, requestedAnswer);
      return state.status === 'verified' ? state : null;
    }, timeout, 140);
    if (!confirmed) {
      return { status: 'address_unverified', detail: `A opção ${requestedAnswer ? 'Sim' : 'Não'} foi acionada, mas o estado final não pôde ser confirmado. Revise a tela.` };
    }
    return { status: 'address_verified', detail: `Resposta ${requestedAnswer ? 'Sim' : 'Não'} marcada e confirmada no cartão do CNAE.` };
  }


  function selectedCodes() {
    return [...new Set(selectedActivityRecords().map((record) => record.code))];
  }

  function existingActivityDecision(records, code, requestedRole) {
    const normalized = cnaeTools.normalizeCode(code);
    const matches = (records || []).filter((record) => cnaeTools.normalizeCode(record.code) === normalized);
    if (!matches.length) return null;

    const roles = new Set(matches.map((record) => record.role || ''));
    if (roles.size !== 1 || roles.has('')) {
      return {
        status: 'screen_error',
        detail: 'O CNAE já aparece em cartão selecionado, mas não foi possível confirmar seu papel. Revise a tela.'
      };
    }

    const [existingRole] = roles;
    if (existingRole === requestedRole) {
      return {
        status: 'duplicate',
        detail: `O CNAE já aparece como atividade ${requestedRole === 'principal' ? 'principal' : 'secundária'}.`
      };
    }
    if (requestedRole === 'principal') {
      return {
        status: 'principal_conflict',
        detail: 'O CNAE solicitado como principal já aparece como atividade secundária. Nenhuma alteração de papel foi feita.'
      };
    }
    return {
      status: 'duplicate',
      detail: 'O CNAE já aparece como atividade principal e foi preservado nesse papel.'
    };
  }

  function principalCodes() {
    return selectedActivityRecords()
      .filter((record) => record.role === 'principal')
      .map((record) => record.code);
  }

  function resultContainers(code, role, expectedDescription = '') {
    const selectors = [
      '[role="option"]', '[role="row"]', 'tr', 'li', 'a', '.list-group-item',
      '.ui-autocomplete-item', '.p-autocomplete-item',
      '[class*="resultado"]', '[class*="result"]', '.modal-content .row'
    ];
    const items = [];
    const seen = new Set();
    const clickTargets = new Set();
    for (const element of document.querySelectorAll(selectors.join(','))) {
      if (!visible(element) || seen.has(element)) continue;
      const text = compactText(element, 1600);
      const evidence = suggestionEvidence(text, code, expectedDescription);
      if (!evidence.singleExactCode) continue;
      seen.add(element);
      const clickable = pickResultClickable(element, code);
      if (!clickable || clickTargets.has(clickable) || isForbiddenActionLabel(actionLabel(clickable))) continue;
      clickTargets.add(clickable);
      const clickableText = compactText(clickable, 1600);
      const suggestionText = containsExactCode(clickableText, code) ? clickableText : text;
      const clickableEvidence = suggestionEvidence(suggestionText, code, expectedDescription);
      const finalEvidence = clickableEvidence.singleExactCode ? clickableEvidence : evidence;
      const roleMatch = rolePattern(role).test(normalizeText(`${text} ${contextText(element, 3)}`));
      items.push({
        element,
        clickable,
        text,
        roleMatch,
        ...finalEvidence
      });
    }
    return items.sort((a, b) => Number(b.roleMatch) - Number(a.roleMatch));
  }

  function pickResultClickable(element, code) {
    const actions = actionElements(element).filter((action) => ADD_ACTION.test(actionLabel(action)));
    const interactive = [
      ...(element.matches('a, button, [role="option"], [role="button"]') ? [element] : []),
      ...element.querySelectorAll('a, button, [role="option"], [role="button"], [tabindex]:not([tabindex="-1"])')
    ].filter(visible).find((candidate) => containsExactCode(elementText(candidate), code));
    return actions[0]
      || interactive
      || (['OPTION', 'TR', 'LI'].includes(element.tagName) || element.getAttribute('role') === 'option' ? element : null);
  }

  function activateResult(element) {
    element.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    element.focus?.({ preventScroll: true });
    for (const type of ['mouseover', 'mousedown', 'mouseup']) {
      element.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: type === 'mousedown' ? 1 : 0
      }));
    }
    if (element.isConnected) element.click();
  }

  function selectionConfirmed(code, role) {
    const normalized = cnaeTools.normalizeCode(code);
    return selectedActivityRecords().some((record) => (
      record.code === normalized && record.role === role && isSelectedActivityText(record.text, normalized)
    ));
  }

  function selectedCardDescription(value, code) {
    const description = suggestionDescription(value, code);
    const question = /exerce\s+atividade\s+no\s+endere[cç]o\s+informado/i.exec(description);
    return (question ? description.slice(0, question.index) : description)
      .replace(/\s+/g, ' ')
      .replace(/\s*[-–—:|]+\s*$/, '')
      .trim();
  }

  function selectionConfirmedWithDescription(code, role, expectedDescription) {
    const normalized = cnaeTools.normalizeCode(code);
    const expected = normalizeDescription(expectedDescription);
    if (!normalized || !expected) return false;
    return selectedActivityRecords().some((record) => (
      record.code === normalized
      && record.role === role
      && isSelectedActivityText(record.text, normalized)
      && descriptionsEquivalent(expectedDescription, selectedCardDescription(record.text, normalized))
    ));
  }

  function errorMessageOnPage() {
    const selectors = '.alert-danger, .alert-warning, [role="alert"], .toast-error, .error, [class*="erro"]';
    const messages = [...document.querySelectorAll(selectors)]
      .filter(visible)
      .map((element) => compactText(element, 500))
      .filter(Boolean);
    return messages.find((message) => /nenhum resultado|nao encontr|inexist|invalid|erro|obrigatori/i.test(normalizeText(message))) || '';
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitUntil(test, timeout = 10000, interval = 180) {
    const end = Date.now() + timeout;
    while (true) {
      const value = test();
      if (value) return value;
      const remaining = end - Date.now();
      if (remaining <= 0) return null;
      await wait(Math.min(interval, remaining));
    }
  }

  async function waitForStableSuggestion(code, role, expectedDescription, timingOptions = {}, timeout = 18000) {
    const timings = normalizeTimings(timingOptions);
    const end = Date.now() + timeout;
    let candidateSignature = '';
    let candidateSince = 0;
    let errorSignature = '';
    let errorSince = 0;

    while (true) {
      const candidates = resultContainers(code, role, expectedDescription);
      if (candidates.length) {
        const signature = candidates.map((item) => normalizeText(item.text)).join('|');
        if (signature !== candidateSignature) {
          candidateSignature = signature;
          candidateSince = Date.now();
        } else if (Date.now() - candidateSince >= timings.stableSuggestionMs) {
          return { candidates };
        }
        errorSignature = '';
        errorSince = 0;
      } else {
        candidateSignature = '';
        candidateSince = 0;
        const error = errorMessageOnPage();
        if (error) {
          const signature = normalizeText(error);
          if (signature !== errorSignature) {
            errorSignature = signature;
            errorSince = Date.now();
          } else if (Date.now() - errorSince >= 3200) {
            return { error };
          }
        } else {
          errorSignature = '';
          errorSince = 0;
        }
      }
      const remaining = end - Date.now();
      if (remaining <= 0) return null;
      await wait(Math.min(210, remaining));
    }
  }

  async function ensureInput(role) {
    let candidates = candidateInputs(role);
    if (candidates.length) return candidates[0].element;
    const opener = findOpenActivityAction(role);
    if (!opener) return null;
    opener.click();
    candidates = await waitUntil(() => {
      const found = candidateInputs(role);
      return found.length ? found : null;
    }, 6000);
    return candidates?.[0]?.element || null;
  }

  async function addCode(code, role, expectedDescription = '', timingOptions = {}) {
    const normalized = cnaeTools.normalizeCode(code);
    if (!normalized) return { status: 'invalid', detail: 'O código não possui sete dígitos.' };
    const officialDescription = expectedDescription || cnaeTools.officialDescription(normalized);
    const usesLocalOfficialDescription = Boolean(officialDescription);

    const existingDecision = existingActivityDecision(selectedActivityRecords(), normalized, role);
    if (existingDecision) return existingDecision;

    if (role === 'principal') {
      const currentPrincipal = principalCodes().filter((item) => item !== normalized);
      if (currentPrincipal.length) {
        return {
          status: 'principal_conflict',
          detail: `Já existe uma atividade principal (${cnaeTools.formatCode(currentPrincipal[0])}). Nenhuma substituição foi feita.`
        };
      }
    }

    const input = await ensureInput(role);
    if (!input) {
      return { status: 'screen_error', detail: `Não localizei o campo de busca da atividade ${role === 'principal' ? 'principal' : 'secundária'}.` };
    }
    const detectedRole = nearestPrecedingRole(input);
    if (detectedRole && detectedRole !== role) {
      return { status: 'screen_error', detail: 'O campo localizado pertence a outra seção de atividade. Nenhum código foi digitado.' };
    }

    await typeCodeSlowly(input, normalized, timingOptions);
    const outcome = await waitForStableSuggestion(normalized, role, officialDescription, timingOptions);

    if (!outcome) return { status: 'not_found', detail: 'O portal não apresentou um resultado exato dentro do tempo de espera.' };
    if (outcome.error) {
      return {
        status: 'not_found',
        detail: usesLocalOfficialDescription
          ? `${outcome.error} IBGE: ${officialDescription}`
          : `${outcome.error} O CNAE foi informado manualmente e nenhuma opção exata foi aceita.`
      };
    }

    const decision = usesLocalOfficialDescription
      ? exactSuggestionDecision(outcome.candidates)
      : exactPortalSuggestionDecision(outcome.candidates);

    if (usesLocalOfficialDescription && decision.status === 'description_mismatch') {
      const presented = outcome.candidates.map((item) => item.presentedDescription).filter(Boolean).join(' | ');
      return {
        status: 'description_mismatch',
        detail: `Descrição divergente. IBGE: ${officialDescription}. Portal: ${presented || 'não identificada'}. Nenhuma sugestão foi selecionada.`
      };
    }
    if (decision.status === 'ambiguous') {
      return {
        status: 'ambiguous',
        detail: usesLocalOfficialDescription
          ? 'O portal apresentou mais de uma opção com o mesmo código e a mesma descrição. Nenhuma sugestão foi selecionada.'
          : 'O portal apresentou mais de uma opção isolada com o código exato. Sem descrição local independente, nenhuma opção foi escolhida.'
      };
    }
    if (decision.status !== 'exact') {
      return {
        status: 'not_found',
        detail: usesLocalOfficialDescription
          ? 'Nenhuma opção isolada corresponde simultaneamente ao código completo e à descrição oficial.'
          : 'Nenhuma opção única, isolada e com descrição legível corresponde ao código completo informado.'
      };
    }

    const choice = decision.choice;
    activateResult(choice.clickable);
    const verified = await waitUntil(() => (
      usesLocalOfficialDescription
        ? selectionConfirmed(normalized, role)
        : selectionConfirmedWithDescription(normalized, role, choice.presentedDescription)
    ), 8500);
    if (!verified) {
      return {
        status: 'unverified',
        detail: usesLocalOfficialDescription
          ? 'O resultado foi acionado, mas não apareceu em um cartão da seção correta com o código exato e a pergunta do endereço. Revise a tela.'
          : 'O resultado foi acionado, mas o cartão final não confirmou simultaneamente o código, o papel e a mesma descrição apresentada na sugestão. Revise a tela.'
      };
    }
    return {
      status: 'added',
      detail: usesLocalOfficialDescription
        ? `CNAE ${cnaeTools.formatCode(normalized)} incluído e confirmado no cartão da seção correta.`
        : `CNAE ${cnaeTools.formatCode(normalized)} informado manualmente, validado por código exato e descrição consistente entre a sugestão e o cartão final do portal.`
    };
  }

  function analyzeScreen() {
    const text = normalizeText(document.body?.innerText || '');
    const principalInputs = candidateInputs('principal').length;
    const secondaryInputs = candidateInputs('secondary').length;
    const openers = ['principal', 'secondary'].filter((role) => findOpenActivityAction(role)).length;
    const activityContext = /\b(atividade|cnae|objeto do estabelecimento)\b/.test(text);
    const supported = activityContext && (principalInputs + secondaryInputs + openers > 0);
    return {
      supported,
      title: document.title,
      principalInputs,
      secondaryInputs,
      openers,
      existingCodes: selectedCodes(),
      principalCodes: principalCodes(),
      detail: supported
        ? 'Etapa de atividades reconhecida. Revise a fila e inicie a inclusão.'
        : 'Abra a etapa da Viabilidade que contém Atividade Principal e Atividades Secundárias.'
    };
  }

  return {
    normalizeText,
    normalizeDescription,
    normalizeTimings,
    suggestionDescription,
    suggestionEvidence,
    exactSuggestionDecision,
    exactPortalSuggestionDecision,
    descriptionsEquivalent,
    isSelectedActivityText,
    existingActivityDecision,
    smallestContainers,
    selectedCardDescription,
    addressAnswerFromText,
    addressAnswerFromFieldValue,
    addressControlDecision,
    isForbiddenActionLabel,
    containsExactCode,
    headingRole,
    nearestPrecedingRole,
    pickResultClickable,
    scoreInput,
    analyzeScreen,
    addCode,
    applyAddressAnswer,
    wait
  };
});
