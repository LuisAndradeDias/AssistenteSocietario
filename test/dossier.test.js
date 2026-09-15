const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../data/cnae-subclasses-2.3.js');
require('../lib/cnae.js');
const dossier = require('../lib/dossier.js');

const examplePath = path.join(__dirname, '..', 'examples', 'dossie-constituicao-v1.exemplo.json');
const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
const clone = () => structuredClone(example);

test('define versão estável do esquema de interoperabilidade', () => {
  assert.equal(dossier.SCHEMA_VERSION, '1.0.0');
});

test('aceita o exemplo sanitizado de constituição', () => {
  const result = dossier.validateDossier(clone());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('recusa raiz que não seja objeto JSON', () => {
  assert.equal(dossier.validateDossier([]).errors[0].code, 'type');
});

test('recusa versão desconhecida', () => {
  const value = clone();
  value.schemaVersion = '2.0.0';
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.code === 'unsupported_version'), true);
});

test('recusa campo raiz desconhecido para não ignorar erro de digitação', () => {
  const value = clone();
  value.emrpesa = {};
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.path === '$.emrpesa'), true);
});

test('recusa campo interno desconhecido', () => {
  const value = clone();
  value.empresa.objetoEmpres = 'erro de digitação';
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.path === '$.empresa.objetoEmpres'), true);
});

test('limita o registro a processos no Espírito Santo', () => {
  const value = clone();
  value.processo.ufRegistro = 'RJ';
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.path === '$.processo.ufRegistro'), true);
});

test('alteração exige CNPJ válido', () => {
  const value = clone();
  value.processo.tipo = 'alteracao';
  value.processo.eventos = [{ codigo: '002', descricao: 'Alteração' }];
  value.empresa.cnpj = '11111111111111';
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.path === '$.empresa.cnpj'), true);
});

test('valida dígitos verificadores de CPF e CNPJ', () => {
  assert.equal(dossier.isValidCpf('529.982.247-25'), true);
  assert.equal(dossier.isValidCpf('529.982.247-24'), false);
  assert.equal(dossier.isValidCnpj('11.222.333/0001-81'), true);
  assert.equal(dossier.isValidCnpj('11.222.333/0001-80'), false);
});

test('mascara documento sem expor o número completo', () => {
  assert.equal(dossier.maskDocument('11222333000181'), '**.***.***/0001-81');
  assert.equal(dossier.maskDocument('52998224725'), '***.***.247-25');
});

test('CNAE ausente da base local vira alerta e pode ser validado pelo portal', () => {
  const value = clone();
  value.atividades.principal.codigo = '9999999';
  const report = dossier.validateDossier(value);
  assert.equal(report.errors.some((item) => item.path === '$.atividades.principal.codigo'), false);
  assert.equal(report.warnings.some((item) => item.code === 'cnae_unverified_local'), true);
});

test('recusa CNAE repetido entre principal e secundárias', () => {
  const value = clone();
  value.atividades.secundarias[0].codigo = value.atividades.principal.codigo;
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.code === 'duplicate'), true);
});

test('recusa resposta do endereço fora de booleano ou nulo', () => {
  const value = clone();
  value.atividades.principal.exerceNoEndereco = 'sim';
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.code === 'boolean_or_null'), true);
});

test('alerta quando perguntas do endereço permanecem sem resposta', () => {
  const value = clone();
  value.atividades.principal.exerceNoEndereco = null;
  const result = dossier.validateDossier(value);
  assert.equal(result.warnings.some((item) => item.code === 'manual_address_answers'), true);
});

test('recusa divergência matemática do capital', () => {
  const value = clone();
  value.capital.valorTotal = '9999.00';
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.code === 'capital_math'), true);
});

test('recusa soma de quotas divergente do capital', () => {
  const value = clone();
  value.socios[0].quotas = '9999';
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.code === 'quota_sum'), true);
});

test('recusa administrador não localizado no QSA', () => {
  const value = clone();
  value.administracao.administradores = ['socio-inexistente'];
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.code === 'unknown_partner'), true);
});

test('recusa dossiê que desative a revisão humana', () => {
  const value = clone();
  value.declaracoes.revisaoHumanaObrigatoria = false;
  assert.equal(dossier.validateDossier(value).errors.some((item) => item.code === 'safety'), true);
});

test('extrai CNAEs na ordem principal e secundárias com respostas de endereço', () => {
  const value = clone();
  const draft = dossier.extractCnaeDraft(value);
  assert.equal(draft.principalCode, value.atividades.principal.codigo);
  assert.deepEqual(draft.codes, [value.atividades.principal.codigo, ...value.atividades.secundarias.map((item) => item.codigo)]);
  assert.equal(draft.addressAnswers[value.atividades.principal.codigo], value.atividades.principal.exerceNoEndereco);
  assert.match(draft.text, /4751-2\/01/);
});

test('resumo não expõe documentos de sócios ou contabilista', () => {
  const summary = dossier.summarizeDossier(clone());
  assert.equal(summary.companyName, example.empresa.nomeEmpresarial);
  assert.equal(JSON.stringify(summary).includes('52998224725'), false);
  assert.equal(JSON.stringify(summary).includes('11144477735'), false);
});

test('esquema JSON é válido e aponta para a versão 1.0.0', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schemas', 'dossie-jucees-v1.schema.json'), 'utf8'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.schemaVersion.const, '1.0.0');
  assert.equal(schema.additionalProperties, false);
});
