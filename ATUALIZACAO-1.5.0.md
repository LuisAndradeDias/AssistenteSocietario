# Atualização 1.5.0 — respostas de endereço por CNAE

**Status:** candidata à homologação real.

## Evidência usada

A captura real de 2 de setembro de 2026 confirmou que o cartão de atividade contém, no mesmo bloco visual:

- código e descrição do CNAE;
- pergunta `Exerce atividade no endereço informado?`;
- opções `Sim` e `Não`.

Como a evidência fornecida foi uma captura de tela e não o HTML original, nenhum `id`, classe CSS ou ordem interna específica do portal foi presumido. A automação usa apenas evidências semânticas e estruturais genéricas e falha fechada quando não consegue isolá-las.

## Comportamento

- `true` -> solicitar **Sim**;
- `false` -> solicitar **Não**;
- `null` -> manual, sem clique;
- já correto -> confirmar sem novo clique;
- resposta oposta já marcada -> `address_conflict`, preservar e pausar;
- mais de um Sim/Não equivalente -> `address_ambiguous`, sem clique;
- cartão não isolado ou sem controles confirmáveis -> `address_screen_error`;
- clique sem confirmação final -> `address_unverified`.

## Dados

O dossiê completo continua sem persistência local. O rascunho pode guardar apenas o subconjunto mínimo associado à fila: CNAEs, principal e `exerceNoEndereco` por CNAE.

## Segurança preservada

- Manifest V3;
- permissões apenas `storage` e `sidePanel`;
- host restrito ao Simplifica/ES;
- sem rede externa ou código remoto;
- sem avanço, salvamento, assinatura, transmissão ou protocolo automáticos;
- nenhuma resposta profissional é inferida: somente `true`/`false` explícitos são automatizados.
