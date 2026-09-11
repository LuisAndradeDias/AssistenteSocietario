# Atualização diferencial — 1.3.0 para 1.4.0

## Pré-requisito

Esta atualização deve ser aplicada sobre a versão 1.3.0 íntegra. Não aplique diretamente sobre a 1.2.1.

## Instalação

1. Feche qualquer execução em andamento no Simplifica/ES.
2. Faça uma cópia da pasta atual da extensão.
3. Extraia o ZIP diferencial sobre a pasta da versão 1.3.0, preservando as subpastas e substituindo os arquivos existentes.
4. Em `chrome://extensions`, clique em **Recarregar** na extensão.
5. Recarregue também a aba do Simplifica/ES.
6. Abra o painel e importe primeiro `examples/dossie-constituicao-v1.exemplo.json`.
7. Execute os cenários 14 a 16 de `HOMOLOGACAO.md` antes de usar uma saída real do sistema gerador.

## Arquivos substituídos

- `manifest.json`
- `package.json`
- `sidepanel.html`
- `sidepanel.js`
- `styles/sidepanel.css`
- `test/package.test.js`
- `README.md`
- `HOMOLOGACAO.md`
- `CHANGELOG.md`

## Arquivos novos

- `lib/dossier.js`
- `schemas/dossie-jucees-v1.schema.json`
- `examples/dossie-constituicao-v1.exemplo.json`
- `test/dossier.test.js`
- `DOSSIE-JSON.md`
- `ATUALIZACAO-1.4.0.md`

## Verificação técnica

Com Node.js 18 ou superior, execute `npm test` na pasta completa da extensão. O resultado esperado para a versão 1.4.0 é de 74 testes aprovados e zero falhas.

## Retorno à versão anterior

Se houver problema de interface, restaure a cópia da pasta 1.3.0 e recarregue a extensão. Esta atualização não migra nem altera permanentemente o estado do dossiê, pois o JSON completo permanece apenas em memória.
