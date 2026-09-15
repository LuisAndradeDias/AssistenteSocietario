# JUCEES Assistente — Contexto Mestre do Projeto

**Atualização:** 15 de setembro de 2026  
**Base funcional homologada:** CNAEs + `exerceNoEndereco` no cenário real de 29 atividades  
**Versão candidata integrada:** 1.8.0 — baseline executável da abertura LTDA  
**Observação:** módulos além de CNAEs/endereço permanecem candidatos até homologação na tela real; a base CNAE local continua parcial, mas CNAE manual ausente é validado pelo portal e não tratado como whitelist.

Este arquivo é a fonte de continuidade do projeto e deve acompanhar o pacote estável.

---

## 1. Instrução para um novo chat

> Leia integralmente o Contexto Mestre do JUCEES Assistente. Continue a partir da candidata integrada 1.8.0, preservando CNAEs + `exerceNoEndereco` como módulos homologados. Nunca selecione controles pela posição nem invente seletores. Avançar/Próximo/Prosseguir/Continuar podem ser automatizados somente após checkpoint aprovado e opt-in do usuário; salvamento, transmissão, assinatura, geração de taxa e protocolo permanecem proibidos. Novas telas usam a baseline executável e permanecem fail-closed até homologação no DOM real.

Nunca fornecer senha gov.br, certificado digital, token, protocolo sigiloso ou dados pessoais desnecessários.

---

## 2. Objetivo geral

Construir gradualmente uma extensão local do Chrome que importe um dossiê JSON e auxilie o preenchimento de processos no Simplifica/ES e na JUCEES:

- Viabilidade;
- Constituição de Sociedade Empresária Limitada;
- Alteração Contratual de Sociedade Empresária Limitada;
- conferência antes do avanço manual;
- acompanhamento das normas vigentes da JUCEES e do DREI.

O desenvolvimento ocorre em módulos pequenos, testáveis e homologados na página real.

### Escopo implementado até a candidata 1.8.0

- CNAEs principal/secundários e `exerceNoEndereco` preservados como módulos homologados;
- CNAE manual não depende de dossiê nem de presença na base local;
- Objeto da Empresa e Objeto do Estabelecimento implementados como candidatos, com conflito sem sobrescrita e confirmação exata;
- baseline executável com 38 etapas de abertura, Viabilidade, FCN, registro e pós-registro;
- motor genérico de campos com identificação semântica, confirmação e fail-closed;
- Tipo de Unidade e Forma de Atuação em modo assistido por dado explícito;
- motor dinâmico de Perguntas Complementares;
- checkpoint por etapa e histórico de análise em `storage.session`;
- dossiê opcional ampliado, com correção manual no painel;
- ações irreversíveis continuam bloqueadas;
- 147 testes automatizados na candidata 1.8.0.

### Ainda depende de homologação/mapeamento real

- seletores/estrutura definitiva das telas documentais da Viabilidade anteriores a Atividades;
- coleções complexas de QSA, administradores, representantes, integralizações, assinantes e documentos;
- telas de taxa, contrato, assinaturas, protocolo e pós-registro, que permanecem conferência/manual;
- qualquer campo que o motor reconheça apenas com confiança moderada.

---

### Atualização operacional de 15/09/2026

- Side Panel passa a ser modular: Fluxo de abertura, CNAEs, Objetos, Perguntas e Dossiê;
- o usuário escolhe qual ferramenta deseja visualizar/usar;
- Fluxo automático de abertura é opt-in e pode preencher campos seguros, conferir e navegar;
- decisões manuais continuam humanas, mas podem ser conferidas pelo motor depois de marcadas no portal;
- a navegação automática fica restrita a Abertura/Viabilidade e falha fechada diante de botão duplicado, etapa especializada, conflito ou pendência;
- ações irreversíveis continuam fora da automação.

## 3. Princípios obrigatórios

1. Fluidez é objetivo permanente, sem sacrificar confirmação.
2. Desenvolver e homologar uma etapa por vez.
3. Obter captura ou HTML sanitizado da página real antes de criar seletores.
4. **Avançar/Próximo/Prosseguir/Continuar** podem ser clicados automaticamente somente no Fluxo de abertura, com opt-in, etapa reconhecida com alta confiança, checkpoint aprovado e um único controle elegível. **Salvar**, **Gravar**, **Enviar**, **Finalizar**, **Concluir**, **Transmitir**, **Assinar**, **Protocolar** e **Gerar Taxa** permanecem proibidos.
5. Nunca substituir silenciosamente a atividade principal.
6. Nunca escolher um resultado por ser o primeiro da lista.
7. Exigir uma única opção isolada com código completo e descrição oficial.
8. Recusar contêiner que agrupe dois ou mais códigos.
9. Se duas opções forem integralmente equivalentes, marcar `ambiguous` e não clicar.
10. Confirmar a inclusão somente pelo cartão da seção correta, com código e pergunta do endereço.
11. Interromper diante de ambiguidade, divergência ou mudança estrutural.
12. Manter revisão humana antes da mudança de etapa.
13. Não coletar senhas, certificados, tokens ou segredos.
14. Não armazenar URL completa, protocolo, query string ou fragmento.
15. Rejeitar campos JSON desconhecidos.
16. Impedir publicação com zero testes.
17. Criar fixture HTML sanitizada para cada erro real observado.
18. Preservar timeouts máximos e confirmação final nos perfis rápidos.
19. Não usar permissões amplas ou artifícios para burlar o gerenciamento de segundo plano do Chrome.

---

## 4. Histórico das versões estáveis

### 1.1.0 a 1.2.1 — módulo CNAE inicial

- painel lateral e fila;
- clique no elemento interno do autocomplete;
- digitação gradual;
- tabela oficial CNAE 2.3 incorporada;
- comparação de descrição;
- reconhecimento do cartão pela pergunta do endereço.

### 1.3.0 — fundação endurecida

- suíte restaurada e ampliada para 51 casos;
- bloqueio de suíte vazia;
- cartão mínimo exato e papéis principal/secundário;
- pausa, retomada e recuperação conservadora;
- remoção da permissão `tabs`;
- caminho sanitizado e fixtures HTML.

### 1.4.0 — dossiê JSON

- esquema estrito `dossie-jucees/v1`;
- importação exclusivamente local;
- resumo e alertas;
- transferência explícita dos CNAEs;
- 74 testes.

### 1.4.1 — fluidez

- perfis Conservadora, Equilibrada e Rápida;
- Equilibrada como padrão;
- limites seguros de tempo;
- timeouts máximos de 18 s para sugestão e 8,5 s para cartão preservados;
- 83 testes.

### 1.4.2 — múltiplas sugestões e segundo plano

- cada opção do autocomplete é analisada isoladamente;
- seleção exige simultaneamente código completo e descrição oficial;
- contêiner com mais de um CNAE é recusado;
- duplicidade de opção exata gera `ambiguous`, sem escolha pela ordem;
- fixture sanitizada do caso `4761-0/01`, `/02` e `/03`;
- aba marcada como `autoDiscardable: false` somente durante a fila;
- estado anterior de descarte restaurado no encerramento ou recuperação;
- última leitura do DOM executada mesmo após temporizador restringido em segundo plano;
- sem novas permissões `tabs` ou `power`;
- 94 testes.

### 1.5.0 — respostas de endereço por CNAE — candidata

- captura real confirmou pergunta e opções `Sim/Não` no cartão da atividade;
- dossiê transfere `exerceNoEndereco` junto com cada CNAE;
- `true` solicita Sim, `false` solicita Não e `null` permanece manual;
- o cartão deve conter um único CNAE e o papel correto;
- exige exatamente um controle Sim e um Não dentro do mesmo cartão;
- rótulos/semântica identificam a opção, nunca índice global;
- resposta já correta é apenas confirmada;
- resposta contrária existente é preservada e gera `address_conflict`;
- confirmação final após clique é obrigatória;
- fixture sanitizada derivada da evidência visual;
- suíte da reconstrução: 69 testes.

---

## 5. Perfis de velocidade

| Perfil | Tecla | Após digitação | Sugestão estável | Entre CNAEs |
|---|---:|---:|---:|---:|
| Conservadora | 260 ms | 950 ms | 850 ms | 1.900 ms |
| Equilibrada | 170 ms | 750 ms | 750 ms | 1.300 ms |
| Rápida | 110 ms | 650 ms | 700 ms | 950 ms |

Equilibrada permanece o padrão. A velocidade nunca reduz a exigência de correspondência exata ou os timeouts máximos.

---

## 6. Fluxo da candidata 1.5.0

1. Importar opcionalmente o dossiê JSON e transferir os CNAEs com `exerceNoEndereco`.
2. Selecionar a velocidade.
3. Normalizar o código e obter a descrição oficial local.
4. Verificar cartões existentes e seus papéis.
5. Impedir conflito de principal.
6. Localizar o campo da seção correta.
7. Digitar e aguardar o autocomplete estabilizar.
8. Analisar todas as opções individualmente.
9. Descartar opções com código diferente, descrição divergente ou múltiplos códigos no mesmo contêiner.
10. Exigir exatamente uma correspondência de código e descrição.
11. Clicar somente no elemento interativo vinculado à opção exata.
12. Confirmar o cartão final da seção correta.
13. Se o CNAE estiver confirmado, localizar exatamente os controles da pergunta de endereço dentro daquele cartão.
14. Se `exerceNoEndereco` for `true`/`false`, aplicar apenas a resposta explícita; se `null`, deixar manual.
15. Se a resposta oposta já estiver marcada, preservar e interromper para revisão.
16. Após clique, reler o cartão e confirmar o estado final.
17. Persistir o resultado mínimo e seguir para o próximo item.
18. Encerrar para revisão humana, sem avançar a etapa.

---

## 7. Execução minimizada

- o content script continua a fila independentemente de o painel permanecer visível;
- no início, o service worker marca a aba como não descartável;
- ao concluir, parar ou recuperar recarregamento, restaura a política anterior;
- temporizadores em aba minimizada podem ser limitados pelo Chrome ou pelo sistema operacional;
- as esperas fazem uma leitura final do DOM ao retornar, evitando falso `not_found` por atraso;
- a execução pode ficar mais lenta ou temporariamente congelada, retomando quando o Chrome liberar a página;
- fechar o Chrome, suspender o computador ou navegar a aba pode interromper a execução;
- não existe API legítima que force uma aba minimizada a permanecer visivelmente ativa;
- não serão usados áudio oculto, debugger, WebSocket artificial ou permissão `power` para contornar políticas do navegador.

---

## 8. Estados da fila

- `pending`, `searching`, `added`, `duplicate`;
- `invalid`, `not_found`, `description_mismatch`;
- `ambiguous`, `unverified`, `principal_conflict`, `screen_error`;
- endereço: `address_pending`, `address_applying`, `address_verified`, `address_manual`, `address_conflict`, `address_ambiguous`, `address_screen_error`, `address_unverified`, `address_skipped`.

Falha no principal, ambiguidade, conflito, divergência, tela incompatível, inclusão não confirmada ou conflito/ambiguidade na resposta de endereço interrompem a fila para revisão.

---

## 9. Estrutura técnica

```text
jucees-cnae-assistente/
├── manifest.json
├── background.js
├── sidepanel.html
├── sidepanel.js
├── styles/sidepanel.css
├── content/
│   ├── cnae-automation.js
│   ├── content.js
│   └── content.css
├── lib/
│   ├── cnae.js
│   ├── dossier.js
│   ├── performance.js
│   ├── privacy.js
│   ├── run-state.js
│   └── tab-protection.js
├── data/cnae-subclasses-2.3.js
├── schemas/dossie-jucees-v1.schema.json
├── examples/dossie-constituicao-v1.exemplo.json
├── test/
├── README.md
├── DOSSIE-JSON.md
├── HOMOLOGACAO.md
└── CHANGELOG.md
```

Permissões: `storage`, `sidePanel` e acesso restrito ao Simplifica/ES. Não há `tabs`, `power`, acesso a todos os sites, telemetria ou rede externa.

---

## 10. Qualidade e instalação

A reconstrução 1.4.2 usada como base passou em **52 de 52 testes** disponíveis após a perda da instalação original. A candidata 1.5.0 passa em **69 de 69 testes** automatizados. Os 94 testes históricos da 1.4.2 original permanecem registrados apenas como referência histórica, pois nem todos os arquivos originais sobreviveram à perda da base.

### Homologação 1.5.0

1. Manter a pasta 1.4.2 reconstruída como rollback.
2. Instalar a pasta completa 1.5.0 em `chrome://extensions`.
3. Recarregar a página do Simplifica/ES.
4. Testar primeiro um CNAE com `true` e depois o `4789-0/07` com `false`.
5. Testar conflito com resposta oposta já marcada.
6. Somente depois executar os 29 CNAEs.
7. Considerar 1.5.0 estável apenas após os cenários 21 a 27 de `HOMOLOGACAO.md`.

---

## 11. Próximos passos

1. Homologar 1.5.0 com um CNAE `true`.
2. Homologar `4789-0/07` com `false`.
3. Homologar preservação de resposta contrária existente.
4. Executar a fila completa de 29 CNAEs.
5. Depois mapear Objeto da Empresa e Objeto do Estabelecimento.
6. Em paralelo, restaurar a tabela CNAE 2.3 completa antes de uso amplo.
7. Na sequência mapear tipo de unidade, forma de atuação e perguntas finais.
8. Fechar a Viabilidade com relatório de conferência antes de iniciar Constituição LTDA.

---

## 12. Decisões permanentes

- fluidez é objetivo transversal;
- Equilibrada é o perfil padrão;
- o dossiê JSON será a fonte produzida pelo sistema externo do usuário;
- a extensão não infere decisões contábeis ou jurídicas ausentes;
- novos seletores dependem da tela real sanitizada;
- respostas Sim/Não só podem ser automatizadas quando vierem explicitamente do dossiê;
- resposta contrária previamente marcada nunca é sobrescrita silenciosamente;
- entregas podem conter apenas os arquivos modificados;
- publicação pública será decidida futuramente.

---

## 13. Fontes oficiais

- JUCEES: https://jucees.es.gov.br/passo-a-passo
- Manuais JUCEES: https://jucees.es.gov.br/manuais-e-procedimentos
- DREI: https://www.gov.br/empresas-e-negocios/pt-br/drei
- IBGE/CONCLA: https://servicodados.ibge.gov.br/api/docs/cnae?versao=2
- CNAE 2.3: https://ftp.ibge.gov.br/Informacoes_Gerais_e_Referencia/Classificacoes/CNAE/cnae2_3/

Reconfirmar regras temporais nas fontes oficiais antes de implementar mudanças cadastrais, fiscais ou societárias.
