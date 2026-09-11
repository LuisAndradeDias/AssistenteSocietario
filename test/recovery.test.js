const test=require('node:test');const assert=require('node:assert/strict');
require('../data/cnae-subclasses-2.3.js');const cnae=require('../lib/cnae.js');const dossier=require('../lib/dossier.js');const privacy=require('../lib/privacy.js');const perf=require('../lib/performance.js');
test('arquivo privacy existe e remove query/hash',()=>assert.equal(privacy.sanitizePagePath('https://simplifica.es.gov.br/br/s/tela?token=segredo#x'),'/br/s/tela'));
test('CNAEs do cenário atual foram recuperados',()=>{for(const code of ['4751201','4530705','4713002','4742300','4789007']) assert.ok(cnae.officialDescription(code),code)});
test('CNAE não recuperado é bloqueado em vez de inventado',()=>assert.equal(cnae.officialDescription('9999999'),''));
test('perfil equilibrado preserva timeouts máximos',()=>{const t=perf.timingsFor('balanced');assert.equal(t.suggestionTimeoutMs,18000);assert.equal(t.selectionTimeoutMs,8500)});
test('dossiê de exemplo é validável pela reconstrução',()=>{const data=require('../examples/dossie-constituicao-v1.exemplo.json');const report=dossier.validateDossier(data);assert.equal(report.valid,true,JSON.stringify(report.errors))});

test('dossiê transfere respostas de endereço junto com os CNAEs', () => {
  const data = require('../examples/dossie-constituicao-v1.exemplo.json');
  const draft = dossier.extractCnaeDraft(data);
  assert.equal(draft.addressAnswers['4751201'], true);
  assert.equal(draft.addressAnswers['4789007'], false);
  assert.equal(Object.keys(draft.addressAnswers).length, draft.codes.length);
});

test('exerceNoEndereco null é preservado como decisão manual no rascunho mínimo', () => {
  const source = require('../examples/dossie-constituicao-v1.exemplo.json');
  const data = JSON.parse(JSON.stringify(source));
  data.atividades.principal.exerceNoEndereco = null;
  const draft = dossier.extractCnaeDraft(data);
  assert.equal(draft.addressAnswers['4751201'], null);
});
