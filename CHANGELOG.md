# Histórico de versões

## 1.5.0 — 2026-09-02 — candidata à homologação

- `exerceNoEndereco` passou a ser transferido do dossiê junto com os CNAEs;
- resposta aplicada somente dentro de um cartão exato com um único CNAE e papel confirmado;
- exigência de exatamente um controle `Sim` e um `Não` identificados semanticamente;
- nenhuma seleção por índice/posição global dos rádios;
- resposta já correta é apenas confirmada;
- resposta contrária existente gera `address_conflict` e é preservada;
- `null` permanece manual, sem clique;
- confirmação posterior ao clique obrigatória; falha gera `address_unverified`;
- fila não recebe selo verde quando qualquer CNAE termina sem cartão confirmado;
- estados adicionados: `address_pending`, `address_applying`, `address_verified`, `address_manual`, `address_conflict`, `address_ambiguous`, `address_screen_error`, `address_unverified` e `address_skipped`;
- fixture sanitizada derivada da captura visual dos rádios;
- suíte da reconstrução ampliada de 52 para 69 testes.

## 1.4.2 — 2026-09-02

- seleção do autocomplete endurecida para exigir uma única opção isolada com código completo e descrição oficial;
- contêineres que agrupam vários códigos deixam de ser candidatos clicáveis;
- duas opções integralmente equivalentes agora geram estado **Ambíguo**, sem escolha pela posição;
- adicionada fixture sanitizada do caso real `4761-0/01`, `/02` e `/03`;
- aba marcada como não descartável somente durante a execução e restaurada ao final;
- esperas revisadas para fazer uma última leitura do DOM após limitação de temporizadores em segundo plano;
- preservada a ausência da permissão ampla `tabs`;
- suíte ampliada de 83 para 94 testes automatizados.

## 1.4.1 — 2026-09-02

- adicionados perfis Conservador, Equilibrado e Rápido;
- definido Equilibrado como padrão para melhorar a fluidez sem eliminar esperas de estabilização;
- reduzidos somente os intervalos artificiais de digitação e entre CNAEs;
- preservados os limites máximos de 18 segundos para busca e 8,5 segundos para confirmação do cartão;
- parâmetros de tempo limitados novamente no content script para impedir valores inseguros;
- perfil escolhido persistido localmente como configuração;
- suíte ampliada de 74 para 83 testes automatizados.

## 1.4.0 — 2026-09-02

- criado o contrato versionado `Dossiê JUCEES Assistente 1.0.0` em JSON Schema 2020-12;
- adicionada importação local de arquivos JSON de até 1 MiB;
- incluídas validações de versão, campos desconhecidos, UF, CPF/CNPJ, CNAEs, quotas, capital, administradores e revisão humana obrigatória;
- adicionado resumo seguro com documentos mascarados e alertas por caminho de campo;
- dossiê completo mantido somente em memória e descartado ao fechar ou recarregar o painel;
- transferência dos CNAEs para a fila somente após ação explícita do usuário;
- nenhum outro dado importado é aplicado ao Simplifica/ES nesta versão;
- suíte ampliada de 51 para 74 testes automatizados.

## 1.3.0 — 2026-09-02

- restaurada e ampliada a suíte para 51 testes automatizados;
- incluída guarda de `pretest` que falha quando não existem arquivos `*.test.js`;
- confirmação restrita ao cartão exato da seção solicitada, com código CNAE e pergunta do endereço;
- distinção obrigatória entre CNAE principal e secundário antes da decisão de duplicidade;
- corrigidos pausa, retomada, parada e recuperação conservadora após recarregamento;
- removida a permissão ampla `tabs` do manifesto;
- substituído o armazenamento de URL por rota sanitizada, sem origem, consulta ou fragmento;
- adicionadas capturas HTML sanitizadas e testes de regressão estrutural;
- registrado o dossiê JSON versionado como próxima integração, ainda não implementada.

## 1.2.1

- versão-base recebida para endurecimento da fundação.
