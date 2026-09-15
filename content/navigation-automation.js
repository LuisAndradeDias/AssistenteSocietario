((root, factory) => {
  const api = factory(root.JuceesProcessBaseline, root.JuceesProcessAutomation);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesNavigationAutomation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (baseline, processAutomation) => {
  const ALLOWED_PHASES = Object.freeze(['abertura', 'viabilidade']);

  function normalizeText(value) {
    if (processAutomation?.normalizeText) return processAutomation.normalizeText(value);
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function actionLabel(element) {
    return String(element?.textContent || element?.value || element?.getAttribute?.('aria-label') || element?.getAttribute?.('title') || '').trim();
  }

  function isNavigationLabel(value) {
    if (processAutomation?.isNavigationActionLabel) return processAutomation.isNavigationActionLabel(value);
    const label = normalizeText(value);
    return ['avancar', 'proximo', 'prosseguir', 'continuar'].some((term) => label === term || label.startsWith(`${term} `));
  }

  function isHardBlockedLabel(value) {
    if (processAutomation?.isForbiddenActionLabel) return processAutomation.isForbiddenActionLabel(value);
    const label = normalizeText(value);
    return ['salvar', 'gravar', 'enviar', 'finalizar', 'concluir', 'transmitir', 'protocolar', 'assinar', 'gerar taxa']
      .some((term) => label === term || label.startsWith(`${term} `) || label.includes(` ${term} `));
  }

  function isVisibleAction(element, documentRef) {
    if (!element || element.hidden || element.disabled) return false;
    if (String(element.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true') return false;
    const view = documentRef?.defaultView;
    if (view?.getComputedStyle) {
      const style = view.getComputedStyle(element);
      if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    }
    return true;
  }

  function navigationCandidates(documentRef = typeof document !== 'undefined' ? document : null) {
    if (!documentRef) return [];
    const selector = 'button,input[type="button"],input[type="submit"],a[role="button"],a.btn,a.button';
    const result = [];
    for (const element of documentRef.querySelectorAll(selector)) {
      const label = actionLabel(element);
      if (!label || !isVisibleAction(element, documentRef)) continue;
      if (!isNavigationLabel(label) || isHardBlockedLabel(label)) continue;
      result.push({ element, label });
    }
    return result;
  }

  function navigationDecision(documentRef = typeof document !== 'undefined' ? document : null) {
    const candidates = navigationCandidates(documentRef);
    if (!candidates.length) return { status: 'not_found', detail: 'Nenhum botão de navegação Avançar/Próximo/Prosseguir/Continuar foi localizado de forma segura.' };
    if (candidates.length !== 1) return { status: 'ambiguous', detail: `${candidates.length} botões de navegação elegíveis foram encontrados; nenhum será acionado.`, candidates: candidates.map((item) => item.label) };
    return { status: 'ready', detail: `Navegação pronta pelo botão “${candidates[0].label}”.`, target: candidates[0] };
  }

  function advanceValidatedStage(requestedStageId = '', documentRef = typeof document !== 'undefined' ? document : null) {
    if (!baseline || !processAutomation || !documentRef) return { ok: false, status: 'unavailable', detail: 'Motor de navegação indisponível.' };
    const detected = processAutomation.detectStage(documentRef);
    if (!detected?.supported) return { ok: false, status: 'stage_unrecognized', detail: detected?.detail || 'Etapa não reconhecida.' };
    if (detected.confidence !== 'high') return { ok: false, status: 'stage_low_confidence', detail: 'A etapa não possui confiança alta; a navegação automática foi bloqueada.' };
    if (requestedStageId && detected.stageId !== requestedStageId) return { ok: false, status: 'stage_changed', detail: `A tela mudou de ${requestedStageId} para ${detected.stageId}; analise novamente antes de avançar.` };
    const stage = baseline.getStage(detected.stageId);
    if (!stage || !ALLOWED_PHASES.includes(stage.phase)) return { ok: false, status: 'phase_blocked', detail: 'A navegação automática está limitada às fases de Abertura e Viabilidade.' };
    if (stage.mode === baseline.MODES.BLOCKED) return { ok: false, status: 'stage_blocked', detail: 'Esta etapa é bloqueada para automação.' };
    if (stage.specialized) return { ok: false, status: 'specialized_stage', detail: 'Esta etapa usa um módulo específico e não será avançada pelo fluxo genérico.' };

    const decision = navigationDecision(documentRef);
    if (decision.status !== 'ready') return { ok: false, status: decision.status, detail: decision.detail, candidates: decision.candidates || [] };
    const { element, label } = decision.target;
    if (typeof element.click !== 'function') return { ok: false, status: 'not_clickable', detail: `O controle “${label}” não expõe uma ação de clique segura.` };
    element.click();
    return { ok: true, status: 'advanced', stageId: stage.id, actionLabel: label, detail: `Etapa ${stage.id} validada; “${label}” foi acionado. A próxima tela será reanalisada antes de qualquer nova ação.` };
  }

  return {
    ALLOWED_PHASES,
    actionLabel,
    isNavigationLabel,
    isHardBlockedLabel,
    navigationCandidates,
    navigationDecision,
    advanceValidatedStage
  };
});
