(() => {
  const tools = globalThis.JuceesCnae;
  const dossierTools = globalThis.JuceesDossier;
  const performanceTools = globalThis.JuceesPerformance;
  const processBaseline = globalThis.JuceesProcessBaseline;
  const processData = globalThis.JuceesProcessData;
  const STORAGE_KEY = 'juceesCnaeRunState';
  const DRAFT_KEY = 'juceesCnaeDraft';
  const SETTINGS_KEY = 'juceesCnaeSettings';
  const OBJECT_DRAFT_KEY = 'juceesObjectDraft';
  const PROCESS_DRAFT_KEY = 'juceesProcessDrafts';
  const QUESTIONS_DRAFT_KEY = 'juceesQuestionDrafts';
  const PROCESS_AUDIT_KEY = 'juceesProcessAudit';
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
    applyObjects: document.getElementById('applyObjects'),
    processBadge: document.getElementById('processBadge'),
    processStage: document.getElementById('processStage'),
    processPhase: document.getElementById('processPhase'),
    processDetail: document.getElementById('processDetail'),
    processMetrics: document.getElementById('processMetrics'),
    processFields: document.getElementById('processFields'),
    processForbidden: document.getElementById('processForbidden'),
    analyzeProcess: document.getElementById('analyzeProcess'),
    applyProcess: document.getElementById('applyProcess'),
    checkpointProcess: document.getElementById('checkpointProcess'),
    processRoadmap: document.getElementById('processRoadmap'),
    processAuditSummary: document.getElementById('processAuditSummary'),
    questionsBadge: document.getElementById('questionsBadge'),
    questionsDetail: document.getElementById('questionsDetail'),
    questionsList: document.getElementById('questionsList'),
    analyzeQuestions: document.getElementById('analyzeQuestions'),
    applyQuestions: document.getElementById('applyQuestions')
  };

  let parsed = { codes: [], invalid: [], unknown: [] };
  let screenSupported = false;
  let principalPreferenceSet = false;
  let importedDossier = null;
  let appliedAddressAnswers = {};
  let dossierLoadSequence = 0;
  let currentProcessAnalysis = null;
  let stageManualDrafts = {};
  let questionAnswers = {};
  let processAudit = {};
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


  function invalidateProcessPanel(reason = 'Dados de entrada alterados. Analise novamente a tela atual antes de aplicar qualquer valor.') {
    currentProcessAnalysis = null;
    elements.processBadge.className = 'badge warning';
    elements.processBadge.textContent = 'Reanalisar';
    elements.processStage.textContent = 'Dados alterados';
    elements.processPhase.textContent = '';
    elements.processDetail.textContent = reason;
    elements.processMetrics.replaceChildren();
    elements.processFields.replaceChildren();
    elements.processFields.hidden = true;
    elements.processForbidden.hidden = true;
    elements.processForbidden.textContent = '';
    elements.applyProcess.disabled = true;
    elements.checkpointProcess.disabled = true;
    renderRoadmap('');
  }

  function normalizeChoiceLabel(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function findQuestionOption(select, stored) {
    const candidates = new Set([normalizeChoiceLabel(stored)]);
    if (stored === true || normalizeChoiceLabel(stored) === 'true' || normalizeChoiceLabel(stored) === '1') {
      candidates.add('sim');
      candidates.add('yes');
    }
    if (stored === false || normalizeChoiceLabel(stored) === 'false' || normalizeChoiceLabel(stored) === '0') {
      candidates.add('nao');
      candidates.add('no');
    }
    return [...select.options].find((entry) => {
      return candidates.has(normalizeChoiceLabel(entry.value)) || candidates.has(normalizeChoiceLabel(entry.textContent));
    });
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
    invalidateProcessPanel(report.valid
      ? 'Dossiê carregado/alterado. Analise novamente a tela atual para cruzar os novos dados.'
      : 'O dossiê informado é inválido. Corrija-o ou continue com preenchimento manual e reanalise a tela.');
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
    invalidateProcessPanel('Dossiê removido. Os valores manuais da sessão foram preservados; analise novamente a tela atual.');
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

  function toneForStatus(status) {
    if (['confirmed', 'verified', 'same_existing', 'ready_for_human_review'].includes(status)) return 'success';
    if (['processing', 'running', 'ready'].includes(status)) return 'running';
    if (['conflict', 'ambiguous', 'unverified', 'screen_error', 'error'].includes(status)) return 'error';
    if (['not_informed', 'manual', 'conference', 'not_found', 'unmapped', 'review_required'].includes(status)) return 'warning';
    return 'neutral';
  }

  function humanMode(mode) {
    const modes = {
      auto_safe: 'Automático seguro', assisted: 'Assistido', conference: 'Conferência', manual: 'Manual', blocked: 'Bloqueado'
    };
    return modes[mode] || mode || '—';
  }

  function humanStatus(status) {
    const statuses = {
      confirmed: 'Confirmado', verified: 'Confirmado', ready: 'Pronto', conflict: 'Conflito', ambiguous: 'Ambíguo',
      not_found: 'Não localizado', not_informed: 'Não informado', manual: 'Manual', conference: 'Conferir',
      blocked: 'Bloqueado', unverified: 'Não confirmado', review_required: 'Revisão necessária',
      ready_for_human_review: 'Pronto para revisão', mapped: 'Mapeado'
    };
    return statuses[status] || status || '—';
  }

  function renderRoadmap(currentStageId = '') {
    if (!elements.processRoadmap || !processBaseline?.STAGES) return;
    elements.processRoadmap.replaceChildren();
    for (const stage of processBaseline.STAGES) {
      const row = document.createElement('div');
      row.className = `roadmap-row${stage.id === currentStageId ? ' current' : ''}`;
      const id = document.createElement('span');
      id.className = 'roadmap-id';
      id.textContent = stage.id;
      const title = document.createElement('span');
      title.className = 'roadmap-title';
      title.textContent = stage.title;
      const badge = document.createElement('span');
      const audit = processAudit?.[stage.id];
      if (audit?.status === 'ready_for_human_review') { badge.className = 'badge success'; badge.textContent = 'Revisado'; }
      else if (audit?.status === 'review_required') { badge.className = 'badge warning'; badge.textContent = 'Revisar'; }
      else if (audit) { badge.className = 'badge running'; badge.textContent = 'Analisado'; }
      else {
        badge.className = `badge ${stage.status === 'homologated' ? 'success' : stage.status === 'candidate' ? 'running' : 'neutral'}`;
        badge.textContent = stage.status === 'homologated' ? 'Homologado' : stage.status === 'candidate' ? 'Candidato' : stage.status === 'future' ? 'Futuro' : 'Documental';
      }
      row.append(id, title, badge);
      elements.processRoadmap.append(row);
    }
    renderAuditSummary();
  }

  function valuesForCurrentStage(stageId) {
    const manual = stageManualDrafts?.[stageId] || {};
    return processData.mergeStageValues(importedDossier, stageId, manual);
  }

  async function saveProcessDrafts() {
    await chrome.storage.session.set({
      [PROCESS_DRAFT_KEY]: stageManualDrafts,
      [QUESTIONS_DRAFT_KEY]: questionAnswers,
      [PROCESS_AUDIT_KEY]: processAudit
    });
  }

  function auditStatusFromAnalysis(analysis) {
    if (!analysis?.supported) return 'review_required';
    const counts = analysis.counts || {};
    const conflicts = (counts.conflict || 0) + (counts.ambiguous || 0) + (counts.not_found || 0) + (counts.unverified || 0);
    const pending = (counts.not_informed || 0) + (counts.manual || 0) + (counts.conference || 0) + (counts.ready || 0);
    if (conflicts) return 'review_required';
    if (pending) return 'analyzed';
    return 'ready_for_human_review';
  }

  function recordProcessAudit(analysis, forcedStatus = '') {
    if (!analysis?.stageId) return;
    processAudit[analysis.stageId] = {
      status: forcedStatus || auditStatusFromAnalysis(analysis),
      confidence: analysis.confidence || '',
      counts: analysis.counts || {},
      updatedAt: new Date().toISOString()
    };
    renderRoadmap(analysis.stageId);
    void saveProcessDrafts();
  }

  function renderAuditSummary() {
    const entries = Object.values(processAudit || {});
    if (!entries.length) {
      elements.processAuditSummary.textContent = 'Nenhuma etapa analisada nesta sessão.';
      return;
    }
    const ready = entries.filter((entry) => entry.status === 'ready_for_human_review').length;
    const review = entries.filter((entry) => entry.status === 'review_required').length;
    elements.processAuditSummary.textContent = `${entries.length} etapa(s) analisada(s) • ${ready} pronta(s) para revisão • ${review} com revisão necessária.`;
  }

  function fieldEditor(stageId, field, valueRecord) {
    if (['collection', 'dynamic_questions', 'status'].includes(field.kind)) return null;
    if (field.mode === 'blocked') return null;
    let input;
    if (field.kind === 'boolean') {
      input = document.createElement('select');
      for (const [value, label] of [['', 'Não informado'], ['true', 'Sim'], ['false', 'Não']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        input.append(option);
      }
      if (valueRecord?.value === true) input.value = 'true';
      else if (valueRecord?.value === false) input.value = 'false';
      else input.value = '';
    } else if (field.kind === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
      input.value = valueRecord?.value == null ? '' : String(valueRecord.value);
    } else {
      input = document.createElement('input');
      input.type = field.kind === 'date' ? 'date' : field.kind === 'email' ? 'email' : field.kind === 'number' ? 'text' : 'text';
      input.value = Array.isArray(valueRecord?.value) ? valueRecord.value.join('; ') : valueRecord?.value == null ? '' : String(valueRecord.value);
    }
    input.className = 'stage-editor';
    input.dataset.fieldKey = field.key;
    input.setAttribute('aria-label', `Valor manual para ${field.label}`);
    input.addEventListener('change', () => {
      const stage = processBaseline.getStage(stageId);
      const definition = stage?.fields.find((item) => item.key === field.key);
      const raw = field.kind === 'boolean' ? input.value : input.value;
      const parsedValue = raw === '' ? '' : processData.serializeManualValue(definition, raw);
      stageManualDrafts[stageId] ||= {};
      if (parsedValue === '' || parsedValue === null && field.kind !== 'boolean') delete stageManualDrafts[stageId][field.key];
      else stageManualDrafts[stageId][field.key] = { value: parsedValue };
      elements.processBadge.className = 'badge warning';
      elements.processBadge.textContent = 'Reanalisar';
      elements.processDetail.textContent = 'Um valor manual foi alterado. Reanalise a etapa antes de aplicar.';
      elements.applyProcess.disabled = true;
      void saveProcessDrafts();
    });
    return input;
  }

  function renderProcessFields(analysis) {
    elements.processFields.replaceChildren();
    if (!analysis?.stageId) {
      elements.processFields.hidden = true;
      return;
    }
    const stage = processBaseline.getStage(analysis.stageId);
    const values = valuesForCurrentStage(analysis.stageId);
    for (const field of stage?.fields || []) {
      const result = analysis.fields?.find((item) => item.key === field.key) || { status: 'not_informed', detail: 'Ainda não analisado.' };
      const valueRecord = values[field.key];
      const row = document.createElement('div');
      row.className = `process-field ${toneForStatus(result.status)}`;

      const header = document.createElement('div');
      header.className = 'process-field-header';
      const label = document.createElement('strong');
      label.textContent = field.label;
      const badges = document.createElement('div');
      badges.className = 'field-badges';
      const mode = document.createElement('span');
      mode.className = 'mini-badge';
      mode.textContent = humanMode(field.mode);
      const status = document.createElement('span');
      status.className = `mini-badge ${toneForStatus(result.status)}`;
      status.textContent = humanStatus(result.status);
      badges.append(mode, status);
      header.append(label, badges);

      const detail = document.createElement('p');
      detail.className = 'field-detail';
      const source = valueRecord?.source === 'manual' ? 'Manual' : valueRecord?.source === 'dossier' ? 'Dossiê' : 'Sem dado';
      detail.textContent = `${source} • ${result.detail || 'Sem diagnóstico.'}`;
      row.append(header, detail);

      const editor = fieldEditor(analysis.stageId, field, valueRecord);
      if (editor) row.append(editor);
      else if (valueRecord) {
        const preview = document.createElement('p');
        preview.className = 'field-value-preview';
        preview.textContent = `Dado disponível: ${processData.previewValue(field, valueRecord.value)}`;
        row.append(preview);
      }
      elements.processFields.append(row);
    }
    elements.processFields.hidden = !(stage?.fields?.length);
  }

  function renderProcessAnalysis(analysis) {
    currentProcessAnalysis = analysis?.supported ? analysis : null;
    const supported = Boolean(analysis?.supported && analysis?.stageId);
    elements.processBadge.className = `badge ${supported ? (analysis.confidence === 'high' ? 'success' : 'warning') : 'warning'}`;
    elements.processBadge.textContent = supported ? (analysis.confidence === 'high' ? 'Reconhecida' : 'Validar DOM') : 'Não reconhecida';
    elements.processStage.textContent = supported ? `${analysis.stageId} — ${analysis.title}` : 'Nenhuma etapa reconhecida';
    elements.processPhase.textContent = supported ? String(analysis.phase || '').replace('_', ' ') : '';
    elements.processDetail.textContent = analysis?.detail || 'A tela não foi reconhecida com segurança.';
    renderRoadmap(supported ? analysis.stageId : '');
    renderProcessFields(analysis);

    elements.processMetrics.replaceChildren();
    if (supported) {
      const metrics = [
        ['Confirmados', analysis.counts?.confirmed || 0],
        ['Prontos', analysis.counts?.ready || 0],
        ['Pendências', (analysis.counts?.not_informed || 0) + (analysis.counts?.manual || 0) + (analysis.counts?.conference || 0)],
        ['Revisar', (analysis.counts?.conflict || 0) + (analysis.counts?.ambiguous || 0) + (analysis.counts?.not_found || 0) + (analysis.counts?.unverified || 0)]
      ];
      for (const [label, value] of metrics) {
        const metric = document.createElement('div');
        metric.className = 'process-metric';
        const strong = document.createElement('strong'); strong.textContent = String(value);
        const span = document.createElement('span'); span.textContent = label;
        metric.append(strong, span); elements.processMetrics.append(metric);
      }
    }

    const forbidden = analysis?.forbiddenActions || [];
    if (forbidden.length) {
      elements.processForbidden.hidden = false;
      elements.processForbidden.textContent = `Ações protegidas detectadas e não automatizadas: ${forbidden.join(', ')}.`;
    } else {
      elements.processForbidden.hidden = true;
      elements.processForbidden.textContent = '';
    }

    const stage = supported ? processBaseline.getStage(analysis.stageId) : null;
    const genericApply = supported && analysis.confidence === 'high' && stage?.applyEnabled && !['activities', 'questions', 'checkpoint'].includes(stage.specialized || '');
    elements.applyProcess.disabled = !genericApply;
    elements.checkpointProcess.disabled = !supported;
  }

  async function analyzeProcess() {
    elements.analyzeProcess.disabled = true;
    elements.processBadge.className = 'badge running';
    elements.processBadge.textContent = 'Analisando';
    elements.processDetail.textContent = 'Identificando etapa e controles por evidências estruturais…';
    try {
      let response = await sendToPortal({ type: 'juceesProcessAnalyze', values: {} });
      if (!response?.ok) throw new Error(response?.error || 'Não foi possível analisar a etapa.');
      let analysis = response.analysis;
      if (analysis?.supported && analysis.stageId) {
        const values = valuesForCurrentStage(analysis.stageId);
        response = await sendToPortal({ type: 'juceesProcessAnalyze', values });
        if (!response?.ok) throw new Error(response?.error || 'Não foi possível cruzar os dados da etapa.');
        analysis = response.analysis;
      }
      renderProcessAnalysis(analysis);
      if (analysis?.supported) recordProcessAudit(analysis);
      return analysis;
    } catch (error) {
      renderProcessAnalysis({ supported: false, detail: error.message, fields: [], forbiddenActions: [] });
      return null;
    } finally {
      elements.analyzeProcess.disabled = false;
    }
  }

  async function applyProcessStage() {
    if (!currentProcessAnalysis?.stageId) return;
    const stageId = currentProcessAnalysis.stageId;
    const values = valuesForCurrentStage(stageId);
    elements.applyProcess.disabled = true;
    elements.processBadge.className = 'badge running';
    elements.processBadge.textContent = 'Aplicando';
    elements.processDetail.textContent = 'Aplicando somente campos vazios/compatíveis e confirmando o DOM…';
    try {
      const response = await sendToPortal({ type: 'juceesProcessApply', stageId, values });
      const result = response?.result;
      if (!result) throw new Error(response?.error || 'O portal não retornou o resultado da aplicação.');
      elements.processDetail.textContent = result.detail;
      elements.processBadge.className = `badge ${result.ok ? 'success' : 'error'}`;
      elements.processBadge.textContent = result.ok ? 'Aplicado/confirmado' : 'Revisão necessária';
      await analyzeProcess();
    } catch (error) {
      elements.processBadge.className = 'badge error';
      elements.processBadge.textContent = 'Erro';
      elements.processDetail.textContent = error.message;
    }
  }

  async function checkpointProcessStage() {
    if (!currentProcessAnalysis?.stageId) return;
    const values = valuesForCurrentStage(currentProcessAnalysis.stageId);
    elements.checkpointProcess.disabled = true;
    try {
      const response = await sendToPortal({ type: 'juceesProcessCheckpoint', values });
      if (!response?.ok) throw new Error(response?.error || 'Não foi possível conferir a etapa.');
      const checkpoint = response.checkpoint;
      elements.processBadge.className = `badge ${checkpoint.status === 'ready_for_human_review' ? 'success' : 'warning'}`;
      elements.processBadge.textContent = checkpoint.status === 'ready_for_human_review' ? 'Pronto para revisão' : 'Revisão necessária';
      elements.processDetail.textContent = checkpoint.detail;
      recordProcessAudit(currentProcessAnalysis, checkpoint.status);
    } catch (error) {
      elements.processBadge.className = 'badge error';
      elements.processBadge.textContent = 'Erro';
      elements.processDetail.textContent = error.message;
    } finally {
      elements.checkpointProcess.disabled = false;
    }
  }

  function dossierQuestionValue(question) {
    const source = importedDossier?.estabelecimento?.perguntasComplementares;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
    if (Object.prototype.hasOwnProperty.call(source, question.key)) return source[question.key];
    const exactKey = Object.keys(source).find((key) => key.trim().toLowerCase() === question.questionText.trim().toLowerCase());
    return exactKey ? source[exactKey] : undefined;
  }

  function renderQuestions(questions) {
    elements.questionsList.replaceChildren();
    if (!questions?.length) {
      elements.questionsList.hidden = true;
      elements.applyQuestions.disabled = true;
      return;
    }
    for (const question of questions) {
      const row = document.createElement('div');
      row.className = 'question-row';
      const label = document.createElement('label');
      label.textContent = question.questionText;
      const select = document.createElement('select');
      select.dataset.questionKey = question.key;
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Manual / não informado';
      select.append(blank);
      for (const option of question.options || []) {
        if (!String(option.label || option.value || '').trim()) continue;
        const item = document.createElement('option');
        item.value = option.label || option.value;
        item.textContent = option.label || option.value;
        select.append(item);
      }
      const stored = Object.prototype.hasOwnProperty.call(questionAnswers, question.key) ? questionAnswers[question.key] : dossierQuestionValue(question);
      if (stored !== undefined && stored !== null) {
        const option = findQuestionOption(select, stored);
        if (option) {
          select.value = option.value;
          questionAnswers[question.key] = option.value;
        }
      }
      select.addEventListener('change', () => {
        if (select.value) questionAnswers[question.key] = select.value;
        else delete questionAnswers[question.key];
        elements.applyQuestions.disabled = Object.keys(questionAnswers).length === 0;
        void saveProcessDrafts();
      });
      const meta = document.createElement('p');
      meta.className = 'field-detail';
      const checked = question.options?.find((option) => option.checked);
      meta.textContent = checked ? `Portal: ${checked.label || checked.value}` : 'Portal: sem resposta marcada identificada.';
      row.append(label, select, meta);
      elements.questionsList.append(row);
    }
    elements.questionsList.hidden = false;
    elements.applyQuestions.disabled = Object.keys(questionAnswers).length === 0;
  }

  async function analyzeQuestions() {
    elements.analyzeQuestions.disabled = true;
    elements.questionsBadge.className = 'badge running';
    elements.questionsBadge.textContent = 'Mapeando';
    try {
      const response = await sendToPortal({ type: 'juceesQuestionsAnalyze' });
      if (!response?.ok) throw new Error(response?.error || 'Não foi possível mapear perguntas.');
      const questions = response.questions || [];
      renderQuestions(questions);
      elements.questionsBadge.className = `badge ${questions.length ? 'success' : 'warning'}`;
      elements.questionsBadge.textContent = questions.length ? `${questions.length} mapeada(s)` : 'Nenhuma';
      elements.questionsDetail.textContent = questions.length
        ? 'Responda somente o que você conhece. A extensão reapresenta as opções exatamente como estão no portal.'
        : 'Nenhum grupo de pergunta com opções foi reconhecido nesta tela.';
    } catch (error) {
      elements.questionsBadge.className = 'badge error';
      elements.questionsBadge.textContent = 'Erro';
      elements.questionsDetail.textContent = error.message;
    } finally {
      elements.analyzeQuestions.disabled = false;
    }
  }

  async function applyQuestionAnswers() {
    const answers = Object.fromEntries(Object.entries(questionAnswers).filter(([, value]) => value !== '' && value !== null && value !== undefined));
    if (!Object.keys(answers).length) return;
    elements.applyQuestions.disabled = true;
    elements.questionsBadge.className = 'badge running';
    elements.questionsBadge.textContent = 'Aplicando';
    try {
      const response = await sendToPortal({ type: 'juceesQuestionsApply', answers });
      const result = response?.result;
      if (!result) throw new Error(response?.error || 'Não foi possível aplicar as respostas.');
      elements.questionsBadge.className = `badge ${result.ok ? 'success' : 'error'}`;
      elements.questionsBadge.textContent = result.ok ? 'Confirmadas' : 'Revisar';
      elements.questionsDetail.textContent = result.detail;
      await analyzeQuestions();
    } catch (error) {
      elements.questionsBadge.className = 'badge error';
      elements.questionsBadge.textContent = 'Erro';
      elements.questionsDetail.textContent = error.message;
    } finally {
      elements.applyQuestions.disabled = Object.keys(questionAnswers).length === 0;
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
    await chrome.storage.session.remove([OBJECT_DRAFT_KEY, PROCESS_DRAFT_KEY, QUESTIONS_DRAFT_KEY, PROCESS_AUDIT_KEY]);
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
    stageManualDrafts = {};
    questionAnswers = {};
    currentProcessAnalysis = null;
    processAudit = {};
    renderProcessAnalysis({ supported: false, detail: 'Extensão limpa. Analise a tela atual para iniciar o assistente.', fields: [], forbiddenActions: [] });
    elements.questionsList.replaceChildren();
    elements.questionsList.hidden = true;
    elements.questionsBadge.className = 'badge neutral';
    elements.questionsBadge.textContent = 'Não analisadas';
    elements.questionsDetail.textContent = 'Nenhuma pergunta mapeada nesta sessão.';
    elements.applyQuestions.disabled = true;
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
  elements.analyzeProcess.addEventListener('click', () => { void analyzeProcess(); });
  elements.applyProcess.addEventListener('click', () => { void applyProcessStage(); });
  elements.checkpointProcess.addEventListener('click', () => { void checkpointProcessStage(); });
  elements.analyzeQuestions.addEventListener('click', () => { void analyzeQuestions(); });
  elements.applyQuestions.addEventListener('click', () => { void applyQuestionAnswers(); });

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
    const sessionStored = await chrome.storage.session.get([OBJECT_DRAFT_KEY, PROCESS_DRAFT_KEY, QUESTIONS_DRAFT_KEY, PROCESS_AUDIT_KEY]);
    const draft = stored[DRAFT_KEY] || {};
    const objectDraft = sessionStored[OBJECT_DRAFT_KEY] || {};
    stageManualDrafts = sessionStored[PROCESS_DRAFT_KEY] || {};
    questionAnswers = sessionStored[QUESTIONS_DRAFT_KEY] || {};
    processAudit = sessionStored[PROCESS_AUDIT_KEY] || {};
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
    renderRoadmap();
    renderProcessAnalysis({ supported: false, detail: 'Abra uma tela do processo e clique em Analisar etapa.', fields: [], forbiddenActions: [] });
    elements.applyQuestions.disabled = Object.keys(questionAnswers).length === 0;
    if (['running', 'paused'].includes(stored[STORAGE_KEY]?.status)) await analyze();
  }

  void initialize();
})();
