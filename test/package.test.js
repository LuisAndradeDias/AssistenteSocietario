const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('manifesto declara a versão endurecida em Manifest V3', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '1.7.0');
  assert.equal(manifest.minimum_chrome_version, '114');
});

test('permissões são mínimas e não incluem tabs', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['sidePanel', 'storage']);
  assert.equal(manifest.permissions.includes('tabs'), false);
  assert.deepEqual(manifest.host_permissions, [
    'https://simplifica.es.gov.br/*',
    'https://www.simplifica.es.gov.br/*',
    'https://*.simplifica.es.gov.br/*'
  ]);
});

test('bibliotecas de privacidade e estado carregam antes da automação', () => {
  const scripts = manifest.content_scripts[0].js;
  assert.ok(scripts.indexOf('lib/privacy.js') < scripts.indexOf('content/content.js'));
  assert.ok(scripts.indexOf('lib/run-state.js') < scripts.indexOf('content/content.js'));
  assert.ok(scripts.indexOf('lib/performance.js') < scripts.indexOf('content/cnae-automation.js'));
  assert.ok(scripts.indexOf('lib/tab-protection.js') < scripts.indexOf('content/content.js'));
  assert.ok(scripts.indexOf('content/cnae-automation.js') < scripts.indexOf('content/content.js'));
  assert.ok(scripts.indexOf('data/process-baseline.js') < scripts.indexOf('content/process-automation.js'));
  assert.ok(scripts.indexOf('lib/process-data.js') < scripts.indexOf('content/process-automation.js'));
  assert.ok(scripts.indexOf('content/object-automation.js') < scripts.indexOf('content/content.js'));
  assert.ok(scripts.indexOf('content/process-automation.js') < scripts.indexOf('content/content.js'));
});

test('todos os recursos declarados no manifesto existem', () => {
  const declared = [
    manifest.background.service_worker,
    manifest.side_panel.default_path,
    ...manifest.content_scripts.flatMap((entry) => [...entry.js, ...entry.css])
  ];
  for (const relativePath of declared) assert.equal(fs.existsSync(path.join(root, relativePath)), true, relativePath);
});

test('painel carrega o validador de dossiê antes do controlador', () => {
  const html = source('sidepanel.html');
  assert.ok(html.indexOf('lib/dossier.js') < html.indexOf('sidepanel.js'));
  assert.ok(html.indexOf('lib/performance.js') < html.indexOf('sidepanel.js'));
  assert.equal(fs.existsSync(path.join(root, 'schemas/dossie-jucees-v1.schema.json')), true);
});

test('npm test possui guarda que impede suíte vazia', () => {
  assert.equal(packageJson.scripts.pretest, 'node scripts/assert-tests-present.js');
  assert.equal(packageJson.scripts.test, 'node --test test/*.test.js');
  assert.match(source('scripts/assert-tests-present.js'), /nenhuma suíte \*\.test\.js foi encontrada/i);
  assert.ok(fs.readdirSync(path.join(root, 'test')).filter((name) => name.endsWith('.test.js')).length > 0);
});

test('base CNAE recuperada contém apenas entradas válidas e sem descrições vazias', () => {
  delete globalThis.JuceesCnaeDescriptions;
  delete require.cache[require.resolve('../data/cnae-subclasses-2.3.js')];
  require('../data/cnae-subclasses-2.3.js');
  const dataset = globalThis.JuceesCnaeDescriptions;
  assert.ok(Object.keys(dataset).length >= 30);
  for (const [code, description] of Object.entries(dataset)) {
    assert.match(code, /^\d{7}$/);
    assert.ok(description.trim().length > 0, code);
  }
});

test('código executável não usa rede remota nem avaliação dinâmica', () => {
  const executableFiles = [
    'background.js',
    'content/cnae-automation.js',
    'content/object-automation.js',
    'content/process-automation.js',
    'content/content.js',
    'lib/cnae.js',
    'lib/dossier.js',
    'lib/privacy.js',
    'lib/performance.js',
    'lib/run-state.js',
    'lib/tab-protection.js',
    'lib/process-data.js',
    'data/process-baseline.js',
    'sidepanel.js'
  ];
  for (const relativePath of executableFiles) {
    const code = source(relativePath);
    assert.doesNotMatch(code, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/, relativePath);
    assert.doesNotMatch(code, /\beval\s*\(|\bnew\s+Function\s*\(/, relativePath);
  }
});

test('dossiê completo não é persistido no armazenamento local', () => {
  const code = source('sidepanel.js');
  assert.doesNotMatch(code, /chrome\.storage\.local\.set\([\s\S]{0,300}(?:dossier|dossie|importedDossier)/i);
  assert.match(code, /MAX_DOSSIER_BYTES\s*=\s*1024\s*\*\s*1024/);
});

test('estado persistido guarda somente caminho sanitizado', () => {
  const code = source('content/content.js');
  assert.match(code, /pagePath:\s*privacy\.sanitizePagePath\(location\.href\)/);
  assert.doesNotMatch(code, /pageUrl|url:\s*location\.href/);
  const stateDefinition = code.match(/const state = \{[\s\S]*?\n    \};/);
  assert.ok(stateDefinition);
  assert.doesNotMatch(stateDefinition[0], /document\.title|location\.href(?!\))/);
});

test('confirmação não aceita efeitos indiretos da interface', () => {
  const code = source('content/cnae-automation.js');
  const confirmation = code.match(/function selectionConfirmed\([\s\S]*?\n  }/);
  assert.ok(confirmation);
  assert.match(confirmation[0], /selectedActivityRecords/);
  assert.match(confirmation[0], /record\.role === role/);
  assert.doesNotMatch(confirmation[0], /outputChanged|becamePopulated|resultClosed/);
});

test('automação continua proibindo avanço, salvamento e transmissão', () => {
  const code = source('content/cnae-automation.js');
  for (const label of ['avancar', 'salvar', 'enviar', 'finalizar', 'protocolar', 'transmitir', 'concluir']) {
    assert.match(code, new RegExp(label, 'i'));
  }
});

test('proteção de segundo plano não reintroduz a permissão tabs', () => {
  const background = source('background.js');
  const content = source('content/content.js');
  assert.match(background, /autoDiscardable/);
  assert.match(background, /lib\/tab-protection\.js/);
  assert.match(content, /setBackgroundProtection\(true\)/);
  assert.match(content, /setBackgroundProtection\([\s\S]{0,120}false/);
  assert.equal(manifest.permissions.includes('tabs'), false);
});

test('seleção exige opção isolada com código e descrição exatos', () => {
  const code = source('content/cnae-automation.js');
  assert.match(code, /evidence\.singleExactCode/);
  assert.match(code, /exactSuggestionDecision/);
  assert.match(code, /decision\.status !== 'exact'/);
  assert.doesNotMatch(code, /matchingDescriptions\[0\]/);
});

test('fila recebe somente o mapa mínimo de respostas de endereço do dossiê', () => {
  const panel = source('sidepanel.js');
  const content = source('content/content.js');
  assert.match(panel, /addressAnswers:\s*sanitizeAddressAnswers\(appliedAddressAnswers\)/);
  assert.match(content, /normalizeAddressAnswers\(payload\.addressAnswers, plan\)/);
  assert.match(content, /automation\.applyAddressAnswer/);
});

test('resposta contrária existente é tratada como conflito antes de qualquer novo clique', () => {
  const code = source('content/cnae-automation.js');
  const decision = code.match(/function addressControlDecision\([\s\S]*?\n  }/);
  assert.ok(decision);
  assert.match(decision[0], /opposite\.checked/);
  assert.match(decision[0], /status:\s*'conflict'/);
  assert.match(decision[0], /preservada/i);
});

test('resposta de endereço exige cartão exato e não usa posição global dos rádios', () => {
  const code = source('content/cnae-automation.js');
  assert.match(code, /card\.codes\.length === 1/);
  assert.match(code, /card\.role === role/);
  assert.match(code, /input\[type="radio"\], \[role="radio"\]/);
  assert.doesNotMatch(code, /querySelectorAll\([^)]*radio[^)]*\)\s*\[\s*[01]\s*\]/);
});

test('fila não termina verde quando algum CNAE não foi confirmado', () => {
  const code = source('content/content.js');
  assert.match(code, /unresolvedItems\s*=\s*state\.items\.filter/);
  assert.match(code, /!\['added', 'duplicate'\]\.includes\(item\.status\)/);
  assert.match(code, /unresolvedItems\.length \? 'review_required' : 'completed'/);
});

test('reduzir a fila preserva respostas apenas dos CNAEs que continuam presentes', () => {
  const panel = source('sidepanel.js');
  const handler = panel.match(/elements\.codes\.addEventListener\('input',[\s\S]*?\n  \}\);/);
  assert.ok(handler);
  assert.match(handler[0], /renderParser\(\)/);
  assert.match(handler[0], /appliedAddressAnswers = sanitizeAddressAnswers\(appliedAddressAnswers\)/);
  assert.doesNotMatch(handler[0], /appliedAddressAnswers = \{\}/);
});

test('painel evita quebras visuais em badges e códigos sem impedir textos longos de quebrar em palavras', () => {
  const css = source('styles/sidepanel.css');
  assert.match(css, /\.badge\s*\{[\s\S]*?white-space:\s*nowrap/);
  assert.match(css, /\.result-code\s*\{[\s\S]*?white-space:\s*nowrap/);
  assert.match(css, /overflow-wrap:\s*break-word/);
  assert.match(css, /\.section-header\s*>\s*div\s*\{[^}]*min-width:\s*0/);
});

test('CNAE manual não depende do dossiê nem é bloqueado só por ausência na base local recuperada', () => {
  const panel = source('sidepanel.js');
  const content = source('content/content.js');
  const automation = source('content/cnae-automation.js');
  assert.doesNotMatch(panel, /parsed\.unknown\.length\s*>\s*0/);
  assert.match(panel, /validar pelo portal/i);
  assert.doesNotMatch(content, /missingOfficial/);
  assert.match(automation, /exactPortalSuggestionDecision/);
  assert.match(automation, /selectionConfirmedWithDescription/);
  assert.match(automation, /informado manualmente, validado por código exato/i);
});

test('objetos são independentes do dossiê e ficam somente no armazenamento de sessão', () => {
  const panel = source('sidepanel.js');
  const html = source('sidepanel.html');
  assert.match(html, /id="objectCompany"/);
  assert.match(html, /id="objectEstablishment"/);
  assert.match(html, /id="loadDossierObjects"/);
  assert.match(panel, /chrome\.storage\.session\.set\(\{ \[OBJECT_DRAFT_KEY\]/);
  assert.doesNotMatch(panel, /chrome\.storage\.local\.set\([\s\S]{0,220}objetoEmpresa/i);
});

test('módulo de objetos bloqueia sobrescrita silenciosa e exige confirmação exata', () => {
  const code = source('content/object-automation.js');
  assert.match(code, /status:\s*'conflict'/);
  assert.match(code, /conteúdo existente foi preservado/i);
  assert.match(code, /normalizeLineEndings\(item\.element\.value\) === requested\[item\.kind\]/);
  assert.match(code, /querySelectorAll\('textarea'\)/);
});
