# ACS · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-ACS-01 | Fluxo "Esqueci minha senha" por e-mail, com link que leva a uma tela de nova senha | inexistente | ACS-S04, R-ACS-01 | P1 |
| REQ-ACS-02 | Nome e país do cadastro devem ser guardados (ex.: metadados do usuário) e pré-preenchidos na etapa 1 do assistente; ou os campos saem do cadastro | digitados e descartados (`auth.js:25-28`) | RN-ACS-004 | P2 |
| REQ-ACS-03 | Termos de Uso e Política de Privacidade publicados, com link no cadastro, e aceite registrado (usuário, data, versão) | caixa sem link e sem registro (`signup.html:13`) | ACS-S09, R-ACS-03 | P1 |
| REQ-ACS-04 | O endereço do link de confirmação deve seguir o ambiente (teste ou produção) por configuração | fixo em produção (`auth.js:19`) | ACS-S05 | P2 |
| REQ-ACS-05 | Senha mínima de 8 caracteres e bloqueio de senhas vazadas (recurso do Supabase Auth); mensagens de erro de autenticação traduzidas e sem revelar se o e-mail existe | 6 caracteres; mensagens cruas | ACS-S03, ACS-S12 | P2 |
| REQ-ACS-06 | `complete_setup` valida `incomeDay` entre 1 e 31 e `accountCurrency` dentro da lista aceita | sem validação de faixa (`:46, 92`) | ACS-S08 | P2 |
| REQ-ACS-07 | A primeira receita deve ser vinculada à primeira conta quando as moedas coincidirem (ou o usuário escolher), para que o saldo da conta reflita a receita | receita sem `account_id` (`:91-92`) | RN-ACS-022, R-ACS-05 | P2 (confirmar na Etapa 2) |
| REQ-ACS-08 | Frequência "Uma vez" deve ter tratamento definido na receita mensal equivalente (ignorar explicitamente ou diluir em 12 meses) e usar o mesmo vocabulário de frequência em todo o sistema (hoje: português no assistente, inglês nas telas de receita) | fator 0 silencioso (`app.js:37-40`) | RN-ACS-018 | P2 |
| REQ-ACS-09 | Rascunho local apagado ao concluir a configuração, não só no logout | só no logout (`auth.js:30`) | ACS-S06 | P3 |
| REQ-ACS-10 | Um único destino para "sem sessão" (`index.html`), removendo `login.html` quando os links forem atualizados | dois destinos | RN-ACS-012 | P3 |
| REQ-ACS-11 | Remover o rodapé "Ambiente de desenvolvimento" das telas públicas (ou exibir só em teste) | fixo | ACS-S10 | P3 |
| REQ-ACS-12 | Documentar o comportamento do administrador nas telas de produto (permitido ou não) e, se permitido, garantir que ele tenha workspace | indefinido | ACS-S11 | P3 |
| REQ-ACS-13 | Decidir e registrar: guarda comercial fail-open (hoje) ou fail-closed | fail-open | ACS-S01 | P3 |
| REQ-ACS-14 | Tela de cadastros: remover ou esconder cartões "Em breve" até existirem | 3 cartões inativos | RN-ACS-030 | P3 |
