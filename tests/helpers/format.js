// Utilitarios de data/moeda para os testes de lancamentos retroativos.

// Mesma logica de "subtrair N meses" que o app usaria: mantem o dia quando
// possivel, e cai no ultimo dia do mes de destino se o mes for mais curto.
function monthsAgoISO(n) {
  const now = new Date();
  const targetMonthIndex = now.getMonth() - n;
  const result = new Date(now.getFullYear(), targetMonthIndex, now.getDate());
  const expectedMonth = ((targetMonthIndex % 12) + 12) % 12;
  if (result.getMonth() !== expectedMonth) {
    result.setDate(0); // rolou pro mes seguinte: volta pro ultimo dia do mes alvo
  }
  return result.toISOString().slice(0, 10);
}

function yearMonth(isoDate) {
  return isoDate.slice(0, 7);
}

// Mesma formatacao usada pelas paginas de listagem: new Date(iso+'T12:00:00').toLocaleDateString('pt-BR')
function toBRDate(isoDate) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR');
}

// Converte um valor formatado como moeda pt-BR ("R$ 1.234,56") para Number.
function parseBRL(text) {
  const cleaned = String(text || '').replace(/[^0-9,.-]/g, '');
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

module.exports = { monthsAgoISO, yearMonth, toBRDate, parseBRL };
