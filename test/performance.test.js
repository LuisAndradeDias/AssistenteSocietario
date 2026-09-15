const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../data/cnae-subclasses-2.3.js');
require('../lib/cnae.js');
const performance = require('../lib/performance.js');
const automation = require('../content/cnae-automation.js');

test('usa perfil equilibrado como padrão', () => {
  assert.equal(performance.DEFAULT_PROFILE, 'balanced');
  assert.equal(performance.normalizeProfile(undefined), 'balanced');
});

test('perfil desconhecido retorna ao equilibrado', () => {
  assert.equal(performance.normalizeProfile('turbo'), 'balanced');
});

test('mantém três perfis explícitos e imutáveis', () => {
  assert.deepEqual(Object.keys(performance.profiles).sort(), ['balanced', 'conservative', 'fast']);
  assert.equal(Object.isFrozen(performance.profiles), true);
  assert.equal(Object.isFrozen(performance.timingsFor('balanced')), true);
});

test('perfil equilibrado é mais rápido que o conservador', () => {
  const balanced = performance.timingsFor('balanced');
  const conservative = performance.timingsFor('conservative');
  assert.ok(balanced.keyDelayMs < conservative.keyDelayMs);
  assert.ok(balanced.betweenCodesMs < conservative.betweenCodesMs);
});

test('perfil rápido preserva estabilização mínima', () => {
  const fast = performance.timingsFor('fast');
  assert.ok(fast.keyDelayMs >= 80);
  assert.ok(fast.afterTypingMs >= 500);
  assert.ok(fast.stableSuggestionMs >= 600);
});

test('automação limita parâmetros fora da faixa segura', () => {
  assert.deepEqual(automation.normalizeTimings({
    keyDelayMs: 1,
    afterTypingMs: 1,
    stableSuggestionMs: 1
  }), {
    keyDelayMs: 80,
    afterTypingMs: 500,
    stableSuggestionMs: 600
  });
});

test('automação rejeita valores não numéricos usando parâmetros conservadores', () => {
  assert.deepEqual(automation.normalizeTimings({ keyDelayMs: 'x' }), {
    keyDelayMs: 260,
    afterTypingMs: 950,
    stableSuggestionMs: 850
  });
});

test('velocidade não reduz tempos máximos de busca e confirmação', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'cnae-automation.js'), 'utf8');
  assert.match(source, /timeout = 18000/);
  assert.match(source, /\), 8500\);/);
});

test('painel envia apenas o identificador do perfil ao content script', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'sidepanel.js'), 'utf8');
  assert.match(source, /performanceProfile:\s*performanceTools\.normalizeProfile/);
  assert.doesNotMatch(source, /keyDelayMs:\s*elements/);
});
