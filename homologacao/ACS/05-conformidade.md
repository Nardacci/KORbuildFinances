# ACS · 05 — Conformidade (LGPD e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Dados coletados no cadastro | nome e país (descartados), e-mail, senha (`signup.js:51-55`; `auth.js:25-28`) | Coleta sem uso = contraria minimização; mas o dado não é armazenado | REQ-ACS-02: ou usar ou não pedir |
| Dados coletados no assistente | nome, país, moeda, conta e saldo, receita, objetivo, aporte (`app.js:24`) | Necessários para o serviço (base legal: execução de contrato) | Documentar finalidade na Política de Privacidade |
| Consentimento / termos | caixa obrigatória sem link e sem registro (`signup.html:13`) | Inadequado: não há prova do aceite nem do conteúdo aceito | REQ-ACS-03 |
| Transparência | nenhuma Política de Privacidade no repositório | Lacuna (LGPD art. 9) | REQ-ACS-03 |
| Direitos do titular (acesso, correção, eliminação, portabilidade) | correção: revisão e telas de edição; acesso: telas; eliminação e portabilidade: inexistentes | Parcial | REQ-BD-10 |
| Segurança da credencial | senha mínima 6; sem 2FA; sem recuperação de senha | Abaixo da boa prática | ACS-S03, ACS-S04 |
| Dados no dispositivo | rascunho em `localStorage` até logout | Aceitável com aviso; ideal limpar ao concluir | ACS-S06 |
| Acesso administrativo a dados pessoais | administrador vê nome e país de todos os workspaces nas RPCs admin (`20260915190000:65`) | Necessário ao negócio; precisa constar na política e ter trilha | módulo ADM |
| Ambiente de teste | mesmas telas e mesma URL de confirmação de produção | Risco de misturar dados de teste e reais | manter prefixo `TESTE`; ACS-S05 |
