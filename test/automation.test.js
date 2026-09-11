const test = require('node:test');
const assert = require('node:assert/strict');

require('../data/cnae-subclasses-2.3.js');
require('../lib/cnae.js');
const automation = require('../content/cnae-automation.js');

test('normaliza caixa, acento e espaços', () => {
  assert.equal(automation.normalizeText('  Atividade  Secundária  '), 'atividade secundaria');
});

test('normaliza pontuação editorial de descrição', () => {
  assert.equal(automation.normalizeDescription('Comércio - varejista / especializado'), 'comercio varejista especializado');
});

test('considera descrições equivalentes sem acento e hífen editorial', () => {
  assert.equal(automation.descriptionsEquivalent('COMÉRCIO VAREJISTA', 'Comercio - varejista'), true);
});

test('rejeita descrições materialmente diferentes', () => {
  assert.equal(automation.descriptionsEquivalent('DESENVOLVIMENTO SOB ENCOMENDA', 'LICENCIAMENTO DE SOFTWARE'), false);
});

test('extrai descrição apresentada após o código', () => {
  assert.equal(
    automation.suggestionDescription('6201-5/01 - Desenvolvimento de programas', '6201501'),
    'Desenvolvimento de programas'
  );
});

test('entre várias opções aceita somente código completo e descrição oficial', () => {
  const expected = 'Comércio varejista de livros';
  const candidates = [
    '4761-0/01 - Comércio varejista de livros',
    '4761-0/02 - Comércio varejista de jornais e revistas',
    '4761-0/03 - Comércio varejista de artigos de papelaria'
  ].map((text) => automation.suggestionEvidence(text, '4761001', expected));
  const decision = automation.exactSuggestionDecision(candidates);
  assert.equal(decision.status, 'exact');
  assert.equal(decision.choice.presentedDescription, expected);
});

test('não aceita contêiner que agrupe mais de um código CNAE', () => {
  const evidence = automation.suggestionEvidence(
    '4761-0/01 - Comércio varejista de livros 4761-0/02 - Comércio varejista de jornais e revistas',
    '4761001',
    'Comércio varejista de livros'
  );
  assert.equal(evidence.singleExactCode, false);
  assert.deepEqual(evidence.codes, ['4761001', '4761002']);
});

test('não seleciona quando o código confere mas a descrição diverge', () => {
  const candidates = [automation.suggestionEvidence(
    '4761-0/01 - Comércio varejista de jornais e revistas',
    '4761001',
    'Comércio varejista de livros'
  )];
  assert.equal(automation.exactSuggestionDecision(candidates).status, 'description_mismatch');
});

test('duas opções integralmente idênticas são ambíguas', () => {
  const expected = 'Comércio varejista de livros';
  const candidate = automation.suggestionEvidence(
    '4761-0/01 - Comércio varejista de livros',
    '4761001',
    expected
  );
  assert.equal(automation.exactSuggestionDecision([candidate, { ...candidate }]).status, 'ambiguous');
});

test('reconhece código exato pontuado', () => {
  assert.equal(automation.containsExactCode('CNAE 6201-5/01 selecionado', '6201501'), true);
});

test('não confunde código parcial', () => {
  assert.equal(automation.containsExactCode('CNAE 6201-5/02 selecionado', '6201501'), false);
});

test('cartão exige a pergunta do endereço', () => {
  assert.equal(automation.isSelectedActivityText('6201-5/01 - Desenvolvimento', '6201501'), false);
});

test('cartão exige o código exato', () => {
  assert.equal(
    automation.isSelectedActivityText('6202-3/00 - Software. Exerce atividade no endereço informado?', '6201501'),
    false
  );
});

test('reconhece cartão com código e pergunta', () => {
  assert.equal(
    automation.isSelectedActivityText('6201-5/01 - Software. Exerce atividade no endereço informado?', '6201501'),
    true
  );
});

test('bloqueia rótulos de avanço e transmissão', () => {
  for (const label of ['Avançar', 'Salvar', 'Enviar', 'Finalizar', 'Protocolar', 'Transmitir', 'Concluir']) {
    assert.equal(automation.isForbiddenActionLabel(label), true, label);
  }
});

test('identifica título da atividade principal', () => {
  assert.equal(automation.headingRole({ innerText: 'Atividade Principal' }), 'principal');
});

test('identifica título das atividades secundárias', () => {
  assert.equal(automation.headingRole({ innerText: 'Atividade(s) Secundária(s)' }), 'secondary');
});

test('duplicidade no mesmo papel é preservada', () => {
  const decision = automation.existingActivityDecision([{ code: '6201501', role: 'principal' }], '6201501', 'principal');
  assert.equal(decision.status, 'duplicate');
});

test('secundária existente solicitada como principal gera conflito', () => {
  const decision = automation.existingActivityDecision([{ code: '6201501', role: 'secondary' }], '6201501', 'principal');
  assert.equal(decision.status, 'principal_conflict');
});

test('principal existente solicitada como secundária permanece principal', () => {
  const decision = automation.existingActivityDecision([{ code: '6201501', role: 'principal' }], '6201501', 'secondary');
  assert.equal(decision.status, 'duplicate');
  assert.match(decision.detail, /principal/);
});

test('papel não reconhecido exige revisão', () => {
  const decision = automation.existingActivityDecision([{ code: '6201501', role: '' }], '6201501', 'principal');
  assert.equal(decision.status, 'screen_error');
});

test('mesmo código em dois papéis exige revisão', () => {
  const decision = automation.existingActivityDecision([
    { code: '6201501', role: 'principal' },
    { code: '6201501', role: 'secondary' }
  ], '6201501', 'principal');
  assert.equal(decision.status, 'screen_error');
});

test('interpreta somente rótulos inequívocos de resposta', () => {
  assert.equal(automation.addressAnswerFromText('Sim'), true);
  assert.equal(automation.addressAnswerFromText('Não'), false);
  assert.equal(automation.addressAnswerFromText('true'), true);
  assert.equal(automation.addressAnswerFromText('false'), false);
  assert.equal(automation.addressAnswerFromText('Exerce atividade no endereço informado?'), null);
});

test('resposta null permanece manual', () => {
  const decision = automation.addressControlDecision([], null);
  assert.equal(decision.status, 'manual');
});

test('dois rádios desmarcados permitem aplicar somente a resposta solicitada', () => {
  const controls = [
    { answer: true, checked: false, conflicting: false },
    { answer: false, checked: false, conflicting: false }
  ];
  const decision = automation.addressControlDecision(controls, true);
  assert.equal(decision.status, 'apply');
  assert.equal(decision.control.answer, true);
});

test('resposta já correta é somente confirmada', () => {
  const controls = [
    { answer: true, checked: true, conflicting: false },
    { answer: false, checked: false, conflicting: false }
  ];
  assert.equal(automation.addressControlDecision(controls, true).status, 'verified');
});

test('resposta contrária existente gera conflito e não autoriza sobrescrita', () => {
  const controls = [
    { answer: true, checked: false, conflicting: false },
    { answer: false, checked: true, conflicting: false }
  ];
  const decision = automation.addressControlDecision(controls, true);
  assert.equal(decision.status, 'conflict');
  assert.match(decision.detail, /preservada/i);
});

test('dois controles Sim equivalentes são ambíguos', () => {
  const controls = [
    { answer: true, checked: false, conflicting: false },
    { answer: true, checked: false, conflicting: false },
    { answer: false, checked: false, conflicting: false }
  ];
  assert.equal(automation.addressControlDecision(controls, true).status, 'ambiguous');
});

test('Sim e Não marcados simultaneamente exigem revisão', () => {
  const controls = [
    { answer: true, checked: true, conflicting: false },
    { answer: false, checked: true, conflicting: false }
  ];
  assert.equal(automation.addressControlDecision(controls, true).status, 'screen_error');
});

test('controle com rótulos contraditórios é rejeitado', () => {
  const controls = [
    { answer: null, checked: false, conflicting: true },
    { answer: false, checked: false, conflicting: false }
  ];
  assert.equal(automation.addressControlDecision(controls, true).status, 'ambiguous');
});

test('resposta false seleciona somente o controle Não quando ambos estão vazios', () => {
  const controls = [
    { answer: true, checked: false, conflicting: false },
    { answer: false, checked: false, conflicting: false }
  ];
  const decision = automation.addressControlDecision(controls, false);
  assert.equal(decision.status, 'apply');
  assert.equal(decision.control.answer, false);
});

test('estrutura real do Simplifica identifica exerceNoEndereco por name/id e valor', () => {
  const name = 'solicitacao[empresas][0][atividades][0][exerceNoEndereco]';
  assert.equal(
    automation.addressAnswerFromFieldValue(name, 'solicitacao_empresas_0_atividades_0_exerceNoEndereco_0', '1'),
    true
  );
  assert.equal(
    automation.addressAnswerFromFieldValue(name, 'solicitacao_empresas_0_atividades_0_exerceNoEndereco_1', '0'),
    false
  );
});

test('rádio técnico de atividade principal não é interpretado como resposta de endereço', () => {
  assert.equal(
    automation.addressAnswerFromFieldValue(
      'solicitacao[empresas][0][atividades][0][principal]',
      '',
      '1'
    ),
    null
  );
});

test('CNAE sem descrição local aceita somente uma sugestão isolada com código exato e descrição legível', () => {
  const candidates = [
    automation.suggestionEvidence('4744-0/02 - Comércio varejista de madeira e artefatos', '4744002', '')
  ];
  const decision = automation.exactPortalSuggestionDecision(candidates);
  assert.equal(decision.status, 'exact');
  assert.equal(decision.choice.presentedDescription, 'Comércio varejista de madeira e artefatos');
});

test('CNAE sem descrição local continua ambíguo quando o portal expõe duas opções exatas', () => {
  const candidate = automation.suggestionEvidence(
    '4744-0/02 - Comércio varejista de madeira e artefatos',
    '4744002',
    ''
  );
  assert.equal(automation.exactPortalSuggestionDecision([candidate, { ...candidate }]).status, 'ambiguous');
});

test('extrai a descrição do cartão final antes da pergunta de endereço', () => {
  const card = '4744-0/02 - COMÉRCIO VAREJISTA DE MADEIRA E ARTEFATOS Exerce atividade no endereço informado? Sim Não';
  assert.equal(
    automation.selectedCardDescription(card, '4744002'),
    'COMÉRCIO VAREJISTA DE MADEIRA E ARTEFATOS'
  );
});
