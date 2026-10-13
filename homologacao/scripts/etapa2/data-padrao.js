// Etapa 2 — conferência: data padrão dos formulários = new Date().toISOString().slice(0,10) (UTC),
// em transfer-new.js:5, income-new.js:2, expense-new.js:4. Compara com a data local de quem está usando.
// Uso: TZ=America/New_York node data-padrao.js
const RealDate = Date, p = n => String(n).padStart(2,'0');
for (const inst of ['2026-10-16T02:00:00Z','2026-10-15T22:30:00Z']) {
  global.Date = class extends RealDate { constructor(...a){ if(a.length===0) super(inst); else super(...a);} };
  const n = new Date();
  const local = `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}`;
  const utc = n.toISOString().slice(0,10);
  console.log((process.env.TZ||'(fuso do sistema)').padEnd(20),'instante',inst,'| data padrão do formulário',utc,'| data local do usuário',local, utc===local?'':'<-- diferente');
}
