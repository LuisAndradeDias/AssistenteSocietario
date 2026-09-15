((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesProcessBaseline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const MODES = Object.freeze({
    AUTO_SAFE: 'auto_safe',
    ASSISTED: 'assisted',
    CONFERENCE: 'conference',
    MANUAL: 'manual',
    BLOCKED: 'blocked'
  });

  const STATUS = Object.freeze({
    DOCUMENTAL: 'documental',
    MAPPED: 'mapped',
    CANDIDATE: 'candidate',
    HOMOLOGATED: 'homologated',
    FUTURE: 'future'
  });

  function field(key, label, kind, mode, dossierPaths = [], aliases = [], options = null) {
    return Object.freeze({ key, label, kind, mode, dossierPaths: Object.freeze(dossierPaths), aliases: Object.freeze([label, ...aliases]), options });
  }

  function stage(id, phase, title, mode, status, aliases, fields = [], notes = '', options = {}) {
    return Object.freeze({
      id, phase, title, mode, status,
      aliases: Object.freeze([title, ...aliases]),
      fields: Object.freeze(fields),
      notes,
      specialized: options.specialized || '',
      applyEnabled: options.applyEnabled !== false
    });
  }

  const yesNo = Object.freeze([
    Object.freeze({ value: true, aliases: Object.freeze(['sim', 'yes', 'true', '1']) }),
    Object.freeze({ value: false, aliases: Object.freeze(['nao', 'não', 'no', 'false', '0']) })
  ]);

  const STAGES = Object.freeze([
    stage('AB-01', 'abertura', 'Eventos Integrados / Abertura de Empresa', MODES.MANUAL, STATUS.DOCUMENTAL,
      ['Abertura de Empresa', 'Eventos Integrados'], [], 'A navegação inicial permanece manual.', { applyEnabled: false }),
    stage('AB-02', 'abertura', 'Tipo de abertura', MODES.MANUAL, STATUS.DOCUMENTAL,
      ['Abertura de Matriz', 'Tipo de Abertura'], [
        field('processo.tipoAbertura', 'Tipo de abertura', 'choice', MODES.ASSISTED, ['processo.tipoAbertura'], ['Abertura de Matriz'])
      ], 'Mudança de ramo do processo exige revisão humana.'),
    stage('AB-03', 'abertura', 'Identificação da Matriz', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Matriz', 'Dados da Matriz', 'Identificação da Matriz'], [
        field('processo.entidadeRegistro', 'Entidade de registro', 'choice', MODES.ASSISTED, ['processo.entidadeRegistro'], ['Entidade Registro']),
        field('processo.somenteAtualizacaoRfb', 'Processo somente para atualização de dados cadastrais na RFB?', 'boolean', MODES.ASSISTED, ['processo.somenteAtualizacaoRfb'], ['Somente atualização RFB'], yesNo),
        field('empresa.municipioMatriz', 'Município da matriz', 'choice', MODES.AUTO_SAFE, ['empresa.endereco.municipio', 'enderecoSede.municipio'], ['Município']),
        field('empresa.naturezaJuridica', 'Natureza jurídica', 'choice', MODES.AUTO_SAFE, ['empresa.naturezaJuridica'], ['Natureza Jurídica'])
      ]),
    stage('AB-04', 'abertura', 'Consulta Prévia / Resolução 61', MODES.MANUAL, STATUS.DOCUMENTAL,
      ['Aguardar Consulta Prévia', 'Resolução 61', 'Prosseguir sem aguardar'], [
        field('processo.aguardarConsultaPrevia', 'Aguardar análise da Consulta Prévia?', 'boolean', MODES.MANUAL, ['processo.aguardarConsultaPrevia'], [], yesNo)
      ], 'A decisão possui consequência operacional e não é aplicada automaticamente.', { applyEnabled: false }),
    stage('AB-05', 'abertura', 'Aviso Balcão Único / Ciente', MODES.MANUAL, STATUS.DOCUMENTAL,
      ['Balcão Único', 'CIENTE'], [], 'Declaração de ciência permanece manual.', { applyEnabled: false }),

    stage('VP-01', 'viabilidade', 'Dados do Solicitante', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Solicitante', 'Dados do Solicitante'], [
        field('solicitante.cpf', 'CPF', 'text', MODES.AUTO_SAFE, ['solicitante.cpf'], ['CPF do solicitante']),
        field('solicitante.nome', 'Nome', 'text', MODES.CONFERENCE, ['solicitante.nome'], ['Nome do solicitante']),
        field('solicitante.eContador', 'Contador?', 'boolean', MODES.ASSISTED, ['solicitante.eContador'], ['É contador?', 'Contador'], yesNo),
        field('solicitante.ddd', 'DDD', 'text', MODES.AUTO_SAFE, ['solicitante.telefone.ddd']),
        field('solicitante.telefone', 'Telefone', 'text', MODES.AUTO_SAFE, ['solicitante.telefone.numero', 'solicitante.telefone']),
        field('solicitante.ramal', 'Ramal', 'text', MODES.AUTO_SAFE, ['solicitante.telefone.ramal']),
        field('solicitante.email', 'E-mail', 'email', MODES.AUTO_SAFE, ['solicitante.email'], ['Email'])
      ]),
    stage('VP-02', 'viabilidade', 'Dados iniciais da empresa / enquadramento', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Enquadramento', 'Dados da Empresa'], [
        field('empresa.esc', 'É Empresa Simples de Crédito (ESC)?', 'boolean', MODES.ASSISTED, ['empresa.esc'], ['Empresa Simples de Crédito'], yesNo),
        field('empresa.porte', 'Enquadramento', 'choice', MODES.ASSISTED, ['empresa.porte'], ['Porte']),
        field('empresa.enquadramentoEmClausula', 'Enquadramento será informado em cláusula contratual?', 'boolean', MODES.ASSISTED, ['decisoes.enquadramentoEmClausula', 'empresa.enquadramentoEmClausula'], [], yesNo),
        field('empresa.autorizacaoUsoNome', 'Possui autorização para utilizar nome empresarial?', 'boolean', MODES.ASSISTED, ['empresa.autorizacaoUsoNome'], [], yesNo),
        field('capital.origemCisao', 'Capital social é resultado de empresa cindida?', 'boolean', MODES.ASSISTED, ['capital.origemCisao'], [], yesNo)
      ]),
    stage('VP-03', 'viabilidade', 'Quadro Societário inicial da Viabilidade', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Quadro Societário', 'QSA', 'Sócios'], [
        field('socios', 'Sócios', 'collection', MODES.ASSISTED, ['socios'], ['Quadro de Sócios'])
      ], 'Coleções são analisadas por identificador; inclusão automática aguarda DOM real.', { applyEnabled: false }),
    stage('VP-04', 'viabilidade', 'Nome empresarial', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Nome Empresarial', 'Razão Social', 'Firma ou Denominação'], [
        field('empresa.usarCnpjComoNome', 'Utilizar CNPJ como nome empresarial?', 'boolean', MODES.ASSISTED, ['empresa.usarCnpjComoNome'], [], yesNo),
        field('empresa.tipoNome', 'Firma ou Denominação', 'choice', MODES.ASSISTED, ['empresa.tipoNome'], ['Tipo de nome empresarial']),
        field('empresa.nomeEmpresarial', 'Razão Social', 'text', MODES.ASSISTED, ['empresa.nomeEmpresarial'], ['Nome empresarial']),
        field('empresa.complementoNome', 'Complemento do nome', 'text', MODES.ASSISTED, ['empresa.complementoNome'])
      ], 'Verificar disponibilidade e declarações jurídicas permanecem ações manuais.'),
    stage('VP-05', 'viabilidade', 'Endereço / Natureza do Imóvel', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Natureza do imóvel', 'Endereço do Estabelecimento', 'Endereço'], [
        field('endereco.naturezaImovel', 'Natureza do imóvel', 'choice', MODES.ASSISTED, ['empresa.endereco.naturezaImovel', 'enderecoSede.naturezaImovel']),
        field('endereco.inscricaoImobiliaria', 'Inscrição imobiliária', 'text', MODES.AUTO_SAFE, ['empresa.endereco.inscricaoImobiliaria', 'enderecoSede.inscricaoImobiliaria'], ['Indicação fiscal']),
        field('endereco.inscricaoRural', 'Inscrição rural', 'text', MODES.AUTO_SAFE, ['empresa.endereco.inscricaoRural', 'enderecoSede.inscricaoRural']),
        field('endereco.cep', 'CEP', 'text', MODES.AUTO_SAFE, ['empresa.endereco.cep', 'enderecoSede.cep']),
        field('endereco.logradouro', 'Logradouro', 'text', MODES.CONFERENCE, ['empresa.endereco.logradouro', 'enderecoSede.logradouro']),
        field('endereco.numero', 'Número', 'text', MODES.AUTO_SAFE, ['empresa.endereco.numero', 'enderecoSede.numero']),
        field('endereco.complemento', 'Complemento', 'text', MODES.AUTO_SAFE, ['empresa.endereco.complemento', 'enderecoSede.complemento']),
        field('endereco.bairro', 'Bairro', 'text', MODES.CONFERENCE, ['empresa.endereco.bairro', 'enderecoSede.bairro']),
        field('endereco.municipio', 'Município', 'text', MODES.CONFERENCE, ['empresa.endereco.municipio', 'enderecoSede.municipio']),
        field('endereco.uf', 'UF', 'choice', MODES.CONFERENCE, ['empresa.endereco.uf', 'enderecoSede.uf'])
      ]),
    stage('VP-06', 'viabilidade', 'Dados físicos do estabelecimento / autorizações / mapa', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Área do estabelecimento', 'Coordenadas Geográficas', 'Mapa'], [
        field('estabelecimento.area', 'Área do estabelecimento', 'number', MODES.AUTO_SAFE, ['estabelecimento.area', 'enderecoSede.areaM2'], ['Área (m²)', 'Área']),
        field('estabelecimento.autorizacoes', 'Autorização ou permissão', 'collection', MODES.ASSISTED, ['estabelecimento.autorizacoes'], ['Autorizações']),
        field('estabelecimento.coordenadas', 'Coordenadas geográficas', 'collection', MODES.MANUAL, ['estabelecimento.coordenadas'], ['Latitude', 'Longitude'])
      ], 'Posicionamento em mapa permanece manual.'),
    stage('VP-07', 'viabilidade', 'Objetos + Atividades', MODES.ASSISTED, STATUS.CANDIDATE,
      ['Objeto da Empresa', 'Atividade Principal', 'Atividades Secundárias'], [
        field('empresa.objetoEmpresa', 'Objeto da Empresa', 'textarea', MODES.ASSISTED, ['empresa.objetoEmpresa']),
        field('empresa.objetoEstabelecimento', 'Objeto do Estabelecimento', 'textarea', MODES.ASSISTED, ['empresa.objetoEstabelecimento'])
      ], 'CNAEs e exerceNoEndereco permanecem no módulo homologado.', { specialized: 'activities' }),
    stage('VP-08', 'viabilidade', 'Tipo de Unidade', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Tipo de Unidade', 'Unidade Produtiva', 'Escritório Administrativo'], [
        field('estabelecimento.tipoUnidade', 'Tipo de Unidade', 'multi_choice', MODES.ASSISTED, ['estabelecimento.tipoUnidade', 'estabelecimento.tiposUnidade'])
      ]),
    stage('VP-09', 'viabilidade', 'Forma de Atuação', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Forma de Atuação', 'Formas de Atuação'], [
        field('estabelecimento.formasAtuacao', 'Forma de Atuação', 'multi_choice', MODES.ASSISTED, ['estabelecimento.formasAtuacao'])
      ]),
    stage('VP-10', 'viabilidade', 'Dados / Perguntas Complementares', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Perguntas Complementares', 'Dados Complementares'], [
        field('estabelecimento.perguntasComplementares', 'Perguntas complementares', 'dynamic_questions', MODES.ASSISTED, ['estabelecimento.perguntasComplementares'])
      ], 'Perguntas são descobertas dinamicamente pelo texto e estrutura; perguntas desconhecidas nunca recebem resposta automática.', { specialized: 'questions' }),
    stage('VP-11', 'viabilidade', 'Revisão da Consulta Prévia', MODES.BLOCKED, STATUS.CANDIDATE,
      ['Revisão', 'Salvar Consulta', 'Consulta Prévia'], [], 'Salvar/Avançar permanece bloqueado; a extensão apenas gera checkpoint.', { specialized: 'checkpoint', applyEnabled: false }),
    stage('VP-12', 'viabilidade', 'Situação da Consulta Prévia', MODES.CONFERENCE, STATUS.DOCUMENTAL,
      ['Situação da Consulta', 'Protocolo da Consulta', 'Consulta Prévia'], [
        field('consulta.status', 'Situação', 'status', MODES.CONFERENCE, ['consulta.status'], ['Status']),
        field('consulta.protocolo', 'Protocolo', 'status', MODES.CONFERENCE, ['consulta.protocolo'])
      ], '', { applyEnabled: false }),

    stage('FCN-00', 'fcn', 'Declaração de Responsabilidade do Contador', MODES.MANUAL, STATUS.DOCUMENTAL,
      ['Declaração de Responsabilidade', 'Contador'], [], 'Declaração profissional permanece manual.', { applyEnabled: false }),
    stage('FCN-01', 'fcn', 'Atos/Eventos + Dados da Empresa + Contato', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Atos/Eventos', 'Dados da Empresa', 'Contato'], [
        field('fcn.atosEventos', 'Atos/Eventos', 'collection', MODES.ASSISTED, ['fcn.atosEventos', 'processo.eventos']),
        field('empresa.nomeEmpresarial', 'Nome empresarial', 'text', MODES.AUTO_SAFE, ['empresa.nomeEmpresarial']),
        field('empresa.email', 'E-mail', 'email', MODES.AUTO_SAFE, ['empresa.contato.email', 'empresa.email']),
        field('empresa.telefone', 'Telefone', 'text', MODES.AUTO_SAFE, ['empresa.contato.telefone', 'empresa.telefone'])
      ]),
    stage('FCN-02', 'fcn', 'Lista e Dados dos Sócios', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Dados dos Sócios', 'Sócios', 'Qualificação do Sócio'], [
        field('socios', 'Sócios', 'collection', MODES.ASSISTED, ['socios'])
      ], 'Associação deve ocorrer por CPF/CNPJ; salvar qualificações permanece manual.', { applyEnabled: false }),
    stage('FCN-03', 'fcn', 'Administradores', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Administradores', 'Administrador'], [
        field('administradores', 'Administradores', 'collection', MODES.ASSISTED, ['administradores', 'administracao.administradores'])
      ], '', { applyEnabled: false }),
    stage('FCN-04', 'fcn', 'Representantes', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Representantes', 'Representante'], [
        field('representantes', 'Representantes', 'collection', MODES.ASSISTED, ['representantes'])
      ], '', { applyEnabled: false }),
    stage('FCN-05', 'fcn', 'Responsável Legal + Contabilista', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Responsável Legal', 'Tipo de Contabilista', 'Contabilista'], [
        field('responsavelLegal.cpf', 'CPF', 'text', MODES.ASSISTED, ['responsavelLegal.cpf']),
        field('responsavelLegal.nome', 'Nome', 'text', MODES.ASSISTED, ['responsavelLegal.nome']),
        field('responsavelLegal.telefone', 'Telefone', 'text', MODES.ASSISTED, ['responsavelLegal.telefone']),
        field('responsavelLegal.email', 'E-mail', 'email', MODES.ASSISTED, ['responsavelLegal.email']),
        field('contabilista.tipo', 'Tipo de Contabilista', 'choice', MODES.ASSISTED, ['contabilista.tipo'])
      ]),
    stage('FCN-06', 'fcn', 'Cláusulas Contratuais', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Cláusulas Contratuais', 'Regência supletiva', 'Exclusão extrajudicial'], [
        field('clausulas.regenciaSupletivaSA', 'Regência supletiva pelas leis da S/A?', 'boolean', MODES.ASSISTED, ['clausulas.regenciaSupletivaSA'], [], yesNo),
        field('clausulas.exclusaoExtrajudicial', 'Exclusão extrajudicial de sócio minoritário por justa causa?', 'boolean', MODES.ASSISTED, ['clausulas.exclusaoExtrajudicial'], [], yesNo),
        field('clausulas.reuniaoAssembleia', 'Com reunião de Assembleia?', 'boolean', MODES.ASSISTED, ['clausulas.reuniaoAssembleia'], [], yesNo),
        field('clausulas.foroNaMatriz', 'Foro será no endereço da matriz?', 'boolean', MODES.ASSISTED, ['clausulas.foroNaMatriz'], [], yesNo),
        field('clausulas.terminoExercicioSocial', 'Data do término do exercício social', 'date', MODES.ASSISTED, ['clausulas.terminoExercicioSocial']),
        field('clausulas.formaAdministracao', 'Como será exercida a administração?', 'choice', MODES.ASSISTED, ['clausulas.formaAdministracao'], ['Forma de administração'])
      ], 'Todos os valores são decisões societárias explícitas.'),
    stage('FCN-07', 'fcn', 'Integralização do Capital', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Integralização do Capital', 'Capital Social', 'Integralizações'], [
        field('capital.valorTotal', 'Capital Social', 'number', MODES.CONFERENCE, ['capital.valorTotal'], ['Valor total do capital']),
        field('capital.integralizacoes', 'Integralizações', 'collection', MODES.ASSISTED, ['capital.integralizacoes', 'capital.integralizacao'])
      ], 'Salvar permanece manual; o motor de integridade apenas confere.', { applyEnabled: false }),
    stage('FCN-08', 'fcn', 'Conselho Fiscal', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Conselho Fiscal'], [
        field('capital.conselhoFiscal', 'Sociedade terá conselho fiscal?', 'boolean', MODES.ASSISTED, ['capital.conselhoFiscal'], [], yesNo)
      ]),
    stage('FCN-09', 'fcn', 'Checkpoint pré-transmissão', MODES.CONFERENCE, STATUS.CANDIDATE,
      ['Conferência FCN', 'Resumo FCN'], [], 'Gera conferência; nenhuma transmissão é executada.', { specialized: 'checkpoint', applyEnabled: false }),
    stage('FCN-10', 'fcn', 'Transmissão FCN', MODES.BLOCKED, STATUS.DOCUMENTAL,
      ['Transmitir FCN', 'Confirmar Transmissão'], [], 'Transmissão sempre manual e bloqueada para automação.', { applyEnabled: false }),

    stage('REG-01', 'registro', 'Gerar Taxa', MODES.MANUAL, STATUS.DOCUMENTAL,
      ['Gerar Taxa', 'DAE', 'Taxa'], [], 'Emissão financeira permanece manual.', { applyEnabled: false }),
    stage('REG-02', 'registro', 'Contrato Social / Tipo de contrato', MODES.MANUAL, STATUS.DOCUMENTAL,
      ['Contrato Eletrônico', 'Tipo de contrato', 'Contrato próprio'], [
        field('registro.tipoContrato', 'Tipo de contrato', 'choice', MODES.MANUAL, ['registro.tipoContrato'])
      ], 'Escolha do instrumento permanece manual.', { applyEnabled: false }),
    stage('REG-03', 'registro', 'Quadro de Assinantes', MODES.ASSISTED, STATUS.DOCUMENTAL,
      ['Quadro de Assinantes', 'Assinantes'], [
        field('assinantes', 'Assinantes', 'collection', MODES.CONFERENCE, ['assinantes'])
      ], 'Inclusão automática aguarda mapeamento real.', { applyEnabled: false }),
    stage('REG-04', 'registro', 'Documentos levados a registro', MODES.CONFERENCE, STATUS.DOCUMENTAL,
      ['Documentos levados a registro', 'Outros documentos', 'Documentos'], [
        field('documentos', 'Documentos', 'collection', MODES.CONFERENCE, ['documentos'])
      ], 'Upload/Enviar/Avançar permanecem manuais.', { applyEnabled: false }),
    stage('REG-05', 'registro', 'Assinaturas digitais', MODES.BLOCKED, STATUS.DOCUMENTAL,
      ['Assinaturas', 'GOV.BR', 'Certificado Digital'], [], 'Credenciais, OTP e assinatura nunca são automatizados.', { applyEnabled: false }),
    stage('REG-06', 'registro', 'Protocolo', MODES.BLOCKED, STATUS.DOCUMENTAL,
      ['Protocolar', 'Protocolo'], [], 'Protocolo permanece manual.', { applyEnabled: false }),

    stage('POS-01', 'pos_registro', 'Processo em análise', MODES.CONFERENCE, STATUS.DOCUMENTAL,
      ['Processo em análise', 'Em análise'], [field('registro.status', 'Situação', 'status', MODES.CONFERENCE, ['registro.status'], ['Status'])], '', { applyEnabled: false }),
    stage('POS-02', 'pos_registro', 'Exigência', MODES.CONFERENCE, STATUS.DOCUMENTAL,
      ['Motivos de Exigência', 'Exigência'], [field('registro.exigencias', 'Motivos de Exigência', 'status', MODES.CONFERENCE, ['registro.exigencias'])], '', { applyEnabled: false }),
    stage('POS-03', 'pos_registro', 'Deferido / Arquivado', MODES.CONFERENCE, STATUS.DOCUMENTAL,
      ['Deferido', 'Arquivado', 'Documento chancelado'], [field('registro.status', 'Situação', 'status', MODES.CONFERENCE, ['registro.status'], ['Status'])], '', { applyEnabled: false }),
    stage('POS-04', 'pos_registro', 'Inscrições, Licenças e Alvarás', MODES.CONFERENCE, STATUS.FUTURE,
      ['Licenças', 'Alvarás', 'Inscrição Municipal', 'Inscrição Estadual'], [], 'Primeiro escopo é acompanhamento e conferência.', { applyEnabled: false })
  ]);

  const BY_ID = Object.freeze(Object.fromEntries(STAGES.map((item) => [item.id, item])));
  function getStage(id) { return BY_ID[String(id || '')] || null; }
  function stagesByPhase(phase) { return STAGES.filter((item) => item.phase === phase); }

  return { MODES, STATUS, STAGES, getStage, stagesByPhase };
});
