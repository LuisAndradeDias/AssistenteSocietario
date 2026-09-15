# JUCEES Assistente 1.7.0 — candidata integrada da abertura LTDA

Extensão local Chrome Manifest V3 para preenchimento e conferência assistidos de processos no Simplifica ES/JUCEES.

A versão 1.7.0 preserva o módulo homologado de CNAEs + `exerceNoEndereco`, conclui a candidata de **Objeto da Empresa / Objeto do Estabelecimento** e adiciona uma arquitetura de processo para todas as telas mapeadas da abertura de Sociedade Empresária Limitada.

> **Importante:** os módulos novos são candidatos até teste no Simplifica real. Quando o DOM não é inequívoco, a extensão falha fechada e não altera a página.

## Princípio de segurança

**Dado explícito → identificação inequívoca → ação → confirmação do DOM → fail-closed → revisão humana.**

A extensão não automatiza comandos equivalentes a:

- Avançar;
- Salvar;
- Enviar;
- Finalizar;
- Concluir;
- Transmitir;
- Assinar;
- Protocolar;
- Gerar taxa.

## O que existe na 1.7.0

### Homologado e preservado

- CNAE principal e secundários;
- CNAE digitado manualmente, inclusive quando ausente da base local recuperada;
- validação reforçada pelo portal;
- confirmação pelo cartão final;
- `exerceNoEndereco` Sim/Não por CNAE;
- conflito com resposta existente sem sobrescrita;
- fila visual, pausa, retomada e recuperação conservadora.

### Candidato para homologação

- Objeto da Empresa;
- Objeto do Estabelecimento;
- comparação exata e preservação de texto divergente;
- Assistente do Processo com 38 etapas da baseline de abertura;
- reconhecimento semântico da tela atual;
- dados por dossiê ou edição manual da etapa;
- aplicação genérica de campos escalares, selects, radios e checkboxes somente quando inequívocos;
- Tipo de Unidade e Forma de Atuação em modo assistido;
- motor dinâmico de Perguntas Complementares;
- checkpoint da etapa;
- histórico de etapas analisadas na sessão;
- detecção visual de ações protegidas presentes na página;
- leitura/conferência das etapas de FCN, registro e pós-registro conforme a baseline.

### Deliberadamente não automatizado nesta candidata

Coleções complexas sem DOM real homologado, como inclusão/edição de sócios, administradores, representantes, integralizações, assinantes e documentos, são reconhecidas na baseline e podem receber dados no dossiê, mas permanecem em modo manual/conferência até captura da estrutura real.

Isso evita selecionar pessoas, opções ou ações pela posição.

## Dossiê opcional

O dossiê continua opcional. Dados podem vir de:

1. arquivo JSON importado localmente;
2. campo manual do painel;
3. preenchimento manual direto no portal.

O dossiê completo não é persistido em `chrome.storage.local`. Rascunhos sensíveis da nova camada ficam em `chrome.storage.session`.

CNAE ausente da base local **não é whitelist nem bloqueio**: recebe alerta e é validado pelo código exato no portal.

## Instalação

1. Extraia a pasta em local permanente.
2. Abra `chrome://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta que contém `manifest.json`.
6. Após atualizar, clique em **Recarregar** na extensão e recarregue também a aba do Simplifica ES.

## Primeiro teste recomendado da 1.7.0

1. Abra a tela de Atividades da Viabilidade.
2. Abra o Side Panel.
3. Clique em **Analisar etapa** no bloco Assistente do processo.
4. Verifique se a etapa é identificada como `VP-07`.
5. Informe Objeto da Empresa e Objeto do Estabelecimento.
6. Clique em **Verificar campos**.
7. Teste os três cenários de objetos:
   - campo vazio;
   - mesmo texto já existente;
   - texto diferente já existente.
8. No terceiro cenário, confirme que nenhum texto é sobrescrito.
9. Depois teste **Tipo de Unidade**, **Forma de Atuação** e **Perguntas complementares**; se a tela ficar apenas em confiança moderada ou não reconhecida, envie o print/HTML sanitizado para endurecimento do detector.

## Desenvolvimento

Requer Node.js 18+:

```bash
npm test
```

A 1.7.0 passa em **147 testes automatizados** antes da homologação real desta entrega.

Consulte `HOMOLOGACAO.md` para o roteiro de teste.
