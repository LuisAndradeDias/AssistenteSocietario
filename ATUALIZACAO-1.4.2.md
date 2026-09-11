# Atualização diferencial — 1.4.1 para 1.4.2

## Objetivo

Impedir qualquer seleção baseada na primeira opção do autocomplete quando o portal apresenta vários CNAEs e tornar a fila resistente à minimização da janela, sem permissões amplas ou técnicas artificiais para burlar o gerenciamento do Chrome.

## Instalação

1. Confirme que a extensão instalada está na versão 1.4.1.
2. Interrompa qualquer fila e faça uma cópia da pasta atual.
3. Extraia o ZIP diferencial sobre a pasta da extensão, preservando as subpastas.
4. Em `chrome://extensions`, clique em **Recarregar**.
5. Recarregue a aba do Simplifica/ES.
6. Execute os cenários 19 e 20 de `HOMOLOGACAO.md`.

## Arquivos substituídos

- `manifest.json`
- `package.json`
- `background.js`
- `sidepanel.js`
- `content/content.js`
- `content/cnae-automation.js`
- `test/automation.test.js`
- `test/fixtures.test.js`
- `test/package.test.js`
- `README.md`
- `HOMOLOGACAO.md`
- `CHANGELOG.md`

## Arquivos novos

- `lib/tab-protection.js`
- `test/tab-protection.test.js`
- `test/fixtures/multiple-cnae-suggestions.html`
- `ATUALIZACAO-1.4.2.md`

## Resultado esperado

- versão 1.4.2;
- múltiplas opções diferentes não causam seleção do primeiro resultado;
- apenas uma correspondência simultânea de código e descrição pode ser acionada;
- opção exata duplicada interrompe a fila como ambígua;
- aba protegida contra descarte durante a fila e restaurada ao final;
- 94 testes aprovados;
- nenhuma permissão `tabs`, `power` ou acesso externo adicionado.
