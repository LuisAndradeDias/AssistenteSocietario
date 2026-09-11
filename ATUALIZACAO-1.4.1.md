# Atualização diferencial — 1.4.0 para 1.4.1

## Objetivo

Melhorar a fluidez da inclusão de CNAEs com três perfis de velocidade, sem reduzir os limites máximos de espera nem a exigência de confirmação pelo cartão exato.

## Instalação

1. Confirme que a extensão instalada está na versão 1.4.0.
2. Interrompa qualquer fila em andamento e faça uma cópia da pasta atual.
3. Extraia o ZIP diferencial sobre a pasta da extensão, preservando as subpastas.
4. Em `chrome://extensions`, clique em **Recarregar**.
5. Recarregue a aba do Simplifica/ES.
6. Comece pelo perfil **Equilibrada** e execute os cenários 17 e 18 de `HOMOLOGACAO.md`.

## Arquivos substituídos

- `manifest.json`
- `package.json`
- `sidepanel.html`
- `sidepanel.js`
- `content/content.js`
- `content/cnae-automation.js`
- `test/package.test.js`
- `README.md`
- `HOMOLOGACAO.md`
- `CHANGELOG.md`

## Arquivos novos

- `lib/performance.js`
- `test/performance.test.js`
- `ATUALIZACAO-1.4.1.md`

## Resultado esperado

- versão exibida no manifesto: 1.4.1;
- perfil inicial: Equilibrada;
- 83 testes aprovados e zero falhas;
- nenhuma mudança nas regras de confirmação, bloqueio de avanço ou persistência do dossiê.
