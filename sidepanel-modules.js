(() => {
  const SETTINGS_KEY = 'juceesModuleUiSettings';
  const MODULE_HINTS = Object.freeze({
    process: 'Fluxo de abertura: reconhece, preenche, confere e pode avançar etapas validadas.',
    cnae: 'CNAEs: módulo homologado de atividades e exercício no endereço.',
    objects: 'Objetos: Objeto da Empresa e Objeto do Estabelecimento.',
    questions: 'Perguntas: mapeamento dinâmico das perguntas complementares.',
    dossier: 'Dossiê: importação opcional dos dados estruturados do processo.'
  });

  const moduleButtons = [...document.querySelectorAll('[data-module-target]')];
  const modulePanels = [...document.querySelectorAll('[data-module-panel]')];
  const moduleHint = document.getElementById('moduleHint');
  const autoFlowOpening = document.getElementById('autoFlowOpening');
  const autoFlowStatus = document.getElementById('autoFlowStatus');
  const advanceValidatedStageButton = document.getElementById('advanceValidatedStage');
  const processBadge = document.getElementById('processBadge');
  const processStage = document.getElementById('processStage');
  const processMetrics = document.getElementById('processMetrics');
  const processDetail = document.getElementById('processDetail');
  const analyzeProcess = document.getElementById('analyzeProcess');
  const applyProcess = document.getElementById('applyProcess');
  const checkpointProcess = document.getElementById('checkpointProcess');

  let activeModule = 'process';
  let autoFlowBusy = false;
  let autoFlowBlockedStage = '';
  let autoFlowLastAction = '';
  let reanalysisTimer = null;

  function normalizeModule(value) {
    return MODULE_HINTS[value] ? value : 'process';
  }

  async function loadSettings() {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = stored[SETTINGS_KEY] || {};
    activeModule = normalizeModule(settings.activeModule);
    autoFlowOpening.checked = Boolean(settings.autoFlowOpening);
    setActiveModule(activeModule, false);
    updateAutoFlowStatus();
    syncAdvanceButton();
    if (autoFlowOpening.checked && activeModule === 'process') scheduleProcessAnalysis(250);
  }

  async function saveSettings() {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        activeModule,
        autoFlowOpening: Boolean(autoFlowOpening.checked)
      }
    });
  }

  function setActiveModule(moduleName, persist = true) {
    activeModule = normalizeModule(moduleName);
    for (const button of moduleButtons) {
      const selected = button.dataset.moduleTarget === activeModule;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    }
    for (const panel of modulePanels) panel.classList.toggle('module-hidden', panel.dataset.modulePanel !== activeModule);
    if (moduleHint) moduleHint.textContent = MODULE_HINTS[activeModule];
    if (persist) void saveSettings();
    if (activeModule === 'process') scheduleProcessAnalysis(120);
  }

  async function activePortalTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/([a-z0-9-]+\.)?simplifica\.es\.gov\.br\//i.test(tab.url || '')) {
      throw new Error('Abra o Simplifica/ES e mantenha a aba do processo ativa.');
    }
    return tab;
  }

  async function sendToPortal(message) {
    const tab = await activePortalTab();
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      throw new Error('A página ainda não está pronta para a extensão. Recarregue a aba do Simplifica/ES e tente novamente.');
    }
  }

  function currentStageId() {
    const text = String(processStage?.textContent || '').trim();
    const match = text.match(/^([A-Z]+-\d+)/);
    return match ? match[1] : '';
  }

  function processMetric(label) {
    for (const metric of processMetrics?.querySelectorAll('.process-metric') || []) {
      const name = metric.querySelector('span')?.textContent?.trim();
      if (name === label) return Number(metric.querySelector('strong')?.textContent || '0') || 0;
    }
    return 0;
  }

  function checkpointReady() {
    return String(processBadge?.textContent || '').trim() === 'Pronto para revisão';
  }

  function stageAnalyzedHigh() {
    return String(processBadge?.textContent || '').trim() === 'Reconhecida';
  }

  function syncAdvanceButton() {
    if (!advanceValidatedStageButton) return;
    advanceValidatedStageButton.disabled = !checkpointReady() || !currentStageId() || autoFlowBusy;
  }

  function setAutoStatus(message, tone = '') {
    if (!autoFlowStatus) return;
    autoFlowStatus.textContent = message;
    autoFlowStatus.className = `summary${tone ? ` ${tone}` : ''}`;
  }

  function updateAutoFlowStatus() {
    if (!autoFlowOpening?.checked) {
      setAutoStatus('Desativado. O avanço continua manual.');
      return;
    }
    setAutoStatus('Ativado. O fluxo age somente quando a etapa estiver reconhecida com segurança e sem pendências.', 'success');
  }

  function scheduleProcessAnalysis(delay = 500) {
    if (!analyzeProcess || activeModule !== 'process') return;
    clearTimeout(reanalysisTimer);
    reanalysisTimer = setTimeout(() => {
      if (!analyzeProcess.disabled) analyzeProcess.click();
    }, delay);
  }

  async function advanceValidatedStage() {
    const stageId = currentStageId();
    if (!stageId || !checkpointReady() || autoFlowBusy) return false;
    autoFlowBusy = true;
    syncAdvanceButton();
    setAutoStatus(`Avançando ${stageId}…`, 'running');
    try {
      const response = await sendToPortal({ type: 'juceesProcessAdvance', stageId });
      const result = response?.result;
      if (!response?.ok || !result?.ok) {
        const detail = result?.detail || response?.error || 'A etapa não pôde ser avançada automaticamente.';
        autoFlowBlockedStage = stageId;
        setAutoStatus(detail, 'warning');
        return false;
      }
      autoFlowLastAction = `${stageId}:advance`;
      autoFlowBlockedStage = '';
      if (processBadge) { processBadge.className = 'badge running'; processBadge.textContent = 'Avançando'; }
      if (processDetail) processDetail.textContent = result.detail;
      setAutoStatus(result.detail, 'success');
      scheduleProcessAnalysis(900);
      return true;
    } catch (error) {
      autoFlowBlockedStage = stageId;
      setAutoStatus(error.message, 'error');
      return false;
    } finally {
      setTimeout(() => {
        autoFlowBusy = false;
        syncAdvanceButton();
      }, 450);
    }
  }

  function maybeRunAutomaticFlow() {
    syncAdvanceButton();
    if (!autoFlowOpening?.checked || activeModule !== 'process' || autoFlowBusy) return;
    const stageId = currentStageId();
    if (!stageId || autoFlowBlockedStage === stageId) return;
    if (autoFlowLastAction === `${stageId}:advance`) {
      setAutoStatus(`Aguardando o portal carregar a próxima etapa após ${stageId}…`, 'running');
      return;
    }

    if (checkpointReady()) {
      if (autoFlowLastAction === `${stageId}:advance`) return;
      void advanceValidatedStage();
      return;
    }

    if (!stageAnalyzedHigh()) return;
    const ready = processMetric('Prontos');
    const pending = processMetric('Pendências');
    const review = processMetric('Revisar');

    if (review > 0 || pending > 0) {
      setAutoStatus(`Fluxo pausado em ${stageId}: há ${pending} pendência(s) e ${review} item(ns) para revisão.`, 'warning');
      return;
    }

    if (ready > 0) {
      if (!applyProcess?.disabled && autoFlowLastAction !== `${stageId}:apply`) {
        autoFlowLastAction = `${stageId}:apply`;
        setAutoStatus(`Aplicando ${ready} campo(s) seguro(s) em ${stageId}…`, 'running');
        applyProcess.click();
      } else if (applyProcess?.disabled) {
        setAutoStatus(`Fluxo pausado em ${stageId}: esta etapa exige um módulo específico ou ação manual.`, 'warning');
      }
      return;
    }

    if (!checkpointProcess?.disabled && autoFlowLastAction !== `${stageId}:checkpoint`) {
      autoFlowLastAction = `${stageId}:checkpoint`;
      setAutoStatus(`Conferindo ${stageId} antes de navegar…`, 'running');
      checkpointProcess.click();
    }
  }

  for (const button of moduleButtons) {
    button.addEventListener('click', () => setActiveModule(button.dataset.moduleTarget));
  }

  autoFlowOpening?.addEventListener('change', () => {
    autoFlowBlockedStage = '';
    autoFlowLastAction = '';
    updateAutoFlowStatus();
    void saveSettings();
    if (autoFlowOpening.checked) {
      setActiveModule('process');
      scheduleProcessAnalysis(80);
    }
  });

  advanceValidatedStageButton?.addEventListener('click', () => { void advanceValidatedStage(); });
  const observer = new MutationObserver(() => {
    const stageId = currentStageId();
    if (stageId && autoFlowLastAction.startsWith(`${stageId}:`) && stageAnalyzedHigh()) {
      if (autoFlowLastAction.endsWith(':apply')) autoFlowLastAction = '';
    }
    queueMicrotask(maybeRunAutomaticFlow);
  });
  if (processBadge) observer.observe(processBadge, { childList: true, subtree: true, attributes: true });
  if (processStage) observer.observe(processStage, { childList: true, subtree: true });
  if (processMetrics) observer.observe(processMetrics, { childList: true, subtree: true });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.active || activeModule !== 'process') return;
    autoFlowLastAction = '';
    autoFlowBlockedStage = '';
    scheduleProcessAnalysis(450);
  });

  setInterval(() => {
    if (!autoFlowOpening?.checked || activeModule !== 'process' || autoFlowBusy || analyzeProcess?.disabled || checkpointReady()) return;
    if (String(processBadge?.textContent || '').trim() === 'Reconhecida') scheduleProcessAnalysis(40);
  }, 2200);

  void loadSettings();
})();
