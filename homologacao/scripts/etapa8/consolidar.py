"""Lê as tabelas Markdown dos 10 pacotes de homologação e imprime os totais e as
listas usadas em homologacao/00-consolidacao/. Só leitura; não altera nada.
Uso: python3 -I homologacao/scripts/etapa8/consolidar.py [secao]
  secao = totais | achados | riscos | req | testes | tudo (padrão)
"""
import re, sys, os, collections

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
MODULOS = ["BD", "ACS", "CTA", "RDP", "INV", "PLN", "DSH", "ASS", "ADM", "IA"]

def linhas_tabela(caminho, prefixo):
    """Devolve as células das linhas cujo 1º campo começa com o prefixo (regex)."""
    out = []
    try:
        with open(caminho, encoding="utf-8") as f:
            for ln in f:
                if not ln.startswith("|"):
                    continue
                cel = [c.strip() for c in ln.strip().strip("|").split("|")]
                if re.match(prefixo, cel[0].strip("`* ")):
                    out.append(cel)
    except FileNotFoundError:
        pass
    return out

def nivel(txt):
    t = txt.lower()
    for n in ("alta", "alto", "média", "medio", "médio", "media", "baixa", "baixo", "informativa"):
        if t.startswith(n):
            return {"alta": "Alta", "alto": "Alta", "média": "Média", "médio": "Média", "media": "Média",
                    "medio": "Média", "baixa": "Baixa", "baixo": "Baixa", "informativa": "Informativa"}[n]
    return "?"

dados = {}
for m in MODULOS:
    p = lambda f: os.path.join(BASE, "homologacao", m, f)
    dados[m] = {
        "regras": linhas_tabela(p("03-regras-de-negocio.md"), r"RN-"),
        "achados": linhas_tabela(p("SEGURANCA-CONFIDENCIAL.md"), rf"{m}-S\d"),
        "riscos": linhas_tabela(p("07-analise-de-risco.md"), r"R-"),
        "req": linhas_tabela(p("10-o-ideal.md"), r"REQ-"),
        "testes": linhas_tabela(p("08-plano-de-testes.md"), r"(CT-|T-)"),
    }

secao = sys.argv[1] if len(sys.argv) > 1 else "tudo"

if secao in ("totais", "tudo"):
    print("## Totais por módulo\n")
    print("| Módulo | Regras | Achados (Alta/Média/Baixa/Inf.) | Riscos | Requisitos (P1/P2/P3) | Casos de teste |")
    print("|---|---|---|---|---|---|")
    tot = collections.Counter()
    for m in MODULOS:
        d = dados[m]
        sev = collections.Counter(nivel(a[2]) for a in d["achados"])
        pri = collections.Counter(re.sub(r"[^P0-9]", "", r[-1])[:2] for r in d["req"])
        print(f"| {m} | {len(d['regras'])} | {len(d['achados'])} ({sev['Alta']}/{sev['Média']}/{sev['Baixa']}/{sev['Informativa']}) "
              f"| {len(d['riscos'])} | {len(d['req'])} ({pri['P1']}/{pri['P2']}/{pri['P3']}) | {len(d['testes'])} |")
        for k in ("regras", "achados", "riscos", "req", "testes"):
            tot[k] += len(d[k])
        for s, n in sev.items(): tot["sev_" + s] += n
        for s, n in pri.items(): tot["pri_" + s] += n
    print(f"| **Total** | {tot['regras']} | {tot['achados']} ({tot['sev_Alta']}/{tot['sev_Média']}/{tot['sev_Baixa']}/{tot['sev_Informativa']}) "
          f"| {tot['riscos']} | {tot['req']} ({tot['pri_P1']}/{tot['pri_P2']}/{tot['pri_P3']}) | {tot['testes']} |")
    print()

if secao in ("achados", "tudo"):
    for sev in ("Alta", "Média"):
        print(f"## Achados de severidade {sev}\n")
        print("| Código | Achado (resumo) | Situação |")
        print("|---|---|---|")
        for m in MODULOS:
            for a in dados[m]["achados"]:
                if nivel(a[2]) == sev:
                    resumo = re.sub(r"\*\*", "", a[1]).split(". ")[0][:160]
                    print(f"| {a[0]} | {resumo} | {a[4][:60]} |")
        print()

if secao in ("riscos", "tudo"):
    print("## Riscos com impacto Alto\n")
    print("| Código | Risco (resumo) | Prob. | Impacto |")
    print("|---|---|---|---|")
    for m in MODULOS:
        for r in dados[m]["riscos"]:
            # IA tem coluna Tipo a mais: Prob. é a 3ª ou 4ª célula
            prob, imp = (r[2], r[3]) if m != "IA" else (r[3], r[4])
            if nivel(imp) == "Alta":
                print(f"| {r[0]} | {r[1][:150]} | {nivel(prob)} | {nivel(imp)} |")
    print()

if secao in ("req", "tudo"):
    print("## Requisitos P1\n")
    print("| Código | Requisito (resumo) |")
    print("|---|---|")
    for m in MODULOS:
        for r in dados[m]["req"]:
            if re.sub(r"[^P0-9]", "", r[-1]).startswith("P1"):
                print(f"| {r[0]} | {re.sub(r'\*\*', '', r[1])[:170]} |")
    print()

if secao in ("testes", "tudo"):
    print("## Casos de teste por módulo (códigos)\n")
    for m in MODULOS:
        print(f"- {m}: " + ", ".join(t[0].strip('`') for t in dados[m]["testes"]))
    print()
