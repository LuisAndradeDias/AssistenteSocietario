# Recuperação da versão 1.4.2

Este pacote foi reconstruído em 2 de setembro de 2026 porque a instalação-base 1.4.1 foi perdida. Os arquivos presentes no ZIP diferencial 1.4.1 -> 1.4.2 foram preservados. Os arquivos-base ausentes foram reimplementados a partir do Contexto Mestre e dos contratos observáveis do código/testes.

## Limitação consciente da base CNAE
A tabela JS completa de 1.332 subclasses da extensão original não estava no ZIP diferencial recuperado. Para não inventar dados oficiais, esta reconstrução contém somente os CNAEs que puderam ser recuperados de fontes já existentes no projeto e necessários para o cenário atual de homologação. Qualquer código ausente é BLOQUEADO (fail-closed) e nunca recebe descrição presumida.

Antes de usar esta reconstrução em produção com CNAEs fora da lista recuperada, restaure a tabela oficial completa `data/cnae-subclasses-2.3.js` a partir da CNAE 2.3 IBGE/CONCLA e rode novamente a suíte.

## Segurança preservada
- Manifest V3.
- `storage` + `sidePanel`; sem permissão `tabs` declarada.
- host restrito a Simplifica/ES.
- sem rede externa no código executável.
- autocomplete nunca escolhido pela posição.
- código e descrição exatos obrigatórios.
- ambiguidade interrompe a fila.
- sem Avançar/Salvar/Enviar/Finalizar/Concluir/Transmitir/Protocolar automáticos.
