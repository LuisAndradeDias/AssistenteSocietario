const test = require('node:test');
const assert = require('node:assert/strict');

const protection = require('../lib/tab-protection.js');

test('início da fila desativa o descarte automático da aba', () => {
  assert.equal(protection.requestedAutoDiscardable(protection.request(true)), false);
});

test('fim da fila restaura a política anterior da aba', () => {
  assert.equal(protection.requestedAutoDiscardable(protection.request(false, true)), true);
  assert.equal(protection.requestedAutoDiscardable(protection.request(false, false)), false);
});

test('mensagens alheias não alteram a aba', () => {
  assert.equal(protection.requestedAutoDiscardable({ type: 'juceesCnaeProgress' }), null);
  assert.equal(protection.requestedAutoDiscardable({ type: protection.MESSAGE_TYPE, active: 'sim' }), null);
});

test('registra se a aba já estava protegida antes da fila', () => {
  assert.equal(protection.previousAutoDiscardable({ autoDiscardable: true }), true);
  assert.equal(protection.previousAutoDiscardable({ autoDiscardable: false }), false);
});
