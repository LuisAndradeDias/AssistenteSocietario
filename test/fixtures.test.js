const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../data/cnae-subclasses-2.3.js');
require('../lib/cnae.js');
const automation = require('../content/cnae-automation.js');
const fixturesDirectory = path.join(__dirname, 'fixtures');

function fixture(name) {
  return fs.readFileSync(path.join(fixturesDirectory, name), 'utf8');
}

function textContent(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectedCards(html) {
  return [...html.matchAll(/<article\b([^>]*\bdata-fixture-card\b[^>]*)>([\s\S]*?)<\/article>/gi)]
    .map((match) => ({
      role: match[1].match(/\bdata-role=["']([^"']+)["']/i)?.[1] || '',
      text: textContent(match[2])
    }));
}

function suggestions(html) {
  return [...html.matchAll(/<(?:ul|div)\b[^>]*\bdata-fixture-suggestion\b[^>]*>([\s\S]*?)<\/(?:ul|div)>/gi)]
    .map((match) => textContent(match[1]));
}

function suggestionOptions(html) {
  return [...html.matchAll(/<a\b[^>]*\bdata-fixture-option\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => textContent(match[1]));
}

test('mantém o conjunto mínimo de capturas sanitizadas', () => {
  assert.deepEqual(
    fs.readdirSync(fixturesDirectory).filter((name) => name.endsWith('.html')).sort(),
    ['activity-address-radios.html', 'empty-step.html', 'multiple-cnae-suggestions.html', 'principal-selected.html', 'secondary-with-autocomplete.html', 'wide-container-regression.html']
  );
});

test('capturas não contêm CPF, CNPJ, UUID, URL ou parâmetros', () => {
  for (const name of fs.readdirSync(fixturesDirectory).filter((entry) => entry.endsWith('.html'))) {
    const html = fixture(name);
    assert.doesNotMatch(html, /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, name);
    assert.doesNotMatch(html, /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/, name);
    assert.doesNotMatch(html, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i, name);
    assert.doesNotMatch(html, /https?:\/\//i, name);
    assert.doesNotMatch(html, /[?&](?:token|session|protocolo|cpf|cnpj)=/i, name);
  }
});

test('reconhece somente o cartão principal com código e pergunta exatos', () => {
  const cards = selectedCards(fixture('principal-selected.html'));
  assert.equal(cards.length, 1);
  assert.equal(cards[0].role, 'principal');
  assert.equal(automation.isSelectedActivityText(cards[0].text, '6201501'), true);
});

test('reconhece o cartão secundário, mas não a sugestão do autocomplete', () => {
  const html = fixture('secondary-with-autocomplete.html');
  const cards = selectedCards(html);
  const suggestion = suggestions(html);
  assert.equal(cards[0].role, 'secondary');
  assert.equal(automation.isSelectedActivityText(cards[0].text, '6311900'), true);
  assert.equal(automation.isSelectedActivityText(suggestion[0], '6202300'), false);
});

test('contêiner amplo não converte sugestão em confirmação', () => {
  const html = fixture('wide-container-regression.html');
  const cards = selectedCards(html);
  const suggestion = suggestions(html);
  assert.equal(cards.length, 1);
  assert.equal(automation.isSelectedActivityText(cards[0].text, '4751201'), true);
  assert.equal(automation.isSelectedActivityText(suggestion[0], '6201501'), false);
});

test('etapa vazia não produz cartões selecionados', () => {
  assert.deepEqual(selectedCards(fixture('empty-step.html')), []);
});

test('captura com três sugestões conserva apenas código e descrição exatos', () => {
  const options = suggestionOptions(fixture('multiple-cnae-suggestions.html'));
  const expected = 'Comércio varejista de livros';
  const candidates = options.map((text) => automation.suggestionEvidence(text, '4761001', expected));
  assert.equal(options.length, 3);
  assert.equal(automation.exactSuggestionDecision(candidates).status, 'exact');
  assert.deepEqual(candidates.map((item) => item.singleExactCode), [true, false, false]);
});


test('fixture real dos rádios separa principal técnico de exatamente dois exerceNoEndereco', () => {
  const html = fixture('activity-address-radios.html');
  const text = textContent(html);
  assert.equal(automation.isSelectedActivityText(text, '4751201'), true);
  const labels = [...html.matchAll(/<label[^>]*>[\s\S]*?\b(Sim|Não)\b[\s\S]*?<\/label>/gi)].map((match) => match[1].toLowerCase());
  assert.deepEqual(labels.sort(), ['não', 'sim'].sort());
  assert.equal((html.match(/type="radio"/g) || []).length, 3);
  assert.equal((html.match(/name="[^"]*\[exerceNoEndereco\]"/g) || []).length, 2);
  assert.equal((html.match(/name="[^"]*\[principal\]"/g) || []).length, 1);
  assert.match(html, /\[exerceNoEndereco\][^>]*value="1"/);
  assert.match(html, /\[exerceNoEndereco\][^>]*value="0"/);
});
