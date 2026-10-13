# INV · 09 — Inventário de telas e situação

| Tela | Arquivo | Função | Situação (pelo código) | Observações |
|---|---|---|---|---|
| Tipos de investimentos | `investment-types.html` + `.js` | listar | Funciona; testada | sem editar/excluir |
| Novo tipo | `investment-type-new.html` + `.js` | criar | Funciona; testada | vocabulário divergente da ajuda |
| Investimentos (carteira) | `investments.html` + `.js` | posições, totais, excluir | Funciona, mas valor atual fica "Aguardando cotação" para tipos com preço de mercado | cartões celular com escape |
| Novo investimento | `investment-new.html` + `.js` | criar | Funciona; testada | sem GBP |
| Editar investimento | `investment-edit.html` + `.js` | alterar | Funciona; testada | bloqueios só na tela |
| Detalhe | `investment-detail.html` + `.js` | posição e últimos 20 lançamentos | Funciona | sem paginação |
| Lançamentos | `investment-launches.html` + `.js` | listar, excluir | Funciona; testada | |
| Novo lançamento | `investment-launch-new.html` + `.js` | registrar | Funciona; testada (aporte) | sem checagem de mês fechado |
| Editar lançamento | `investment-launch-edit.html` + `.js` | alterar, excluir | Funciona; testada (descrição) | não troca investimento nem conta |
| (sem tela) | — | informar cotação / preço atual | Inexistente | posição nunca avaliada a mercado |
| (sem tela) | — | fechar período | Inexistente | só SQL |
| (sem tela) | — | arquivar investimento | Inexistente (citado na mensagem de exclusão) | |
| (sem tela) | — | editar/excluir tipo | Inexistente | |
