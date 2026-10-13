// Etapa 3 — conferência dos TOTAIS da tela Investimentos (investments.js:2, função render),
// a partir de linhas já calculadas pela visão investment_positions (cuja fórmula NÃO está no repositório).
// Lógica copiada: totalInvested = Σ(contributions − withdrawals); totalCurrent = Σ position_value (só quando não nulo);
//                 totalResult = Σ result (quando numérico); rentabilidade = totalResult / totalInvested × 100;
//                 "Parcial" quando alguma posição está sem cotação; "Múltiplas moedas" quando há mais de uma moeda.
// Uso: node totais-da-carteira.js
const casos = {
  'A — 2 posições BRL, ambas com cotação': [
    { currency: 'BRL', contributions: 1000, withdrawals: 0,   position_value: 1100, result: 100 },
    { currency: 'BRL', contributions: 2000, withdrawals: 500, position_value: 1400, result: -100 },
  ],
  'B — uma posição sem cotação (awaiting_price)': [
    { currency: 'BRL', contributions: 1000, withdrawals: 0, position_value: 1100, result: 100 },
    { currency: 'BRL', contributions: 300,  withdrawals: 0, position_value: null, result: null },
  ],
  'C — moedas diferentes': [
    { currency: 'BRL', contributions: 1000, withdrawals: 0, position_value: 1100, result: 100 },
    { currency: 'USD', contributions: 200,  withdrawals: 0, position_value: 210,  result: 10 },
  ],
  'D — tudo resgatado (investido líquido 0)': [
    { currency: 'BRL', contributions: 1000, withdrawals: 1000, position_value: 0, result: 50 },
  ],
};
for (const [nome, rows] of Object.entries(casos)) {
  let totalInvested = 0, totalCurrent = 0, totalResult = 0, currentCount = 0;
  const currencies = new Set(rows.map(r => r.currency));
  rows.forEach(i => {
    const result = Number(i.result);
    if (i.position_value !== null) { totalCurrent += Number(i.position_value); currentCount++; }
    totalInvested += Number(i.contributions || 0) - Number(i.withdrawals || 0);
    if (Number.isFinite(result)) totalResult += result;
  });
  const single = currencies.size <= 1;
  const invested = single ? totalInvested : 'Múltiplas moedas';
  const current = single ? (currentCount === rows.length ? totalCurrent : 'Parcial') : 'Múltiplas moedas';
  const res = single ? totalResult : 'Múltiplas moedas';
  const pct = single && totalInvested > 0 ? (totalResult / totalInvested * 100).toFixed(2) + '%' : '—';
  console.log(nome); console.log('   investido líquido =', invested, '| valor atual =', current, '| resultado =', res, '| rentabilidade =', pct);
}
console.log('\nObservações: no caso B o resultado soma só a posição com cotação (100), mas o investido inclui as duas (1300) → 7,69%.');
console.log('No caso D a rentabilidade fica "—" mesmo com resultado 50, porque o investido líquido é 0.');
