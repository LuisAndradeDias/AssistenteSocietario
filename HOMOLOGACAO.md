# Roteiro de homologação no Simplifica/ES

O ambiente autenticado não deve ser transmitido durante a homologação. Use um protocolo descartável ou interrompa antes de salvar.

## Cenários essenciais

1. **Formato e duplicidade**
   - informe o mesmo código como `6201-5/01` e `6201501`;
   - confirme que apenas um item aparece na fila.

2. **Principal e secundárias**
   - selecione o primeiro código como principal;
   - inclua duas secundárias;
   - confirme os três códigos e os papéis na tela.

3. **Principal já existente**
   - mantenha uma principal diferente no portal;
   - tente definir outra principal na extensão;
   - confirme que a fila para sem substituir a existente.

4. **Mesmo CNAE em papel diferente**
   - mantenha o CNAE como secundário no portal e solicite-o como principal na extensão;
   - confirme o estado **Conflito**, sem tratá-lo como duplicidade simples e sem alterar seu papel;
   - repita com um CNAE principal solicitado como secundário e confirme que o papel principal é preservado.

5. **Código já adicionado**
   - execute novamente um código visível na lista;
   - confirme o estado **Já existente**, sem duplicação.

6. **Código não localizado**
   - informe sete dígitos que o portal não reconheça;
   - confirme o estado **Não localizado** e a continuação segura da fila.

7. **Pausa, retomada e parada**
   - pause durante uma fila;
   - confirme que o item em curso termina sua verificação e que o próximo não começa;
   - retome e confirme que não há repetição do item concluído;
   - depois teste **Parar** e confirme o estado persistido.

8. **Recuperação após recarregamento**
   - recarregue a página durante uma execução e mantenha o painel aberto;
   - confirme que a execução muda para **Interrompida**, o item em busca vira **Revisar** e nenhum item continua automaticamente;
   - execute **Analisar tela**, confira os cartões já visíveis e só então inicie uma nova fila.

9. **Bloqueio de transmissão**
   - ao concluir a fila, confirme que a extensão não acionou Avançar, Salvar, Enviar, Finalizar, Protocolar ou Transmitir.

10. **Digitação e seção correta**
   - observe um CNAE principal e um secundário;
   - confirme a digitação gradual dos sete dígitos;
   - confirme que o secundário nunca é digitado no campo da atividade principal.

11. **Conferência da descrição**
   - confirme que a descrição apresentada no portal coincide com a descrição IBGE mostrada no painel;
   - em caso de diferença, confirme que a fila para sem clicar na sugestão.

12. **Confirmação pelo cartão exato**
   - deixe uma sugestão do autocomplete visível sem selecioná-la;
   - confirme que a presença do código na sugestão, a mudança do campo ou o fechamento da lista não gera estado **Adicionado**;
   - confirme que só o cartão da seção correta, com código exato e a pergunta do endereço, encerra a verificação.

13. **Privacidade do estado**
   - abra uma rota do portal com consulta e fragmento, se houver;
   - inspecione `chrome.storage.local` e confirme que `pagePath` não contém `https://`, domínio, `?`, `#` ou identificadores longos reais;
   - confirme no manifesto que a permissão `tabs` não está declarada.

14. **Dossiê JSON válido**
   - importe `examples/dossie-constituicao-v1.exemplo.json`;
   - confirme o selo **Válido** (ou **Válido com alertas**, se o arquivo tiver alertas) e o resumo sem documentos completos;
   - clique em **Usar CNAEs e respostas** e confirme principal `4751-2/01`, 28 secundárias e o resumo de 29 respostas de endereço;
   - confirme que nenhum campo do Simplifica/ES foi alterado antes de **Adicionar atividades e respostas**.

15. **Dossiê JSON inválido**
   - teste versão diferente de `1.0.0`, CNAE malformado/duplicado, CNPJ inválido e capital incompatível;
   - confirme que os erros indicam o caminho do campo e que o botão de usar CNAEs permanece desabilitado;
   - teste arquivo acima de 1 MiB e confirme a recusa.

16. **Memória e descarte do dossiê**
   - importe um arquivo válido e clique em **Descartar**;
   - confirme que resumo, mensagens e referência ao arquivo desaparecem;
   - inspecione `chrome.storage.local` e confirme que o dossiê completo não foi armazenado.

17. **Perfil Equilibrado**
   - selecione **Equilibrada** e inclua um principal e duas secundárias;
   - confirme digitação fluida, sugestão estável, cartão exato e intervalo entre os itens;
   - feche e reabra o painel e confirme que o perfil permaneceu selecionado.

18. **Perfil Rápido e contingência**
   - use **Rápida** com poucos CNAEs em uma conexão estável;
   - confirme que nenhum item é aceito antes do cartão final;
   - se houver oscilação ou “Nenhum resultado” temporário, interrompa, selecione **Conservadora**, analise novamente e repita;
   - registre qual perfil foi adequado para o ambiente real.

19. **Múltiplas sugestões após o código completo**
   - use um código como `4761-0/01` quando o portal também apresentar `4761-0/02` e `4761-0/03`;
   - confirme que somente `4761-0/01 — Comércio varejista de livros` é acionado;
   - confirme que a extensão compara o código completo e a descrição oficial, e não a posição da opção;
   - se duas opções idênticas aparecerem, confirme o estado **Ambíguo** e a ausência de clique.

20. **Janela minimizada**
   - inicie uma fila curta e confirme no painel a mensagem de aba protegida contra descarte;
   - minimize a janela durante a digitação, sem trocar a página nem suspender o computador;
   - aguarde a conclusão, admitindo que o Chrome pode tornar a execução mais lenta em segundo plano;
   - restaure a janela e confirme cartões, papéis e descrições;
   - pare uma segunda fila e confirme que a proteção é encerrada sem adicionar permissões ao manifesto.

21. **Resposta Sim por CNAE**
   - use o dossiê de homologação atual;
   - após aplicar o dossiê, reduza temporariamente a lista para apenas o CNAE principal `4751-2/01`; a resposta desse código deve permanecer associada;
   - confirme que a extensão localiza o cartão exato, identifica `Sim` e `Não` dentro dele, marca **Sim** e relê o estado marcado;
   - confirme no painel `Endereço: Resposta Sim marcada e confirmada...`.

22. **Resposta Não por CNAE**
   - após aplicar novamente o dossiê, deixe apenas `4789-0/07` na lista e selecione **Nenhuma — adicionar todas como secundárias**; o dossiê contém `exerceNoEndereco: false`;
   - confirme que **Não** é marcado somente no cartão desse CNAE e que nenhum outro rádio da página é alterado.

23. **Resposta já correta**
   - marque manualmente no portal a mesma resposta solicitada pelo dossiê;
   - execute novamente o item;
   - confirme que a extensão apenas reconhece e confirma o estado, sem alternar o rádio.

24. **Conflito com resposta contrária**
   - em um CNAE cujo dossiê pede `Sim`, marque manualmente `Não`;
   - execute a fila;
   - confirme `address_conflict`, pausa para revisão e preservação do `Não`;
   - repita invertendo as respostas.

25. **Resposta manual (`null`)**
   - em uma cópia do dossiê, altere um `exerceNoEndereco` para `null`;
   - confirme que o CNAE é incluído, nenhum rádio desse cartão é acionado e o painel informa preenchimento manual.

26. **Estrutura ambígua dos rádios**
   - somente em fixture sanitizada/teste, simule dois controles `Sim`, ausência de `Não` ou dois rádios marcados;
   - confirme que a extensão falha fechada e não tenta escolher por posição.

27. **Fila completa de endereço**
   - após validar isoladamente os cenários 21 e 22, execute o dossiê completo de 29 CNAEs;
   - resultado esperado: 28 respostas **Sim**, 1 resposta **Não** (`4789-0/07`) e 0 respostas manuais;
   - revise visualmente todos os cartões antes de avançar manualmente.

## Evidências a registrar

- data e identificação funcional da tela, sem copiar a URL autenticada completa;
- versão da extensão;
- códigos usados;
- resultado de cada item;
- captura da área de atividades, sem CPF, CNPJ, protocolo, senha, token, URL autenticada ou outros dados pessoais.

Se algum seletor não for reconhecido após mudança no portal, preserve somente uma captura e um HTML sanitizado do componente de atividades. Remova scripts, estilos desnecessários, comentários do portal, valores de campos, atributos de sessão, URLs, protocolos, identificadores e dados empresariais antes de adicionar o arquivo a `test/fixtures/`.

## Cenários adicionais da candidata 1.7.0

28. **Objeto da Empresa / Estabelecimento — campos vazios**
   - abra a tela de Atividades;
   - informe textos curtos e inequívocos no painel;
   - clique em **Verificar campos** e depois **Aplicar objetos**;
   - confirme que ambos os textos aparecem exatamente, inclusive espaços e pontuação relevantes;
   - confirme que nenhum botão de avanço/salvamento é acionado.

29. **Objetos já idênticos**
   - deixe no portal exatamente os mesmos textos do painel;
   - aplique novamente;
   - confirme que a extensão apenas reconhece os valores como confirmados.

30. **Conflito de objetos**
   - preencha no portal texto diferente do solicitado;
   - clique em **Aplicar objetos**;
   - confirme **Revisão necessária** e que o conteúdo do portal não foi modificado.

31. **Reconhecimento da etapa**
   - em cada nova tela, clique em **Analisar etapa**;
   - confirme código e nome da etapa exibidos;
   - se houver confiança moderada ou tela não reconhecida, não aplique dados; registre print e HTML sanitizado.

32. **Tipo de Unidade**
   - na tela real, informe no painel somente a opção efetivamente escolhida pelo usuário;
   - aplique dados seguros;
   - confirme que nenhum checkbox é selecionado por posição e que o estado final `checked` é relido;
   - se já houver opção diferente marcada, confirme conflito sem desmarcação.

33. **Forma de Atuação**
   - repita o cenário anterior com uma ou mais formas de atuação;
   - confirme correspondência exata de rótulo e preservação de seleção divergente.

34. **Perguntas Complementares dinâmicas**
   - clique em **Mapear perguntas**;
   - confirme que o painel reproduz o texto e as opções da tela;
   - responda somente algumas perguntas e deixe as demais como manual;
   - aplique e confirme `checked/selected` apenas das respostas explícitas;
   - altere uma pergunta em fixture/HTML de teste e confirme que a chave muda e a resposta antiga não é reaplicada automaticamente.

35. **Checkpoint da etapa**
   - clique em **Conferir etapa** após uma tela completa e depois com uma pendência;
   - confirme `Pronto para revisão` somente sem conflito conhecido;
   - confirme `Revisão necessária` quando houver campo não informado, não localizado ou divergente.

36. **Ações protegidas**
   - em telas que exibam Salvar, Avançar, Transmitir, Assinar, Protocolar ou Gerar Taxa;
   - confirme que o painel apenas informa a presença dessas ações e nunca as executa.

37. **Persistência somente de sessão dos novos rascunhos**
   - informe dados manuais em uma etapa e feche/reabra apenas o Side Panel: os rascunhos podem permanecer na sessão;
   - encerre a sessão do navegador ou use **Limpar extensão** e confirme a remoção;
   - verifique que o dossiê completo continua ausente de `chrome.storage.local`.


38. **Pré-validação transacional da tela**
   - em uma etapa genérica com pelo menos dois valores explícitos, deixe o primeiro campo vazio e preencha o segundo no portal com valor divergente;
   - clique em **Aplicar dados seguros** e confirme que o primeiro campo continua vazio: o conflito conhecido deve ser detectado antes da primeira alteração;
   - em Perguntas Complementares, prepare duas respostas e force a segunda pergunta/opção a ficar não reconhecível em fixture/HTML sanitizado;
   - confirme que nenhuma das duas respostas é aplicada durante o preflight;
   - falha ocorrida somente depois de um evento real deve interromper imediatamente qualquer ação posterior e exigir revisão.
