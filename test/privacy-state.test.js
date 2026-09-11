const test = require('node:test');
const assert = require('node:assert/strict');

const privacy = require('../lib/privacy.js');
const runState = require('../lib/run-state.js');

test('armazena somente o caminho sem origem, consulta ou fragmento', () => {
  assert.equal(
    privacy.sanitizePagePath('https://simplifica.es.gov.br/br/s/consultaprevia/quinto-passo?token=segredo#dados'),
    '/br/s/consultaprevia/quinto-passo'
  );
});

test('preserva rota estrutural segura', () => {
  assert.equal(privacy.sanitizePagePath('/br/s/consultaprevia/quinto-passo'), '/br/s/consultaprevia/quinto-passo');
});

test('redige identificador numérico longo no caminho', () => {
  assert.equal(privacy.sanitizePagePath('https://simplifica.es.gov.br/processo/123456789/etapa'), '/processo/:id/etapa');
});

test('redige UUID no caminho', () => {
  assert.equal(
    privacy.sanitizePagePath('https://simplifica.es.gov.br/processo/123e4567-e89b-12d3-a456-426614174000'),
    '/processo/:id'
  );
});

test('retorna raiz para URL inválida', () => {
  assert.equal(privacy.sanitizePagePath('http://%'), '/');
});

test('estado ativo reflete pausa, parada e execução', () => {
  assert.equal(runState.activeStatus({ paused: false, stopped: false }), 'running');
  assert.equal(runState.activeStatus({ paused: true, stopped: false }), 'paused');
  assert.equal(runState.activeStatus({ paused: true, stopped: true }), 'stopped');
});

test('recupera execução interrompida após recarga', () => {
  const recovered = runState.recoverInterruptedRun({
    status: 'running',
    items: [{ code: '6201501', status: 'searching' }, { code: '6311900', status: 'pending' }]
  });
  assert.equal(recovered.status, 'stopped');
  assert.equal(recovered.items[0].status, 'unverified');
  assert.equal(recovered.items[1].status, 'pending');
});

test('preserva estado terminal sem criar nova cópia', () => {
  const completed = { status: 'completed', items: [] };
  assert.equal(runState.recoverInterruptedRun(completed), completed);
});
