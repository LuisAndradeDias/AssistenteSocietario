const test = require('node:test');
const assert = require('node:assert/strict');

const objects = require('../content/object-automation.js');

test('reconhece somente os dois rótulos de objeto esperados', () => {
  assert.equal(objects.fieldKindFromLabel('Objeto da Empresa *'), 'empresa');
  assert.equal(objects.fieldKindFromLabel('Objeto do Estabelecimento ? *'), 'estabelecimento');
  assert.equal(objects.fieldKindFromLabel('Atividade Principal'), '');
});

test('normaliza apenas quebras de linha para conferência exata', () => {
  assert.equal(objects.normalizeLineEndings('Linha 1\r\nLinha 2'), 'Linha 1\nLinha 2');
  assert.equal(objects.normalizeLineEndings('  Comércio varejista  '), '  Comércio varejista  ');
});

test('campo vazio autoriza aplicação do texto solicitado', () => {
  const decision = objects.objectValueDecision('', 'Comércio varejista de artigos diversos.');
  assert.equal(decision.status, 'apply');
});

test('texto já idêntico é somente confirmado', () => {
  const text = 'Comércio varejista de artigos diversos.';
  const decision = objects.objectValueDecision(text, text);
  assert.equal(decision.status, 'verified');
});

test('texto existente diferente gera conflito e não autoriza sobrescrita', () => {
  const decision = objects.objectValueDecision(
    'Texto que já está no portal.',
    'Texto solicitado pelo usuário.'
  );
  assert.equal(decision.status, 'conflict');
  assert.match(decision.detail, /preservado/i);
});

test('texto solicitado vazio é recusado', () => {
  const decision = objects.objectValueDecision('', '   ');
  assert.equal(decision.status, 'invalid');
});
