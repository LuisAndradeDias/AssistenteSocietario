((root, factory) => {
  const api = factory(root.JuceesCnae);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesDossier = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (cnae) => {
  const allowedTop = new Set(['$schema','schemaVersion','geradoEm','origem','processo','empresa','enderecoSede','atividades','socios','capital','administracao','representantes','contabilista','declaracoes']);
  function push(errors, path, message) { errors.push({ path, message }); }
  function validateDossier(doc) {
    const errors = []; const warnings = [];
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { valid:false, errors:[{path:'$',message:'O dossiê deve ser um objeto JSON.'}], warnings };
    for (const key of Object.keys(doc)) if (!allowedTop.has(key)) push(errors, `$.${key}`, 'Campo raiz desconhecido.');
    if (doc.schemaVersion !== '1.0.0') push(errors, '$.schemaVersion', 'A versão deve ser exatamente 1.0.0.');
    if (!['constituicao','alteracao'].includes(doc.processo?.tipo)) push(errors, '$.processo.tipo', 'Use constituicao ou alteracao.');
    if (doc.processo?.ufRegistro !== 'ES') push(errors, '$.processo.ufRegistro', 'A UF de registro deve ser ES.');
    if (!doc.empresa?.nomeEmpresarial) push(errors, '$.empresa.nomeEmpresarial', 'Informe o nome empresarial.');
    if (doc.processo?.tipo === 'alteracao' && !/^\d{14}$/.test(String(doc.empresa?.cnpj || ''))) push(errors, '$.empresa.cnpj', 'CNPJ é obrigatório na alteração.');
    const principal = doc.atividades?.principal;
    if (!principal) push(errors, '$.atividades.principal', 'Informe o CNAE principal.');
    const activities = principal ? [principal, ...(Array.isArray(doc.atividades?.secundarias) ? doc.atividades.secundarias : [])] : [];
    const seen = new Set();
    activities.forEach((item, index) => {
      const path = index ? `$.atividades.secundarias[${index-1}]` : '$.atividades.principal';
      const code = cnae?.normalizeCode(item?.codigo);
      if (!code) push(errors, `${path}.codigo`, 'CNAE deve conter sete dígitos.');
      else if (!cnae.officialDescription(code)) push(errors, `${path}.codigo`, 'CNAE ausente da base local recuperada; bloqueado por segurança.');
      else if (seen.has(code)) push(errors, `${path}.codigo`, 'CNAE duplicado.');
      else seen.add(code);
      if (![true,false,null].includes(item?.exerceNoEndereco)) push(errors, `${path}.exerceNoEndereco`, 'Use true, false ou null.');
    });
    if (doc.declaracoes?.revisaoHumanaObrigatoria !== true) push(errors, '$.declaracoes.revisaoHumanaObrigatoria', 'Deve ser true.');
    const socios = Array.isArray(doc.socios) ? doc.socios : [];
    const ids = new Set(socios.map((s) => s?.id).filter(Boolean));
    const admins = doc.administracao?.administradores || [];
    for (const id of admins) if (!ids.has(id)) push(errors, '$.administracao.administradores', `Referência desconhecida: ${id}.`);
    try {
      if (doc.capital) {
        const total = BigInt(String(doc.capital.totalQuotas || '0'));
        const unitCents = BigInt(Math.round(Number(doc.capital.valorQuota || '0') * 100));
        const totalCents = BigInt(Math.round(Number(doc.capital.valorTotal || '0') * 100));
        if (total * unitCents !== totalCents) push(errors, '$.capital', 'valorQuota × totalQuotas deve ser igual a valorTotal.');
        const partnerTotal = socios.reduce((acc,s) => acc + BigInt(String(s.quotas || '0')), 0n);
        if (partnerTotal !== total) push(errors, '$.socios', 'A soma das quotas dos sócios deve coincidir com totalQuotas.');
      }
    } catch { push(errors, '$.capital', 'Valores de capital inválidos.'); }
    if (doc.processo?.tipo === 'constituicao' && doc.empresa?.cnpj) warnings.push({path:'$.empresa.cnpj',message:'CNPJ informado em constituição; confira se é intencional.'});
    return { valid: errors.length === 0, errors, warnings };
  }
  function summarizeDossier(doc) {
    const principal = cnae?.normalizeCode(doc?.atividades?.principal?.codigo) || '';
    const secondaryCount = Array.isArray(doc?.atividades?.secundarias) ? doc.atividades.secundarias.length : 0;
    return {
      processType: doc?.processo?.tipo === 'alteracao' ? 'Alteração contratual' : 'Constituição',
      companyName: doc?.empresa?.nomeEmpresarial || 'Não informado',
      registration: doc?.empresa?.cnpj ? String(doc.empresa.cnpj).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.***.***/$4-**') : '',
      activityCount: principal ? 1 + secondaryCount : secondaryCount,
      principalCode: cnae?.formatCode(principal) || 'não informado',
      partnerCount: Array.isArray(doc?.socios) ? doc.socios.length : 0,
      capital: doc?.capital?.valorTotal ? `R$ ${Number(doc.capital.valorTotal).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'Não informado',
      eventCount: Array.isArray(doc?.processo?.eventos) ? doc.processo.eventos.length : 0
    };
  }
  function extractCnaeDraft(doc) {
    const principalItem = doc?.atividades?.principal || null;
    const secondaryItems = Array.isArray(doc?.atividades?.secundarias) ? doc.atividades.secundarias : [];
    const items = [principalItem, ...secondaryItems].filter(Boolean);
    const principalCode = cnae?.normalizeCode(principalItem?.codigo) || '';
    const codes = items.map((item) => cnae?.normalizeCode(item?.codigo)).filter(Boolean);
    const addressAnswers = {};
    for (const item of items) {
      const code = cnae?.normalizeCode(item?.codigo);
      if (!code || ![true, false, null].includes(item?.exerceNoEndereco)) continue;
      addressAnswers[code] = item.exerceNoEndereco;
    }
    return { codes, principalCode, addressAnswers, text: codes.map((code) => cnae.formatCode(code)).join('\n') };
  }
  return { validateDossier, summarizeDossier, extractCnaeDraft };
});
