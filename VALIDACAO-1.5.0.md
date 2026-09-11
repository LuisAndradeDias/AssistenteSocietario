# Validação técnica — 1.5.0 candidata

Data: 2 de setembro de 2026

## Resultado automatizado

- `npm test`: **69/69 aprovados**.
- todos os arquivos JavaScript passam em `node --check`;
- `manifest.json` válido, Manifest V3, versão 1.5.0;
- permissões: somente `storage` e `sidePanel`;
- todos os recursos declarados no manifesto existem;
- dossiê de homologação: válido, **29 CNAEs**, **28 `true` (Sim)**, **1 `false` (Não)**, **0 `null`**;
- CNAE `4789007` confirmado no mapa como `false`;
- dossiê completo continua sem persistência local;
- resposta contrária já marcada é preservada e gera conflito;
- nenhum rádio é escolhido por posição global;
- fila não pode terminar com selo verde se algum CNAE não estiver confirmado no cartão.

## Pendente de homologação real

A captura visual confirmou a existência e o conteúdo dos controles Sim/Não, mas não forneceu o DOM original. Por isso a implementação usa semântica genérica (`input[type=radio]`/`role=radio` + rótulo) e falha fechada caso o componente real não exponha esses sinais de forma inequívoca.

Antes de declarar 1.5.0 estável, executar os cenários 21 a 27 de `HOMOLOGACAO.md`.
