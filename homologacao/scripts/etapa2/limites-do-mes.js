// Etapa 2 — conferência: limites de "este mês" (início e fim) calculados em UTC.
// Lógica copiada de expenses.js:14 e dashboard-movements.js:2:
//   início = new Date(ano, mês, 1).toISOString().slice(0,10)   fim = new Date(ano, mês+1, 1).toISOString().slice(0,10)
// Uso: for tz in America/Sao_Paulo America/New_York Europe/Lisbon Europe/London Europe/Rome Europe/Berlin; do TZ=$tz node limites-do-mes.js; done
const p = n => String(n).padStart(2,'0');
const wrongStart = [], wrongEnd = [];
for (let m = 0; m < 12; m++) {
  const start = new Date(2026, m, 1).toISOString().slice(0,10);
  const end = new Date(2026, m+1, 1).toISOString().slice(0,10);
  if (start !== `2026-${p(m+1)}-01`) wrongStart.push(m+1);
  if (end !== (m === 11 ? '2027-01-01' : `2026-${p(m+2)}-01`)) wrongEnd.push(m+1);
}
console.log((process.env.TZ||'(fuso do sistema)').padEnd(20),'início errado nos meses:',JSON.stringify(wrongStart).padEnd(36),'fim errado nos meses:',JSON.stringify(wrongEnd));
