# Fixtures HTML sanitizados

Estes arquivos reproduzem somente a estrutura necessária da etapa de CNAEs observada no Simplifica/ES.
Nomes, documentos, protocolos, tokens, URLs de processo e demais dados pessoais foram removidos.

Ao registrar uma nova regressão:

1. conservar apenas o menor trecho HTML que reproduza o comportamento;
2. substituir identificadores do portal por valores genéricos;
3. remover atributos e textos que não sejam necessários ao teste;
4. revisar o arquivo com `npm test` antes de incluí-lo no pacote.
