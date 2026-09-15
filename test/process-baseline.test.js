const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const baseline = require('../data/process-baseline.js');
globalThis.JuceesProcessBaseline = baseline;
const processData = require('../lib/process-data.js');
globalThis.JuceesProcessData = processData;
const automation = require('../content/process-automation.js');

const example = require('../examples/dossie-constituicao-v1.exemplo.json');

const expectedStageIds = [
  'AB-01','AB-02','AB-03','AB-04','AB-05',
  'VP-01','VP-02','VP-03','VP-04','VP-05','VP-06','VP-07','VP-08','VP-09','VP-10','VP-11','VP-12',
  'FCN-00','FCN-01','FCN-02','FCN-03','FCN-04','FCN-05','FCN-06','FCN-07','FCN-08','FCN-09','FCN-10',
  'REG-01','REG-02','REG-03','REG-04','REG-05','REG-06',
  'POS-01','POS-02','POS-03','POS-04'
];

test('baseline cobre todas as telas mapeadas da abertura LTDA', () => {
  assert.deepEqual(baseline.STAGES.map((stage) => stage.id), expectedStageIds);
  assert.equal(new Set(expectedStageIds).size, expectedStageIds.length);
});

test('ações irreversíveis permanecem bloqueadas ou sem aplicação', () => {
  for (const id of ['AB-04', 'AB-05', 'VP-11', 'FCN-00', 'FCN-10', 'REG-01', 'REG-02', 'REG-04', 'REG-05', 'REG-06']) {
    const stage = baseline.getStage(id);
    assert.ok(stage, id);
    assert.equal(stage.applyEnabled, false, id);
  }
});

test('módulos de unidade, atuação e perguntas são assistidos e explícitos', () => {
  assert.equal(baseline.getStage('VP-08').mode, baseline.MODES.ASSISTED);
  assert.equal(baseline.getStage('VP-09').mode, baseline.MODES.ASSISTED);
  assert.equal(baseline.getStage('VP-10').specialized, 'questions');
  assert.equal(baseline.getStage('VP-10').fields[0].kind, 'dynamic_questions');
});

test('dados manuais substituem o dossiê somente no painel da etapa', () => {
  const dossierValues = processData.extractStageValues(example, 'VP-05');
  assert.equal(dossierValues['endereco.cep'].value, '29000000');
  const merged = processData.mergeStageValues(example, 'VP-05', { 'endereco.cep': { value: '29100000' } });
  assert.equal(merged['endereco.cep'].value, '29100000');
  assert.equal(merged['endereco.cep'].source, 'manual');
});

test('objetos do dossiê entram na etapa VP-07 sem tornar dossiê obrigatório', () => {
  const values = processData.extractStageValues(example, 'VP-07');
  assert.equal(values['empresa.objetoEmpresa'].value, example.empresa.objetoEmpresa);
  assert.deepEqual(processData.extractStageValues(null, 'VP-07'), {});
});

test('campo vazio pode receber valor mas campo divergente gera conflito', () => {
  assert.equal(automation.scalarValueDecision('', 'Vitória').status, 'apply');
  assert.equal(automation.scalarValueDecision('Vitória', 'Vitória').status, 'verified');
  assert.equal(automation.scalarValueDecision('Serra', 'Vitória').status, 'conflict');
});

test('seleção existente diferente não é sobrescrita silenciosamente', () => {
  assert.equal(automation.setValueDecision([], ['Sede']).status, 'apply');
  assert.equal(automation.setValueDecision(['Sede'], ['Sede']).status, 'verified');
  assert.equal(automation.setValueDecision(['Unidade Produtiva'], ['Sede']).status, 'conflict');
});

test('booleano Sim/Não usa aliases como alternativas e seleciona um único alvo', () => {
  const binding = {
    field: { kind: 'boolean' },
    options: [
      { label: 'Sim', value: 'true', control: { checked: false } },
      { label: 'Não', value: 'false', control: { checked: false } }
    ]
  };
  const yes = automation.groupDecision(binding, true);
  assert.equal(yes.status, 'apply');
  assert.equal(yes.targets.length, 1);
  assert.equal(yes.targets[0].label, 'Sim');
  const no = automation.groupDecision(binding, false);
  assert.equal(no.status, 'apply');
  assert.equal(no.targets.length, 1);
  assert.equal(no.targets[0].label, 'Não');
});

test('motor reconhece todos os rótulos críticos como proibidos', () => {
  for (const label of ['Avançar', 'Próximo', 'Prosseguir', 'Continuar', 'Salvar', 'Gravar', 'Enviar', 'Finalizar', 'Concluir', 'Transmitir', 'Protocolar', 'Assinar', 'Gerar Taxa']) {
    assert.equal(automation.isForbiddenActionLabel(label), true, label);
  }
});

test('chave de pergunta dinâmica é determinística e muda quando a pergunta muda', () => {
  const first = automation.stableQuestionKey('A atividade será exercida na residência?', 'campo[1]');
  assert.equal(first, automation.stableQuestionKey('A atividade será exercida na residência?', 'campo[1]'));
  assert.notEqual(first, automation.stableQuestionKey('A edificação possui subsolo?', 'campo[1]'));
  assert.equal(
    automation.stableQuestionKey('A atividade será exercida na residência?', 'perguntas[12345].resposta'),
    automation.stableQuestionKey('A atividade será exercida na residência?', 'perguntas[98765].resposta')
  );
});

test('automação genérica não usa seleção por posição para checkbox ou radio', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'process-automation.js'), 'utf8');
  assert.doesNotMatch(source, /checkboxes\s*\[\s*\d+\s*\]/i);
  assert.doesNotMatch(source, /radios\s*\[\s*\d+\s*\]/i);
  assert.doesNotMatch(source, /nth-child\s*\(/i);
  assert.match(source, /status:\s*'conflict'/);
  assert.match(source, /confidence !== 'high'/);
});

test('content script expõe rotas separadas para processo, objetos e perguntas', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'content.js'), 'utf8');
  for (const type of ['juceesObjectsAnalyze', 'juceesObjectsApply', 'juceesProcessAnalyze', 'juceesProcessApply', 'juceesProcessCheckpoint', 'juceesQuestionsAnalyze', 'juceesQuestionsApply']) {
    assert.match(source, new RegExp(type));
  }
});

test('painel contém UX de processo, checkpoint e perguntas dinâmicas', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'sidepanel.html'), 'utf8');
  for (const id of ['processBadge', 'processFields', 'analyzeProcess', 'applyProcess', 'checkpointProcess', 'questionsList', 'analyzeQuestions', 'applyQuestions']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});


test('perguntas dinâmicas ficam restritas à VP-10 e aplicação exige confiança alta', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'content.js'), 'utf8');
  assert.match(source, /stage\.stageId !== 'VP-10'/);
  assert.match(source, /stage\.confidence !== 'high'/);
});

test('painel invalida análise quando o dossiê muda e converte booleanos para opções Sim/Não', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'sidepanel.js'), 'utf8');
  assert.match(source, /function invalidateProcessPanel/);
  assert.match(source, /function findQuestionOption/);
  assert.match(source, /candidates\.add\('sim'\)/);
  assert.match(source, /candidates\.add\('nao'\)/);
});


test('aplicação genérica faz preflight e perguntas dinâmicas bloqueiam antes do primeiro clique conhecido', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'process-automation.js'), 'utf8');
  assert.match(source, /const preflightBlocker = analysis\.fields\.find/);
  assert.match(source, /Nenhum campo da etapa foi alterado/);
  assert.match(source, /Nenhuma resposta foi alterada/);
  assert.match(source, /'not_found', 'invalid'/);
});
