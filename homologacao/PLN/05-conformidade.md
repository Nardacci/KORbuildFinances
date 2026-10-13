# PLN · 05 — Conformidade (LGPD e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Dados tratados | objetivo (nome, valor, prazo), patrimônio, capacidade de poupança, projeções | Dados financeiros e de perfil econômico do titular | Inventário de dados (REQ-BD-10) |
| Dado pessoal no código | nome de pessoa real fixo em `planning.html` e como padrão em JS | Exposição desnecessária | PLN-S01 |
| Natureza do conteúdo | avisos: "Simulação matemática… Não é garantia nem recomendação de investimento" e "Estimativa simplificada — não considera todas as regras fiscais" (`planning.html`) | Boa prática contra interpretação como consultoria (CVM) e aconselhamento fiscal | Confirmar com jurídico se os avisos bastam, sobretudo para residentes fora do Brasil |
| Qualidade e exatidão (LGPD art. 6º, V) | patrimônio ignora movimentações; prazo a partir de hoje; capacidade com bases diferentes | O titular recebe conclusões sobre si mesmo calculadas com dados incorretos | REQ-PLN-01, 02, 03 |
| Transparência das premissas | constantes de inflação e IR não visíveis ao usuário; aporte no fim do mês; taxa constante | Parcial | REQ-PLN-06 |
| Uso por IA | objetivo, plano e posições enviados à edge function `finances-ai` | Base legal e informação ao titular | módulo IA |
| Retenção | objetivo e plano permanecem; sem histórico de versões | Sem trilha; sem eliminação | REQ-BD-09, 10 |
