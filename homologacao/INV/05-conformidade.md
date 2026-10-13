# INV · 05 — Conformidade (LGPD e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Dados tratados | nome, código e moeda dos investimentos; lançamentos com valor, quantidade, preço, data, conta, descrição livre; taxa esperada | Dados financeiros pessoais (patrimônio) | Inventário de dados (REQ-BD-10) |
| Texto que não é recomendação | telas avisam: "não representam recomendação de investimento nem promessa de rentabilidade" (`investment-type-new.html`); "usado só para simulação, não é garantia" (`investment-new.html`) | Boa prática (evita leitura como consultoria de investimento) | Manter; confirmar com jurídico se basta para o público no exterior |
| Qualidade do dado (LGPD art. 6º, V) | posição "Aguardando cotação" permanente; fórmula não auditável; valor × quantidade × preço sem conferência | Dado exibido ao titular pode estar errado ou incompleto | REQ-INV-01, 02, 06 |
| Imutabilidade do histórico | fechamento de período existe no modelo, mas ninguém fecha pelo app e a proteção é só de tela | Fraca | REQ-INV-03, 04 |
| Eliminação pelo titular | pode excluir lançamentos e investimentos sem lançamentos; não há exclusão em lote | Parcial | REQ-BD-10 |
| Auditoria | nenhuma trilha de alteração/exclusão de lançamentos | Lacuna | REQ-BD-09 |
| Uso por IA | posições (`position_value` por moeda) enviadas ao assistente | Transparência e base legal | módulo IA |
| Fuso horário | data padrão em UTC | Dado incorreto para parte dos titulares | REQ-CTA-05 |
