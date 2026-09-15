((root, factory) => {
  const api = factory(root.JuceesCnae);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesDossier = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (cnae) => {
  const SCHEMA_VERSION = '1.0.0';
  const allowedTop = new Set([
    '$schema', 'schemaVersion', 'geradoEm', 'origem', 'processo', 'solicitante', 'empresa', 'enderecoSede',
    'atividades', 'estabelecimento', 'socios', 'administradores', 'capital', 'administracao', 'representantes',
    'responsavelLegal', 'contabilista', 'clausulas', 'fcn', 'consulta', 'registro', 'documentos', 'assinantes',
    'decisoes', 'declaracoes'
  ]);
  const allowedProcess = new Set(['tipo', 'ufRegistro', 'eventos', 'tipoAbertura', 'entidadeRegistro', 'somenteAtualizacaoRfb', 'aguardarConsultaPrevia']);
  const allowedEmpresa = new Set([
    'nomeEmpresarial', 'cnpj', 'naturezaJuridica', 'porte', 'esc', 'autorizacaoUsoNome', 'tipoNome', 'usarCnpjComoNome',
    'complementoNome', 'objetoEmpresa', 'objetoEstabelecimento', 'endereco', 'contato', 'email', 'telefone',
    'enquadramentoEmClausula'
  ]);
  const allowedActivity = new Set(['codigo', 'exerceNoEndereco']);

  function item(code, path, message) { return { code, path, message }; }
  function add(list, code, path, message) { list.push(item(code, path, message)); }
  function digits(value) { return String(value ?? '').replace(/\D/g, ''); }

  function isValidCpf(value) {
    const number = digits(value);
    if (!/^\d{11}$/.test(number) || /^(\d)\1{10}$/.test(number)) return false;
    const calc = (length) => {
      let sum = 0;
      for (let index = 0; index < length; index += 1) sum += Number(number[index]) * (length + 1 - index);
      const rest = (sum * 10) % 11;
      return rest === 10 ? 0 : rest;
    };
    return calc(9) === Number(number[9]) && calc(10) === Number(number[10]);
  }

  function isValidCnpj(value) {
    const number = digits(value);
    if (!/^\d{14}$/.test(number) || /^(\d)\1{13}$/.test(number)) return false;
    const digitAt = (baseLength) => {
      const base = number.slice(0, baseLength);
      let weight = baseLength - 7;
      let sum = 0;
      for (const char of base) {
        sum += Number(char) * weight;
        weight -= 1;
        if (weight < 2) weight = 9;
      }
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    return digitAt(12) === Number(number[12]) && digitAt(13) === Number(number[13]);
  }

  function maskDocument(value) {
    const number = digits(value);
    if (number.length === 14) return `**.***.***/${number.slice(8, 12)}-${number.slice(12)}`;
    if (number.length === 11) return `***.***.${number.slice(6, 9)}-${number.slice(9)}`;
    return '';
  }

  function validateUnknownKeys(value, allowed, path, errors) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const key of Object.keys(value)) if (!allowed.has(key)) add(errors, 'unknown_field', `${path}.${key}`, 'Campo desconhecido; confira se há erro de digitação.');
  }

  function decimalToCents(value) {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('decimal');
    const [whole, fraction = ''] = text.split('.');
    return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)) * (whole.startsWith('-') ? -1n : 1n);
  }

  function validateDossier(doc) {
    const errors = [];
    const warnings = [];
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { valid: false, errors: [item('type', '$', 'O dossiê deve ser um objeto JSON.')], warnings };

    for (const key of Object.keys(doc)) if (!allowedTop.has(key)) add(errors, 'unknown_field', `$.${key}`, 'Campo raiz desconhecido; confira se há erro de digitação.');
    if (doc.schemaVersion !== SCHEMA_VERSION) add(errors, 'unsupported_version', '$.schemaVersion', `A versão deve ser exatamente ${SCHEMA_VERSION}.`);
    if (!['constituicao', 'alteracao'].includes(doc.processo?.tipo)) add(errors, 'process_type', '$.processo.tipo', 'Use constituicao ou alteracao.');
    if (doc.processo?.ufRegistro !== undefined && doc.processo?.ufRegistro !== 'ES') add(errors, 'uf', '$.processo.ufRegistro', 'A UF de registro deve ser ES.');
    validateUnknownKeys(doc.processo, allowedProcess, '$.processo', errors);
    validateUnknownKeys(doc.empresa, allowedEmpresa, '$.empresa', errors);

    if (!String(doc.empresa?.nomeEmpresarial || '').trim()) add(warnings, 'manual_company_name', '$.empresa.nomeEmpresarial', 'Nome empresarial não informado; poderá ser preenchido manualmente.');
    if (doc.processo?.tipo === 'alteracao' && !isValidCnpj(doc.empresa?.cnpj)) add(errors, 'cnpj', '$.empresa.cnpj', 'CNPJ válido é obrigatório na alteração.');
    if (doc.processo?.tipo === 'constituicao' && doc.empresa?.cnpj) add(warnings, 'unexpected_cnpj', '$.empresa.cnpj', 'CNPJ informado em constituição; confira se é intencional.');

    const principal = doc.atividades?.principal || null;
    const secondaries = Array.isArray(doc.atividades?.secundarias) ? doc.atividades.secundarias : [];
    const activities = [principal, ...secondaries].filter(Boolean);
    if (!principal) add(warnings, 'manual_principal_cnae', '$.atividades.principal', 'CNAE principal não informado; poderá ser digitado manualmente.');
    const seen = new Set();
    let manualAddressAnswers = 0;
    activities.forEach((activity, index) => {
      const path = index === 0 && principal ? '$.atividades.principal' : `$.atividades.secundarias[${principal ? index - 1 : index}]`;
      if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
        add(errors, 'type', path, 'Atividade deve ser objeto.');
        return;
      }
      validateUnknownKeys(activity, allowedActivity, path, errors);
      const code = cnae?.normalizeCode(activity.codigo);
      if (!code) add(errors, 'cnae_format', `${path}.codigo`, 'CNAE deve conter sete dígitos.');
      else if (seen.has(code)) add(errors, 'duplicate', `${path}.codigo`, 'CNAE duplicado.');
      else {
        seen.add(code);
        if (!cnae?.officialDescription(code)) add(warnings, 'cnae_unverified_local', `${path}.codigo`, 'CNAE ausente da base local recuperada; será validado pelo código exato no portal, sem bloqueio automático.');
      }
      if (![true, false, null].includes(activity.exerceNoEndereco)) add(errors, 'boolean_or_null', `${path}.exerceNoEndereco`, 'Use true, false ou null.');
      if (activity.exerceNoEndereco === null) manualAddressAnswers += 1;
    });
    if (manualAddressAnswers) add(warnings, 'manual_address_answers', '$.atividades', `${manualAddressAnswers} resposta(s) de exercício no endereço permanecem manuais.`);

    const socios = Array.isArray(doc.socios) ? doc.socios : [];
    for (let index = 0; index < socios.length; index += 1) {
      const partner = socios[index] || {};
      if (partner.cpfCnpj) {
        const number = digits(partner.cpfCnpj);
        if (number.length === 11 && !isValidCpf(number)) add(errors, 'cpf', `$.socios[${index}].cpfCnpj`, 'CPF inválido.');
        if (number.length === 14 && !isValidCnpj(number)) add(errors, 'cnpj', `$.socios[${index}].cpfCnpj`, 'CNPJ inválido.');
      }
    }
    const ids = new Set(socios.map((partner) => partner?.id).filter(Boolean));
    const admins = Array.isArray(doc.administracao?.administradores) ? doc.administracao.administradores : [];
    for (const id of admins) if (!ids.has(id)) add(errors, 'unknown_partner', '$.administracao.administradores', `Referência de administrador desconhecida: ${id}.`);

    try {
      if (doc.capital && (doc.capital.valorTotal !== undefined || doc.capital.totalQuotas !== undefined || doc.capital.valorQuota !== undefined)) {
        const total = BigInt(String(doc.capital.totalQuotas ?? '0'));
        const unitCents = decimalToCents(doc.capital.valorQuota ?? '0');
        const totalCents = decimalToCents(doc.capital.valorTotal ?? '0');
        if (total * unitCents !== totalCents) add(errors, 'capital_math', '$.capital', 'valorQuota × totalQuotas deve ser igual a valorTotal.');
        if (socios.length && socios.every((partner) => partner?.quotas !== undefined)) {
          const partnerTotal = socios.reduce((sum, partner) => sum + BigInt(String(partner.quotas || '0')), 0n);
          if (partnerTotal !== total) add(errors, 'quota_sum', '$.socios', 'A soma das quotas dos sócios deve coincidir com totalQuotas.');
        }
      }
    } catch {
      add(errors, 'capital_format', '$.capital', 'Valores de capital inválidos.');
    }

    if (doc.declaracoes?.revisaoHumanaObrigatoria !== true) add(errors, 'safety', '$.declaracoes.revisaoHumanaObrigatoria', 'Deve ser true para preservar a revisão humana obrigatória.');
    return { valid: errors.length === 0, errors, warnings };
  }

  function summarizeDossier(doc) {
    const principal = cnae?.normalizeCode(doc?.atividades?.principal?.codigo) || '';
    const secondaryCount = Array.isArray(doc?.atividades?.secundarias) ? doc.atividades.secundarias.length : 0;
    return {
      processType: doc?.processo?.tipo === 'alteracao' ? 'Alteração contratual' : 'Constituição',
      companyName: doc?.empresa?.nomeEmpresarial || 'Não informado',
      registration: doc?.empresa?.cnpj ? maskDocument(doc.empresa.cnpj) : '',
      activityCount: principal ? 1 + secondaryCount : secondaryCount,
      principalCode: cnae?.formatCode(principal) || 'não informado',
      partnerCount: Array.isArray(doc?.socios) ? doc.socios.length : 0,
      capital: doc?.capital?.valorTotal ? `R$ ${Number(String(doc.capital.valorTotal).replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado',
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
    for (const activity of items) {
      const code = cnae?.normalizeCode(activity?.codigo);
      if (!code || ![true, false, null].includes(activity?.exerceNoEndereco)) continue;
      addressAnswers[code] = activity.exerceNoEndereco;
    }
    return { codes, principalCode, addressAnswers, text: codes.map((code) => cnae.formatCode(code)).join('\n') };
  }

  return { SCHEMA_VERSION, isValidCpf, isValidCnpj, maskDocument, validateDossier, summarizeDossier, extractCnaeDraft };
});
