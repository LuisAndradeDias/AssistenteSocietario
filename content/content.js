(() => {
  const automation = globalThis.JuceesCnaeAutomation;
  const cnaeTools = globalThis.JuceesCnae;
  const privacy = globalThis.JuceesPrivacy;
  const runStateTools = globalThis.JuceesRunState;
  const performanceTools = globalThis.JuceesPerformance;
  const tabProtectionTools = globalThis.JuceesTabProtection;
  const STORAGE_KEY = 'juceesCnaeRunState';
  let controller = { runId: null, paused: false, stopped: false, active: false, state: null };

  function now() {
    return new Date().toISOString();
  }

  async function readState() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return stored[STORAGE_KEY] || null;
  }

  async function writeState(state) {
    state.updatedAt = now();
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    chrome.runtime.sendMessage({ type: 'juceesCnaeProgress', state }).catch(() => {});
    return state;
  }

  async function setBackgroundProtection(active, restoreAutoDiscardable = true) {
    try {
      const response = await chrome.runtime.sendMessage(tabProtectionTools.request(active, restoreAutoDiscardable));
      if (!response?.ok) throw new Error(response?.error || 'Proteção indisponível.');
      return response;
    } catch (error) {
      return { ok: false, protected: false, error: error.message || 'Proteção indisponível.' };
    }
  }

  function showToast(message, kind = 'info') {
    document.getElementById('jucees-cnae-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'jucees-cnae-toast';
    toast.className = `jucees-cnae-${kind}`;
    toast.textContent = message;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  async function waitWhilePaused() {
    while (controller.paused && !controller.stopped) await automation.wait(250);
  }

  async function recoverStoredRun() {
    const stored = await readState();
    const recovered = runStateTools.recoverInterruptedRun(stored);
    if (recovered && recovered !== stored) {
      if (stored?.tabProtection?.active) {
        await setBackgroundProtection(false, stored.tabProtection.previousAutoDiscardable !== false);
      }
      recovered.tabProtection = {
        ...(stored.tabProtection || {}),
        active: false,
        detail: 'Proteção encerrada após a recuperação da página.'
      };
      await writeState(recovered);
    }
    return recovered;
  }

  function terminalStatus(status) {
    return ['added', 'duplicate', 'invalid', 'not_found', 'description_mismatch', 'ambiguous', 'unverified', 'principal_conflict', 'screen_error'].includes(status);
  }

  function normalizeAddressAnswers(value, plan) {
    if (value === undefined || value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error('As respostas de endereço recebidas não possuem formato válido.');
    const allowedCodes = new Set(plan.map((item) => item.code));
    const result = {};
    for (const [rawCode, answer] of Object.entries(value)) {
      const code = cnaeTools.normalizeCode(rawCode);
      if (!code || !allowedCodes.has(code)) throw new Error('As respostas de endereço não correspondem exatamente à fila atual. Reimporte o dossiê.');
      if (![true, false, null].includes(answer)) throw new Error(`Resposta de endereço inválida para ${cnaeTools.formatCode(code)}.`);
      result[code] = answer;
    }
    return result;
  }

  function addressNeedsReview(status) {
    return ['address_conflict', 'address_ambiguous', 'address_screen_error', 'address_unverified'].includes(status);
  }

  async function executeRun(payload) {
    if (controller.active) throw new Error('Já existe uma inclusão de CNAEs em andamento nesta aba.');
    const analysis = automation.analyzeScreen();
    if (!analysis.supported) throw new Error(analysis.detail);

    const plan = cnaeTools.makePlan(payload.codes, payload.principalCode);
    const addressAnswers = normalizeAddressAnswers(payload.addressAnswers, plan);
    const performanceProfile = performanceTools.normalizeProfile(payload.performanceProfile);
    const timings = performanceTools.timingsFor(performanceProfile);
    if (!plan.length) throw new Error('Informe pelo menos um CNAE válido com sete dígitos.');
    const protection = await setBackgroundProtection(true);
    const state = {
      runId: payload.runId,
      status: 'running',
      pagePath: privacy.sanitizePagePath(location.href),
      performanceProfile,
      tabProtection: {
        active: Boolean(protection.ok && protection.protected),
        previousAutoDiscardable: protection.previousAutoDiscardable !== false,
        detail: protection.ok
          ? 'Aba protegida contra descarte enquanto a fila estiver ativa.'
          : 'Proteção contra descarte indisponível; mantenha a janela visível durante esta fila.'
      },
      startedAt: now(),
      currentIndex: 0,
      items: plan.map((item) => {
        const requested = Object.prototype.hasOwnProperty.call(addressAnswers, item.code) ? addressAnswers[item.code] : null;
        return {
          ...item,
          status: 'pending',
          detail: item.expectedDescription ? `IBGE: ${item.expectedDescription}` : 'Sem descrição local; o código será validado de forma reforçada pelo portal.',
          addressRequested: requested,
          addressStatus: requested === null ? 'address_manual' : 'address_pending',
          addressDetail: requested === null
            ? 'Sem resposta automática no dossiê; preencher manualmente.'
            : `Dossiê solicita ${requested ? 'Sim' : 'Não'}.`
        };
      })
    };
    controller = { runId: payload.runId, paused: false, stopped: false, active: true, state };
    try {
      await writeState(state);
      showToast(
        protection.ok
          ? `Iniciando ${plan.length} CNAE(s). A aba está protegida contra descarte; em segundo plano a execução poderá ficar mais lenta.`
          : `Iniciando ${plan.length} CNAE(s). ${state.tabProtection.detail}`,
        protection.ok ? 'info' : 'warning'
      );

      for (let index = 0; index < state.items.length; index += 1) {
        await waitWhilePaused();
        if (controller.stopped) break;
        if (state.status !== 'running') {
          state.status = 'running';
          await writeState(state);
        }

        state.currentIndex = index;
        state.items[index].status = 'searching';
        state.items[index].detail = state.items[index].expectedDescription
          ? `Digitando lentamente e aguardando: ${state.items[index].expectedDescription}`
          : 'Digitando lentamente e aguardando uma única sugestão com o código exato para validação pelo portal.';
        await writeState(state);

        const result = await automation.addCode(
          state.items[index].code,
          state.items[index].role,
          state.items[index].expectedDescription,
          timings
        );
        state.items[index].status = result.status;
        state.items[index].detail = result.detail;
        state.status = runStateTools.activeStatus(controller);
        await writeState(state);

        const failedPrincipal = state.items[index].role === 'principal' && result.status === 'not_found';
        if (failedPrincipal || ['screen_error', 'principal_conflict', 'description_mismatch', 'ambiguous', 'unverified'].includes(result.status)) {
          state.items[index].addressStatus = 'address_skipped';
          state.items[index].addressDetail = 'Resposta não aplicada porque a inclusão do CNAE exige revisão.';
          state.status = 'review_required';
          state.detail = result.detail;
          await writeState(state);
          showToast('Automação pausada para revisão. Nenhuma etapa foi salva ou enviada.', 'warning');
          return;
        }

        if (['added', 'duplicate'].includes(result.status)) {
          state.items[index].addressStatus = state.items[index].addressRequested === null ? 'address_manual' : 'address_applying';
          state.items[index].addressDetail = state.items[index].addressRequested === null
            ? 'Sem resposta automática no dossiê; preencher manualmente.'
            : `Aplicando ${state.items[index].addressRequested ? 'Sim' : 'Não'} somente no cartão deste CNAE.`;
          await writeState(state);
          const addressResult = await automation.applyAddressAnswer(
            state.items[index].code,
            state.items[index].role,
            state.items[index].addressRequested
          );
          state.items[index].addressStatus = addressResult.status;
          state.items[index].addressDetail = addressResult.detail;
          await writeState(state);
          if (addressNeedsReview(addressResult.status)) {
            state.status = 'review_required';
            state.detail = `${cnaeTools.formatCode(state.items[index].code)}: ${addressResult.detail}`;
            await writeState(state);
            showToast('Resposta de endereço exige revisão. A extensão preservou a informação existente e não avançou a etapa.', 'warning');
            return;
          }
        } else {
          state.items[index].addressStatus = 'address_skipped';
          state.items[index].addressDetail = 'Resposta não aplicada porque o CNAE não foi confirmado no cartão.';
          await writeState(state);
        }
        await waitWhilePaused();
        if (controller.stopped) break;
        if (index < state.items.length - 1) await automation.wait(timings.betweenCodesMs);
      }

      const unresolvedItems = state.items.filter((item) => !['added', 'duplicate'].includes(item.status));
      state.status = controller.stopped ? 'stopped' : (unresolvedItems.length ? 'review_required' : 'completed');
      state.currentIndex = Math.min(state.currentIndex, state.items.length - 1);
      const verifiedAnswers = state.items.filter((item) => item.addressStatus === 'address_verified').length;
      const manualAnswers = state.items.filter((item) => item.addressStatus === 'address_manual').length;
      state.detail = controller.stopped
        ? 'Execução interrompida pelo usuário.'
        : unresolvedItems.length
          ? `Fila processada, mas ${unresolvedItems.length} CNAE(s) não foram confirmados no cartão. Revise os itens antes de avançar.`
          : `Fila concluída. ${verifiedAnswers} resposta(s) de endereço confirmada(s)`
            + `${manualAnswers ? ` e ${manualAnswers} pendente(s) de preenchimento manual` : ''}. Revise a tela antes de avançar.`;
      await writeState(state);
      showToast(state.detail, controller.stopped ? 'warning' : 'success');
    } catch (error) {
      state.status = 'error';
      state.detail = error.message || 'Falha inesperada durante a inclusão.';
      const current = state.items[state.currentIndex];
      if (current && !terminalStatus(current.status)) {
        current.status = 'screen_error';
        current.detail = state.detail;
      }
      await writeState(state);
      showToast(`${state.detail} Nenhuma etapa foi salva ou enviada.`, 'error');
    } finally {
      const release = state.tabProtection?.active
        ? await setBackgroundProtection(false, state.tabProtection.previousAutoDiscardable !== false)
        : { ok: true };
      state.tabProtection = {
        ...(state.tabProtection || {}),
        active: false,
        detail: release.ok
          ? 'Proteção contra descarte encerrada com a fila.'
          : 'Não foi possível restaurar automaticamente a política de descarte da aba.'
      };
      await writeState(state).catch(() => {});
      controller.active = false;
      controller.paused = false;
      controller.state = null;
    }
  }

  async function handleMessage(message) {
    if (message.type === 'juceesCnaePing') {
      return { ok: true, title: document.title, path: privacy.sanitizePagePath(location.href) };
    }
    if (message.type === 'juceesCnaeAnalyze') {
      const run = controller.active ? controller.state : await recoverStoredRun();
      return { ok: true, analysis: automation.analyzeScreen(), run };
    }
    if (message.type === 'juceesCnaeStart') {
      if (controller.active) return { ok: false, error: 'Já existe uma fila em andamento nesta aba.' };
      void executeRun(message.payload).catch(async (error) => {
        const failed = {
          runId: message.payload?.runId || crypto.randomUUID(),
          status: 'error',
          detail: error.message,
          items: [],
          startedAt: now()
        };
        await writeState(failed);
        showToast(error.message, 'error');
      });
      return { ok: true, accepted: true };
    }
    if (message.type === 'juceesCnaePause') {
      if (!controller.active) return { ok: false, error: 'Não há fila em andamento nesta aba.' };
      controller.paused = true;
      if (controller.state) {
        controller.state.status = 'paused';
        controller.state.detail = 'Execução pausada pelo usuário. O item atual será concluído com segurança antes da espera.';
        await writeState(controller.state);
      }
      return { ok: true };
    }
    if (message.type === 'juceesCnaeResume') {
      if (!controller.active) return { ok: false, error: 'A página foi recarregada; analise a tela e inicie novamente.' };
      controller.paused = false;
      if (controller.state) {
        controller.state.status = 'running';
        controller.state.detail = 'Execução retomada pelo usuário.';
        await writeState(controller.state);
      }
      return { ok: true };
    }
    if (message.type === 'juceesCnaeStop') {
      controller.stopped = true;
      controller.paused = false;
      return { ok: true };
    }
    return null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    Promise.resolve(handleMessage(message))
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });

})();
