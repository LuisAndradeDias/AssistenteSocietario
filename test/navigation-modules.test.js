const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const baseline = require('../data/process-baseline.js');
globalThis.JuceesProcessBaseline = baseline;
const processData = require('../lib/process-data.js');
globalThis.JuceesProcessData = processData;
const processAutomation = require('../content/process-automation.js');
globalThis.JuceesProcessAutomation = processAutomation;
const navigation = require('../content/navigation-automation.js');

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('painel separa processo, CNAEs, objetos, perguntas e dossiê em módulos', () => {
  const html = source('sidepanel.html');
  for (const moduleName of ['process', 'cnae', 'objects', 'questions', 'dossier']) {
    assert.match(html, new RegExp(`data-module-target="${moduleName}"`));
    assert.match(html, new RegExp(`data-module-panel="${moduleName}"`));
  }
  assert.match(html, /id="autoFlowOpening"/);
  assert.match(html, /id="advanceValidatedStage"/);
  assert.match(html, /sidepanel-modules\.js/);
});

test('manifesto carrega navegação antes do roteador principal', () => {
  const manifest = JSON.parse(source('manifest.json'));
  const scripts = manifest.content_scripts[0].js;
  assert.ok(scripts.includes('content/navigation-automation.js'));
  assert.ok(scripts.indexOf('content/process-automation.js') < scripts.indexOf('content/navigation-automation.js'));
  assert.ok(scripts.indexOf('content/navigation-automation.js') < scripts.indexOf('content/content.js'));
});

test('navegação aceita somente verbos de avanço e nunca ações irreversíveis', () => {
  for (const label of ['Avançar', 'Próximo', 'Prosseguir', 'Continuar']) {
    assert.equal(navigation.isNavigationLabel(label), true, label);
    assert.equal(navigation.isHardBlockedLabel(label), false, label);
  }
  for (const label of ['Salvar', 'Enviar', 'Transmitir', 'Assinar', 'Protocolar', 'Gerar Taxa', 'Finalizar']) {
    assert.equal(navigation.isNavigationLabel(label), false, label);
    assert.equal(navigation.isHardBlockedLabel(label), true, label);
  }
});

test('navegação automática fica limitada a abertura e viabilidade', () => {
  assert.deepEqual(navigation.ALLOWED_PHASES, ['abertura', 'viabilidade']);
});

test('motor de processo consegue conferir decisão manual sem aplicá-la', () => {
  const sourceText = source('content/process-automation.js');
  assert.match(sourceText, /Decisão manual conferida e idêntica/);
  assert.match(sourceText, /A decisão continua manual/);
});

test('roteador expõe avanço validado e painel só dispara após checkpoint', () => {
  const content = source('content/content.js');
  const panel = source('sidepanel-modules.js');
  assert.match(content, /juceesProcessAdvance/);
  assert.match(panel, /checkpointReady\(\)/);
  assert.match(panel, /type:\s*'juceesProcessAdvance'/);
  assert.match(panel, /Pronto para revisão/);
});


test('decisão de navegação exige exatamente um botão elegível', () => {
  const button = {
    textContent: 'Avançar',
    hidden: false,
    disabled: false,
    getAttribute: () => null
  };
  const doc = {
    querySelectorAll: () => [button],
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) }
  };
  assert.equal(navigation.navigationDecision(doc).status, 'ready');
  const ambiguousDoc = { ...doc, querySelectorAll: () => [button, { ...button }] };
  assert.equal(navigation.navigationDecision(ambiguousDoc).status, 'ambiguous');
});

test('botão Salvar nunca vira candidato de navegação', () => {
  const button = {
    textContent: 'Salvar',
    hidden: false,
    disabled: false,
    getAttribute: () => null
  };
  const doc = {
    querySelectorAll: () => [button],
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) }
  };
  assert.equal(navigation.navigationCandidates(doc).length, 0);
  assert.equal(navigation.navigationDecision(doc).status, 'not_found');
});

test('painel modular persiste apenas preferência de interface', () => {
  const panel = source('sidepanel-modules.js');
  assert.match(panel, /juceesModuleUiSettings/);
  assert.match(panel, /activeModule/);
  assert.match(panel, /autoFlowOpening/);
  assert.doesNotMatch(panel, /storage\.local\.set[\s\S]{0,200}(?:dossier|dossie|cpf|cnpj)/i);
});
