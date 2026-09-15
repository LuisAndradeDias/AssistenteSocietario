# Dossiê JUCEES Assistente 1.0.0 — uso na extensão 1.7.0

O dossiê continua **opcional**. Ele é uma fonte estruturada de dados para reduzir digitação, mas nenhuma etapa depende obrigatoriamente dele: o usuário pode informar ou corrigir valores manualmente no painel.

O arquivo é processado localmente, limitado a 1 MiB e identificado por `schemaVersion: "1.0.0"`. O dossiê completo não é persistido em `chrome.storage.local`; rascunhos operacionais temporários usam `chrome.storage.session` quando aplicável.

## CNAEs

- CNAEs usam sete dígitos.
- `exerceNoEndereco` aceita `true`, `false` ou `null`.
- `true`/`false` podem ser aplicados somente no cartão exato do CNAE e precisam ser confirmados no DOM.
- `null` significa decisão/resposta manual.
- Um CNAE manual ou vindo do dossiê **não é bloqueado apenas por estar ausente da base CNAE local**. Nessa situação a ausência local gera alerta, e a automação depende da validação inequívoca do código/descrição no portal e do cartão final.

## Demais etapas

A linha 1.7.0 aceita grupos de dados compatíveis com a baseline da abertura, incluindo, quando fornecidos, solicitante, estabelecimento/endereço, objetos, administradores, responsável legal, cláusulas, dados de FCN, consulta, registro, documentos, assinantes e decisões explícitas.

Esses grupos não autorizam inferência profissional. Campos sem dado podem permanecer `null`/ausentes e serão tratados como manuais. Dados manuais digitados no painel podem sobrepor o valor do dossiê **somente para a sessão de trabalho da etapa**, sem reescrever silenciosamente o arquivo importado.

## Perguntas complementares

Perguntas dinâmicas podem ser fornecidas por chave estável ou pelo texto exato reconhecido na tela. Valores booleanos `true`/`false` podem ser apresentados como Sim/Não quando essas opções existirem. Se a pergunta ou as opções mudarem, a resposta anterior não deve ser aplicada por posição.

## Segurança

Campos desconhecidos em áreas críticas continuam sujeitos à validação do schema/validador. Conflitos com valor já existente na tela não são sobrescritos automaticamente.

Nenhuma importação ou dado do dossiê autoriza a extensão a **Avançar, Salvar, Enviar, Finalizar, Concluir, Transmitir, Protocolar, Assinar ou Gerar Taxa**. Essas ações permanecem manuais.
