// Etapa 2 — conferência: como o sistema lê um valor digitado em campo de TEXTO.
// Lógica copiada de transfer-new.js:3, transfer-edit.js:3, expense-new.js:3 e expense-edit.js:3.
// Uso: node valor-digitado.js
const parse = v => Number(String(v||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'))||0;
console.log('digitado     => lido pelo sistema');
for (const t of ['100','100,50','100.50','1.234,56','1,234.56','1.5','0,99','12.345','-5','abc'])
  console.log(JSON.stringify(t).padEnd(12),'=>',parse(t));
