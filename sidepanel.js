(() => {
  const tools = globalThis.JuceesCnae;
  const dossierTools = globalThis.JuceesDossier;
  const performanceTools = globalThis.JuceesPerformance;
  const STORAGE_KEY = 'juceesCnaeRunState';
  const DRAFT_KEY = 'juceesCnaeDraft';
  const SETTINGS_KEY = 'juceesCnaeSettings';
  const OBJECT_DRAFT_KEY = 'juceesObjectDraft';
  const elements = {
    codes: document.getElementById('codes'),
    principal: document.getElementById('principal'),
    parseSummary: document.getElementById('parseSummary'),
    analyze: document.getElementById('analyze'),
    screenBadge: document.getElementById('screenBadge'),
    screenDetail: document.getElementById('screenDetail'),
    start: document.getElementById('start'),
    pause: document.getElementById('pause'),
    resume: document.getElementById('resume'),
    stop: document.getElementById('stop'),
    resetRun: document.getElementById('resetRun'),
    clearExtension: document.getElementById('clearExtension'),
    progressCard: document.getElementById('progressCard'),
    runBadge: document.getElementById('runBadge'),
    progressBar: document.getElementById('progressBar'),
    runDetail: document.getElementById('runDetail'),
    runMetrics: document.getElementById('runMetrics'),
    results: document.getElementById('results'),
    dossierFile: document.getElementById('dossierFile'),
    dossierBadge: document.getElementById('dossierBadge'),
    dossierDetail: document.getElementById('dossierDetail'),
    dossierPreview: document.getElementById('dossierPreview'),
    dossierSummary: document.getElementById('dossierSummary'),
    dossierMessages: document.getElementById('dossierMessages'),
    applyDossierCnaes: document.getElementById('applyDossierCnaes'),
    reloadDossierCnaes: document.getElementById('reloadDossierCnaes'),
    discardDossier: document.getElementById('discardDossier'),
    performanceProfile: document.getElementById('performanceProfile'),
    performanceHint: document.getElementById('performanceHint'),
    objectCompany: document.getElementById('objectCompany'),
    objectEstablishment: document.getElementById('objectEstablishment'),
    objectsBadge: document.getElementById('objectsBadge'),
    objectsDetail: document.getElementById('objectsDetail'),
    loadDossierObjects: document.getElementById('loadDossierObjects'),
    analyzeObjects: document.getElementById('analyzeObjects'),
    applyObjects: document.getElementById('applyObjects')
  };

  let parsed = { codes: [], invalid: [], unknown: [] };
  let screenSupported = false;
  let principalPreferenceSet = false;
  let importedDossier = null;
  let appliedAddressAnswers = {};
  let dossierLoadSequence = 0;
  const MAX_DOSSIER_BYTES = 1024 * 1024;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
  }

  function setDossierBadge(kind, label) {
    elements.dossierBadge.className = `badge ${kind}`;
    elements.dossierBadge.textContent = label;
  }

  function appendSummary(label, value) {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    elements.dossierSummary.append(term, description);
  }

  function appendDossierMessage(kind, item) {
    const message = document.createElement('p');
    message.className = `dossier-message ${kind}`;
    message.textContent = item.path ? `${item.path}: ${item.message}` : item.message;
    elements.dossierMessages.append(message);
  }

  function renderDossier(documentData, report, filename) {
    const summary = dossierTools.summarizeDossier(documentData);
    elements.dossierSummary.replaceChildren();
    elements.dossierMessages.replaceChildren();
    appendSummary('Arquivo', filename);
    appendSummary('Processo', summary.processType);
    appendSummary('Empresa', summary.companyName);
    if (summary.registration) appendSummary('Inscrição', summary.registration);
    appendSummary('Atividades', `${summary.activityCount} (${summary.principalCode} principal)`);
    appendSummary('Sócios', String(summary.partnerCount));
    appendSummary('Capital', summary.capital);
    appendSummary('Eventos', String(summary.eventCount));

    for (const error of report.errors.slice(0, 12)) appendDossierMessage('error', error);
    for (const warning of report.warnings.slice(0, 8)) appendDossierMessage('warning', warning);
    const hiddenMessages = Math.max(0, report.errors.length - 12) + Math.max(0, report.warnings.length - 8);
    if (hiddenMessages) appendDossierMessage('warning', { message: `${hiddenMessages} ocorrência(s) adicional(is) não exibida(s).` });

    importedDossier = report.valid ? documentData : null;
    elements.applyDossierCnaes.disabled = !report.valid;
    elements.reloadDossierCnaes.disabled = !report.valid;
    const hasDossierObjects = Boolean(documentData?.empresa?.objetoEmpresa?.trim() && documentData?.empresa?.objetoEstabelecimento?.trim());
    elements.loadDossierObjects.disabled = !report.valid || !hasDossierObjects;
    elements.dossierPreview.hidden = false;
    if (report.valid) {
      setDossierBadge(report.warnings.length ? 'warning' : 'success', report.warnings.length ? 'Válido com alertas' : 'Válido');
      elements.dossierDetail.textContent = 'Estrutura validada localmente. Revise o resumo antes de usar os CNAEs.';
    } else {
      setDossierBadge('error', 'Inválido');
      elements.dossierDetail.textContent = `${report.errors.length} erro(s) impedem o uso deste dossiê.`;
    }
  }

  function discardDossier() {
    dossierLoadSequence += 1;
    importedDossier = null;
    elements.dossierFile.value = '';
    elements.dossierPreview.hidden = true;
    elements.dossierSummary.replaceChildren();
    elements.dossierMessages.replaceChildren();
    elements.applyDossierCnaes.disabled = true;
    elements.reloadDossierCnaes.disabled = true;
    elements.loadDossierObjects.disabled = true;
    elements.dossierDetail.textContent = 'Nenhum dossiê carregado.';
    setDossierBadge('neutral', 'Não importado');
  }

  async function loadDossier(file) {
    const sequence = ++dossierLoadSequence;
    importedDossier = null;
    elements.applyDossierCnaes.disabled = true;
    elements.reloadDossierCnaes.disabled = true;
    elements.loadDossierObjects.disabled = true;
    elements.dossierPreview.hidden = true;
    setDossierBadge('running', 'Validando');
    elements.dossierDetail.textContent = 'Lendo e validando o arquivo apenas neste painel…';

    if (!file || file.size > MAX_DOSSIER_BYTES) {
      setDossierBadge('error', 'Recusado');
      elements.dossierDetail.textContent = 'O dossiê deve ser um arquivo JSON de até 1 MiB.';
      return;
    }

    try {
      const text = await file.text();
      if (sequence !== dossierLoadSequence) return;
      const documentData = JSON.parse(text);
      const report = dossierTools.validateDossier(documentData);
      renderDossier(documentData, report, file.name);
    } catch (error) {
      if (sequence !== dossierLoadSequence) return;
      setDossierBadge('error', 'Inválido');
      elements.dossierDetail.textContent = error instanceof SyntaxError
        ? 'O arquivo não contém um JSON válido.'
        : 'Não foi possível validar o dossiê.';
    }
  }

  async function activePortalTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/([a-z0-9-]+\.)?simplifica\.es\.gov\.br\//i.test(tab.url || '')) {
      throw new Error('Abra a Viabilidade no Simplifica/ES e mantenha essa aba ativa.');
    }
    return tab;
  }

  async function sendToPortal(message) {
    const tab = await activePortalTab();
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      throw new Error('A extensão ainda não está ativa nessa página. Recarregue a aba do Simplifica/ES e tente novamente.');
    }
  }

  function setScreenState(supported, detail) {
    screenSupported = supported;
    elements.screenBadge.className = `badge ${supported ? 'success' : 'warning'}`;
    elements.screenBadge.textContent = supported ? 'Reconhecida' : 'Não reconhecida';
    elements.screenDetail.textContent = detail;
    updateStartButton();
  }

  function updateStartButton() {
    elements.start.disabled = !screenSupported || parsed.codes.length === 0;
  }

  function renderParser(preferredPrincipal) {
    const previous = preferredPrincipal !== undefined ? preferredPrincipal : elements.principal.value;
    parsed = tools.parseList(elements.codes.value);
    parsed.unknown = parsed.codes.filter((code) => !tools.officialDescription(code));
    const duplicatesRemoved = Math.max(0, (elements.codes.value.match(/\d{4}\s*[-.]?\s*\d\s*[\/.]?\s*\d{2}/g) || []).length - parsed.codes.length);

    if (!parsed.codes.length) {
      elements.parseSummary.textContent = parsed.invalid.length
        ? 'Nenhum CNAE válido encontrado. Use sete dígitos por código.'
        : 'Nenhum código informado.';
      elements.parseSummary.className = parsed.invalid.length ? 'summary warning' : 'summary';
    } else {
      const notes = [`${parsed.codes.length} CNAE(s) válido(s)`];
      if (duplicatesRemoved) notes.push(`${duplicatesRemoved} repetido(s) removido(s)`);
      if (parsed.invalid.length) notes.push(`${parsed.invalid.length} trecho(s) ignorado(s)`);
      if (parsed.unknown.length) notes.push(`${parsed.unknown.length} código(s) sem descrição local — validação reforçada pelo portal`);
      elements.parseSummary.textContent = `${notes.join(' • ')}.`;
      elements.parseSummary.className = parsed.invalid.length || parsed.unknown.length ? 'summary warning' : 'summary';
    }

    elements.principal.replaceChildren();
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Nenhuma — adicionar todas como secundárias';
    elements.principal.append(none);
    for (const code of parsed.codes) {
      const option = document.createElement('option');
      option.value = code;
      const description = tools.officialDescription(code);
      option.textContent = description ? `${tools.formatCode(code)} — ${description}` : `${tools.formatCode(code)} — validar pelo portal`;
      elements.principal.append(option);
    }

    const previousValid = !previous || parsed.codes.includes(tools.normalizeCode(previous));
    if (previousValid && (principalPreferenceSet || preferredPrincipal !== undefined)) {
      elements.principal.value = tools.normalizeCode(previous);
    } else {
      elements.principal.value = parsed.codes[0] || '';
    }
    updateStartButton();
  }

  function sanitizeAddressAnswers(value, allowedCodes = parsed.codes) {
    const allowed = new Set((allowedCodes || []).map((code) => tools.normalizeCode(code)).filter(Boolean));
    const result = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    for (const [rawCode, answer] of Object.entries(value)) {
      const code = tools.normalizeCode(rawCode);
      if (!code || !allowed.has(code) || ![true, false, null].includes(answer)) continue;
      result[code] = answer;
    }
    return result;
  }

  async function saveDraft() {
    appliedAddressAnswers = sanitizeAddressAnswers(appliedAddressAnswers);
    await chrome.storage.local.set({
      [DRAFT_KEY]: {
        text: elements.codes.value,
        principalCode: elements.principal.value,
        addressAnswers: appliedAddressAnswers
      }
    });
  }

  async function saveSettings() {
    const performanceProfile = performanceTools.normalizeProfile(elements.performanceProfile.value);
    await chrome.storage.local.set({ [SETTINGS_KEY]: { performanceProfile } });
  }

  function renderPerformanceHint() {
    elements.performanceHint.textContent = performanceTools.profileHint(elements.performanceProfile.value);
  }

  function setObjectsState(kind, label, detail) {
    elements.objectsBadge.className = `badge ${kind}`;
    elements.objectsBadge.textContent = label;
    elements.objectsDetail.textContent = detail;
  }

  function objectPayload() {
    return {
      objetoEmpresa: elements.objectCompany.value.replace(/\r\n?/g, '\n'),
      objetoEstabelecimento: elements.objectEstablishment.value.replace(/\r\n?/g, '\n')
    };
  }

  function updateObjectButtons() {
    const payload = objectPayload();
    elements.applyObjects.disabled = !(payload.objetoEmpresa.trim() && payload.objetoEstabelecimento.trim());
  }

  async function saveObjectDraft() {
    const payload = objectPayload();
    await chrome.storage.session.set({ [OBJECT_DRAFT_KEY]: payload });
  }

  function markObjectsChanged() {
    setObjectsState('neutral', 'Rever', 'O texto dos objetos mudou. Verifique os campos do portal antes de aplicar.');
    updateObjectButtons();
    void saveObjectDraft();
  }

  async function analyzeObjects() {
    elements.analyzeObjects.disabled = true;
    setObjectsState('running', 'Verificando', 'Localizando os dois campos de objeto na tela atual…');
    try {
      const response = await sendToPortal({ type: 'juceesObjectsAnalyze' });
      if (!response?.ok) throw new Error(response?.error || 'Não foi possível verificar os campos de objeto.');
      const analysis = response.analysis;
      setObjectsState(
        analysis.supported ? 'success' : 'warning',
        analysis.supported ? 'Campos reconhecidos' : 'Não reconhecidos',
        analysis.detail
      );
      return analysis.supported;
    } catch (error) {
      setObjectsState('error', 'Erro', error.message);
      return false;
    } finally {
      elements.analyzeObjects.disabled = false;
    }
  }

  async function applyObjectsToPortal() {
    const payload = objectPayload();
    if (!payload.objetoEmpresa.trim() || !payload.objetoEstabelecimento.trim()) {
      setObjectsState('warning', 'Dados incompletos', 'Informe os dois objetos antes de aplicar.');
      return;
    }
    elements.applyObjects.disabled = true;
    const supported = await analyzeObjects();
    if (!supported) {
      updateObjectButtons();
      return;
    }
    setObjectsState('running', 'Aplicando', 'Executando pré-validação e conferência exata dos dois campos…');
    try {
      const response = await sendToPortal({ type: 'juceesObjectsApply', payload });
      const result = response?.result;
      if (!response?.ok || !result?.ok) {
        throw new Error(result?.detail || response?.error || 'Os objetos exigem revisão.');
      }
      setObjectsState('success', 'Confirmados', result.detail);
      await saveObjectDraft();
    } catch (error) {
      setObjectsState('error', 'Revisão necessária', error.message);
    } finally {
      updateObjectButtons();
    }
  }

  async function loadObjectsFromDossier() {
    if (!importedDossier) return;
    const company = String(importedDossier.empresa?.objetoEmpresa || '');
    const establishment = String(importedDossier.empresa?.objetoEstabelecimento || '');
    if (!company.trim() || !establishment.trim()) {
      setObjectsState('warning', 'Ausentes no dossiê', 'Este dossiê não possui os dois textos de objeto. Você pode digitá-los manualmente.');
      return;
    }
    const current = objectPayload();
    const differs = (current.objetoEmpresa.trim() && current.objetoEmpresa !== company)
      || (current.objetoEstabelecimento.trim() && current.objetoEstabelecimento !== establishment);
    if (differs && !confirm('Os campos de objeto no painel já possuem texto diferente. Substituir pelo conteúdo do dossiê?')) return;
    elements.objectCompany.value = company;
    elements.objectEstablishment.value = establishment;
    setObjectsState('neutral', 'Carregados', 'Objetos copiados do dossiê para o painel. Verifique os campos do portal antes de aplicar.');
    updateObjectButtons();
    await saveObjectDraft();
  }

  function stateLabel(status) {
    return ({
      running: 'Em andamento', paused: 'Pausada', completed: 'Concluída', stopped: 'Interrompida',
      review_required: 'Revisão necessária', error: 'Erro'
    })[status] || 'Pendente';
  }

  function stateClass(status) {
    if (status === 'completed') return 'success';
    if (status === 'running') return 'running';
    if (status === 'paused' || status === 'stopped') return 'warning';
    if (status === 'review_required' || status === 'error') return 'error';
    return 'neutral';
  }

  function itemLabel(status) {
    return ({
      pending: 'Pendente', searching: 'Pesquisando', added: 'Adicionado', duplicate: 'Já existente',
      invalid: 'Inválido', not_found: 'Não localizado', description_mismatch: 'Descrição divergente', ambiguous: 'Ambíguo', unverified: 'Revisar',
      principal_conflict: 'Conflito', screen_error: 'Erro de tela'
    })[status] || status;
  }

  function addressLabel(answer) {
    if (answer === true) return 'Sim';
    if (answer === false) return 'Não';
    return 'Manual';
  }

  function normalizeAddressStatus(status) {
    return typeof status === 'string' && status.startsWith('address_') ? status.slice(8) : (status || '');
  }

  function addressStatusLabel(status) {
    const normalized = normalizeAddressStatus(status);
    return ({
      pending: 'Aguardando resposta',
      applying: 'Aplicando resposta',
      verified: 'Resposta confirmada',
      manual: 'Resposta manual necessária',
      conflict: 'Conflito com a tela',
      screen_error: 'Erro ao localizar controles',
      ambiguous: 'Controles ambíguos',
      unverified: 'Clique sem confirmação final',
      skipped: 'Não aplicada'
    })[normalized] || normalized || 'Sem status';
  }

  function resultTone(item) {
    const errorStatuses = new Set(['invalid', 'not_found', 'description_mismatch', 'ambiguous', 'unverified', 'principal_conflict', 'screen_error']);
    const addressErrorStatuses = new Set(['conflict', 'screen_error', 'ambiguous', 'unverified']);
    const addressStatus = normalizeAddressStatus(item.addressStatus);
    if (errorStatuses.has(item.status)) return 'error';
    if (addressErrorStatuses.has(addressStatus)) return 'error';
    if (item.status === 'pending' || item.status === 'searching' || addressStatus === 'applying') return 'running';
    if (addressStatus === 'manual' || addressStatus === 'pending' || addressStatus === 'skipped') return 'warning';
    if ((item.status === 'added' || item.status === 'duplicate') && (!addressStatus || addressStatus === 'verified')) return 'success';
    return 'neutral';
  }

  function badgeHtml(kind, label) {
    return `<span class="badge ${escapeHtml(kind)}">${escapeHtml(label)}</span>`;
  }

  function renderMetrics(state) {
    const items = state.items || [];
    const total = items.length;
    const pending = items.filter((item) => {
      const addressStatus = normalizeAddressStatus(item.addressStatus);
      return ['pending', 'searching'].includes(item.status) || ['pending', 'applying'].includes(addressStatus);
    }).length;
    const review = items.filter((item) => {
      const addressStatus = normalizeAddressStatus(item.addressStatus);
      return resultTone(item) === 'error' || addressStatus === 'manual';
    }).length;
    const success = Math.max(0, total - pending - review);
    elements.runMetrics.innerHTML = `
      <div class="metric neutral"><strong>${total}</strong><span>Total</span></div>
      <div class="metric success"><strong>${success}</strong><span>Confirmados</span></div>
      <div class="metric warning"><strong>${pending}</strong><span>Pendentes</span></div>
      <div class="metric error"><strong>${review}</strong><span>Revisar</span></div>`;
  }

  function renderRun(state) {
    if (!state?.items?.length) {
      elements.progressCard.hidden = true;
      elements.results.innerHTML = '';
      elements.runMetrics.innerHTML = '';
      return;
    }

    elements.progressCard.hidden = false;
    elements.runBadge.className = `badge ${stateClass(state.status)}`;
    elements.runBadge.textContent = stateLabel(state.status);

    const done = state.items.filter((item) => !['pending', 'searching'].includes(item.status)).length;
    elements.progressBar.value = Math.round((done / state.items.length) * 100);
    const runDetail = state.detail || `${done} de ${state.items.length} processado(s).`;
    const protectionDetail = state.tabProtection?.active
      ? ' Aba protegida contra descarte; em segundo plano a execução pode ficar mais lenta.'
      : '';
    elements.runDetail.textContent = `${runDetail}${protectionDetail}`;
    renderMetrics(state);

    const head = `
      <div class="results-head">
        <span>#</span>
        <span>CNAE e validação</span>
        <span>Papel</span>
        <span>Situação</span>
      </div>`;

    const rows = state.items.map((item, index) => {
      const tone = resultTone(item);
      const cnaeBadge = badgeHtml(tone, itemLabel(item.status));
      const roleBadge = badgeHtml(item.role === 'principal' ? 'running' : 'neutral', item.role === 'principal' ? 'Principal' : 'Secundária');
      const requestedAnswer = Object.prototype.hasOwnProperty.call(appliedAddressAnswers, tools.normalizeCode(item.code || item.formatted || ''))
        ? appliedAddressAnswers[tools.normalizeCode(item.code || item.formatted || '')]
        : undefined;
      const answerRequestLine = requestedAnswer !== undefined
        ? `<p class="result-subdetail">Dossiê solicita: <strong>${escapeHtml(addressLabel(requestedAnswer))}</strong>.</p>`
        : '';
      const addressLine = item.addressStatus
        ? `<p class="result-subdetail">Endereço: ${badgeHtml(resultTone({ status: 'added', addressStatus: item.addressStatus }), addressStatusLabel(item.addressStatus))}${item.addressDetail ? ` <span class="inline-detail">${escapeHtml(item.addressDetail)}</span>` : ''}</p>${answerRequestLine}`
        : answerRequestLine;
      return `
        <div class="result-row ${escapeHtml(tone)} ${escapeHtml(item.status)}">
          <div class="result-cell result-index">${index + 1}</div>
          <div class="result-cell result-main">
            <div class="result-line-top">
              <span class="result-code">${escapeHtml(item.formatted)}</span>
              ${cnaeBadge}
            </div>
            <p class="result-detail">${escapeHtml(item.detail || item.expectedDescription || itemLabel(item.status))}</p>
            ${addressLine}
          </div>
          <div class="result-cell result-role">${roleBadge}</div>
          <div class="result-cell result-status-marker"><span class="status-dot ${escapeHtml(tone)}"></span></div>
        </div>`;
    }).join('');

    elements.results.innerHTML = `${head}<div class="results-body">${rows}</div>`;

    const active = ['running', 'paused'].includes(state.status);
    elements.start.disabled = active || !screenSupported || parsed.codes.length === 0;
    elements.pause.disabled = state.status !== 'running';
    elements.resume.disabled = state.status !== 'paused';
    elements.stop.disabled = !active;
    elements.resetRun.disabled = active;
  }

  async function analyze() {
    elements.analyze.disabled = true;
    elements.screenBadge.className = 'badge running';
    elements.screenBadge.textContent = 'Analisando';
    elements.screenDetail.textContent = 'Procurando os controles de atividade na aba atual…';
    try {
      const response = await sendToPortal({ type: 'juceesCnaeAnalyze' });
      if (!response?.ok) throw new Error(response?.error || 'Não foi possível analisar a página.');
      const analysis = response.analysis;
      const extra = analysis.existingCodes?.length
        ? ` ${analysis.existingCodes.length} CNAE(s) já visível(is) serão preservados.`
        : '';
      setScreenState(analysis.supported, `${analysis.detail}${extra}`);
      if (response.run) renderRun(response.run);
      return analysis.supported;
    } catch (error) {
      setScreenState(false, error.message);
      return false;
    } finally {
      elements.analyze.disabled = false;
    }
  }

  async function applyImportedDossierToQueue() {
    if (!importedDossier) return;
    const draft = dossierTools.extractCnaeDraft(importedDossier);
    elements.codes.value = draft.codes.join('\n');
    appliedAddressAnswers = { ...draft.addressAnswers };
    principalPreferenceSet = true;
    renderParser(draft.principalCode);
    screenSupported = false;
    elements.screenBadge.className = 'badge neutral';
    elements.screenBadge.textContent = 'Analise novamente';
    elements.screenDetail.textContent = 'Os CNAEs vieram do dossiê. Confirme a etapa atual do portal antes de iniciar.';
    updateStartButton();
    await saveDraft();
    const automaticAnswers = Object.values(appliedAddressAnswers).filter((value) => value === true || value === false).length;
    const manualAnswers = Object.values(appliedAddressAnswers).filter((value) => value === null).length;
    elements.dossierDetail.textContent = `CNAEs transferidos. Respostas de endereço: ${automaticAnswers} automática(s) e ${manualAnswers} manual(is).`;
  }

  async function resetRunState() {
    try { await sendToPortal({ type: 'juceesCnaeStop' }); } catch {}
    await chrome.storage.local.remove([STORAGE_KEY]);
    renderRun(null);
    screenSupported = false;
    elements.screenBadge.className = 'badge neutral';
    elements.screenBadge.textContent = 'Analise novamente';
    elements.screenDetail.textContent = 'A execução foi limpa. Você pode analisar a tela e iniciar tudo de novo.';
    updateStartButton();
  }

  async function clearExtensionState() {
    const confirmed = confirm('Limpar a extensão neste painel? Isso remove a fila, o progresso, o dossiê importado e restaura a velocidade padrão.');
    if (!confirmed) return;
    try { await sendToPortal({ type: 'juceesCnaeStop' }); } catch {}
    await chrome.storage.local.remove([STORAGE_KEY, DRAFT_KEY, SETTINGS_KEY]);
    await chrome.storage.session.remove([OBJECT_DRAFT_KEY]);
    discardDossier();
    elements.codes.value = '';
    appliedAddressAnswers = {};
    principalPreferenceSet = false;
    renderParser();
    elements.performanceProfile.value = performanceTools.normalizeProfile('balanced');
    renderPerformanceHint();
    renderRun(null);
    elements.objectCompany.value = '';
    elements.objectEstablishment.value = '';
    setObjectsState('neutral', 'Não verificado', 'Nenhum objeto aplicado nesta sessão.');
    updateObjectButtons();
    screenSupported = false;
    elements.screenBadge.className = 'badge warning';
    elements.screenBadge.textContent = 'Não analisada';
    elements.screenDetail.textContent = 'Extensão limpa. Importe um dossiê ou informe os CNAEs novamente.';
    updateStartButton();
  }

  elements.codes.addEventListener('input', () => {
    renderParser();
    appliedAddressAnswers = sanitizeAddressAnswers(appliedAddressAnswers);
    screenSupported = false;
    elements.screenBadge.className = 'badge neutral';
    elements.screenBadge.textContent = 'Analise novamente';
    elements.screenDetail.textContent = 'A lista mudou. Confirme novamente a etapa atual do portal.';
    updateStartButton();
    void saveDraft();
  });

  elements.principal.addEventListener('change', () => {
    principalPreferenceSet = true;
    void saveDraft();
  });

  elements.performanceProfile.addEventListener('change', () => {
    elements.performanceProfile.value = performanceTools.normalizeProfile(elements.performanceProfile.value);
    renderPerformanceHint();
    void saveSettings();
  });

  elements.dossierFile.addEventListener('change', () => {
    const [file] = elements.dossierFile.files || [];
    if (file) void loadDossier(file);
  });

  elements.applyDossierCnaes.addEventListener('click', () => { void applyImportedDossierToQueue(); });
  elements.reloadDossierCnaes.addEventListener('click', () => { void applyImportedDossierToQueue(); });
  elements.discardDossier.addEventListener('click', discardDossier);
  elements.analyze.addEventListener('click', () => { void analyze(); });
  elements.loadDossierObjects.addEventListener('click', () => { void loadObjectsFromDossier(); });
  elements.analyzeObjects.addEventListener('click', () => { void analyzeObjects(); });
  elements.applyObjects.addEventListener('click', () => { void applyObjectsToPortal(); });
  elements.objectCompany.addEventListener('input', markObjectsChanged);
  elements.objectEstablishment.addEventListener('input', markObjectsChanged);

  elements.start.addEventListener('click', async () => {
    elements.start.disabled = true;
    const supported = await analyze();
    if (!supported) return;
    try {
      const response = await sendToPortal({
        type: 'juceesCnaeStart',
        payload: {
          runId: crypto.randomUUID(),
          codes: parsed.codes,
          principalCode: elements.principal.value,
          addressAnswers: sanitizeAddressAnswers(appliedAddressAnswers),
          performanceProfile: performanceTools.normalizeProfile(elements.performanceProfile.value)
        }
      });
      if (!response?.ok) throw new Error(response?.error || 'A fila não pôde ser iniciada.');
      elements.pause.disabled = false;
      elements.stop.disabled = false;
      await saveDraft();
    } catch (error) {
      setScreenState(false, error.message);
    }
  });

  elements.pause.addEventListener('click', async () => {
    try { await sendToPortal({ type: 'juceesCnaePause' }); } catch (error) { setScreenState(false, error.message); }
  });
  elements.resume.addEventListener('click', async () => {
    try { await sendToPortal({ type: 'juceesCnaeResume' }); } catch (error) { setScreenState(false, error.message); }
  });
  elements.stop.addEventListener('click', async () => {
    try { await sendToPortal({ type: 'juceesCnaeStop' }); } catch (error) { setScreenState(false, error.message); }
  });
  elements.resetRun.addEventListener('click', () => { void resetRunState(); });
  elements.clearExtension.addEventListener('click', () => { void clearExtensionState(); });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
      renderRun(changes[STORAGE_KEY].newValue);
    }
  });

  let reloadRecoveryTimer = null;
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.active) return;
    clearTimeout(reloadRecoveryTimer);
    reloadRecoveryTimer = setTimeout(() => { void analyze(); }, 350);
  });

  async function initialize() {
    const stored = await chrome.storage.local.get([DRAFT_KEY, STORAGE_KEY, SETTINGS_KEY]);
    const sessionStored = await chrome.storage.session.get([OBJECT_DRAFT_KEY]);
    const draft = stored[DRAFT_KEY] || {};
    const objectDraft = sessionStored[OBJECT_DRAFT_KEY] || {};
    const settings = stored[SETTINGS_KEY] || {};
    elements.codes.value = draft.text || '';
    principalPreferenceSet = Object.prototype.hasOwnProperty.call(draft, 'principalCode');
    renderParser(draft.principalCode);
    appliedAddressAnswers = sanitizeAddressAnswers(draft.addressAnswers || {});
    elements.performanceProfile.value = performanceTools.normalizeProfile(settings.performanceProfile);
    elements.objectCompany.value = typeof objectDraft.objetoEmpresa === 'string' ? objectDraft.objetoEmpresa : '';
    elements.objectEstablishment.value = typeof objectDraft.objetoEstabelecimento === 'string' ? objectDraft.objetoEstabelecimento : '';
    updateObjectButtons();
    renderPerformanceHint();
    renderRun(stored[STORAGE_KEY]);
    elements.pause.disabled = true;
    elements.resume.disabled = true;
    elements.stop.disabled = true;
    if (['running', 'paused'].includes(stored[STORAGE_KEY]?.status)) await analyze();
  }

  void initialize();
})();
