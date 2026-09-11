# JUCEES Assistente 1.5.0 — candidato de homologação

Extensão local do Chrome para preenchimento assistido da etapa de atividades da Viabilidade no Simplifica/ES.

A versão 1.5.0 amplia a fila de CNAEs: quando o dossiê JSON informa `exerceNoEndereco` como `true` ou `false`, a extensão tenta aplicar **Sim** ou **Não** somente no cartão exato daquele CNAE e confirma o estado final. `null` permanece manual.

> **Status:** 1.5.0 é candidata à homologação real. A base anterior 1.4.2 permanece como rollback até a confirmação em tela real.

## O que faz

- importa e valida localmente o dossiê `dossie-jucees/v1`;
- transfere CNAEs e o mapa mínimo `CNAE -> exerceNoEndereco` após ação explícita do usuário;
- valida CNAE e descrição na base local disponível;
- distingue atividade principal e secundárias;
- digita gradualmente e aguarda estabilização do autocomplete;
- só aceita uma sugestão isolada com código completo e descrição oficial;
- confirma a inclusão apenas pelo cartão da seção correta, com código exato e a pergunta do endereço;
- para diante de ambiguidade, descrição divergente, conflito de principal ou confirmação insuficiente;
- mesmo quando uma secundária não localizada é deixada para o restante da fila prosseguir, o encerramento final vira **Revisão necessária**, nunca **Concluída**;
- para cada CNAE confirmado, procura os controles `Sim/Não` **dentro do mesmo cartão**;
- exige exatamente um controle `Sim` e um `Não`, identificados por rótulo/semântica — nunca por posição global;
- se a resposta pedida já estiver marcada, apenas confirma;
- se a resposta oposta já estiver marcada, **não sobrescreve**: gera conflito e pausa para revisão;
- se ambos estiverem vazios, aciona somente a resposta explícita do dossiê e relê o estado final;
- se `exerceNoEndereco` for `null`, não clica e marca a resposta como manual;
- mantém perfis Conservadora, Equilibrada e Rápida;
- protege temporariamente a aba contra descarte durante a fila.

Ela **não** avança, salva, envia, assina, transmite, finaliza ou protocola processos.

## Instalação

1. Extraia o ZIP para uma pasta permanente, por exemplo `C:\jucees-assistente`.
2. Abra `chrome://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta que contém diretamente `manifest.json`.
6. Recarregue a página do Simplifica/ES após instalar ou atualizar a extensão.

## Uso com o dossiê de teste

1. Abra a etapa com **Atividade Principal** e **Atividade(s) Secundária(s)**.
2. Abra o painel da extensão.
3. Importe `examples/dossie-constituicao-v1.exemplo.json` ou o dossiê de homologação equivalente.
4. Confira o resumo e clique em **Usar CNAEs e respostas do dossiê**.
5. Clique em **Analisar tela**.
6. Clique em **Adicionar atividades e respostas**.
7. Observe os primeiros CNAEs e confirme que a resposta de endereço foi marcada no cartão correspondente.
8. No cenário de homologação atual, 28 CNAEs solicitam **Sim** e o CNAE `4789-0/07` solicita **Não**.
9. Ao final, revise visualmente todos os cartões antes de avançar manualmente.

## Regra de segurança dos rádios

A automação não usa `querySelectorAll(...)[0]` para significar Sim nem `[1]` para significar Não. O fluxo é:

1. localizar um único cartão da seção correta;
2. exigir que o cartão contenha somente o CNAE alvo;
3. confirmar a pergunta `Exerce atividade no endereço informado?`;
4. localizar os controles sem sair daquele cartão;
5. exigir exatamente um `Sim` e um `Não` por rótulo/semântica;
6. ler o estado atual;
7. preservar resposta contrária já existente;
8. após um novo clique, reler e confirmar o estado final.

Qualquer ambiguidade resulta em parada para revisão.

## Dossiê e privacidade

- O arquivo JSON completo é processado localmente e não é enviado a servidor externo.
- O dossiê completo não é gravado em `chrome.storage.local`.
- O rascunho persiste somente os CNAEs, principal e o mapa mínimo de respostas de endereço necessário à continuidade local do preenchimento.
- O estado da fila guarda somente rota sanitizada, sem URL completa, query string ou fragmento.
- Não há telemetria, `fetch`, WebSocket, código remoto ou acesso geral a sites.
- Nunca forneça senha gov.br, certificado digital, senha de certificado, token, MFA ou cookie de sessão à extensão.

## Limitação herdada da recuperação 1.4.2

A instalação original 1.4.1/1.4.2 foi perdida e esta linha foi reconstruída a partir do diferencial e do Contexto Mestre. A tabela completa original de 1.332 subclasses CNAE não estava no material recuperado. A cópia atual contém somente os CNAEs recuperados com segurança, incluindo todos os 29 códigos do cenário de homologação. CNAE ausente é bloqueado em modo **fail-closed**; nenhuma descrição é inventada.

Antes de uso amplo com outros CNAEs, a base oficial completa CNAE 2.3 deve ser restaurada e regressada.

## Desenvolvimento e testes

Requer Node.js 18+:

```bash
npm test
```

A candidata 1.5.0 passa em **69 testes automatizados** nesta reconstrução. Há regressões específicas para resposta `true`, `false`, `null`, resposta já correta, conflito com resposta oposta, duplicidade/ambiguidade de controles, estado inválido e proibição de seleção por posição global.

Consulte `HOMOLOGACAO.md` antes de considerar a versão estável.
