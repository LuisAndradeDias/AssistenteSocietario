const test = require('node:test');
const assert = require('node:assert/strict');

require('../data/cnae-subclasses-2.3.js');
const cnae = require('../lib/cnae.js');

test('normaliza CNAE pontuado', () => {
  assert.equal(cnae.normalizeCode('6201-5/01'), '6201501');
});

test('preserva zero inicial na normalização', () => {
  assert.equal(cnae.normalizeCode('0111-3/01'), '0111301');
});

test('rejeita código com quantidade incorreta de dígitos', () => {
  assert.equal(cnae.normalizeCode('620150'), '');
});

test('formata sete dígitos como subclasse CNAE', () => {
  assert.equal(cnae.formatCode('6201501'), '6201-5/01');
});

test('extrai códigos separados por formatos diferentes', () => {
  assert.deepEqual(cnae.extractCodes('6201-5/01; 6311900'), ['6201501', '6311900']);
});

test('remove códigos duplicados preservando a ordem', () => {
  assert.deepEqual(cnae.extractCodes('6201501, 6201-5/01, 6311900'), ['6201501', '6311900']);
});

test('separa fragmentos inválidos', () => {
  assert.deepEqual(cnae.parseList('texto inválido, 6201501'), { codes: ['6201501'], invalid: ['texto inválido'] });
});

test('localiza descrição oficial incorporada', () => {
  assert.equal(cnae.officialDescription('6201501'), 'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA');
});

test('monta plano principal e secundárias', () => {
  const plan = cnae.makePlan(['6201501', '6311900'], '6201501');
  assert.deepEqual(plan.map(({ code, role }) => ({ code, role })), [
    { code: '6201501', role: 'principal' },
    { code: '6311900', role: 'secondary' }
  ]);
});
