"""Compara os resultados da Fase 1 (CSV em homologacao/testes/fase1/resultados/)
com o que o repositório mostra e com o que a homologação inferiu. Só leitura.

Uso:
  python3 -I homologacao/scripts/etapa9/comparar-fase1.py            # compara
  python3 -I homologacao/scripts/etapa9/comparar-fase1.py --sanear   # anonimiza os CSV no lugar
  python3 -I homologacao/scripts/etapa9/comparar-fase1.py --dir X    # usa outra pasta de resultados

O identificador do projeto é lido de supabase/config.toml só para dizer "igual/diferente";
ele nunca é impresso.
"""
import csv, glob, os, re, sys, collections

csv.field_size_limit(10_000_000)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
DIR = os.path.join(RAIZ, "homologacao", "testes", "fase1", "resultados")
args = sys.argv[1:]
if "--dir" in args:
    DIR = os.path.abspath(args[args.index("--dir") + 1])

try:
    cfg = open(os.path.join(RAIZ, "supabase", "config.toml"), encoding="utf-8").read()
    PROJETO = re.search(r'project_id\s*=\s*"([a-z]+)"', cfg).group(1)
except Exception:
    PROJETO = None

# ---------- anonimização ----------
PADROES = [
    (re.compile(r"[a-z]{20}(?=\.supabase\.(co|in))"), "<id-do-projeto>"),
    (re.compile(r"sb-[a-z]{20}-auth-token"), "sb-<id-do-projeto>-auth-token"),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "<email>"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}"), "<token>"),
    (re.compile(r"sb_(publishable|secret)_[A-Za-z0-9_-]+"), "<chave>"),
]

def nao_anonimizado(texto):
    return [p.pattern for p, _ in PADROES if p.search(texto)]

def registrar_alvo_dos_jobs():
    """Antes de anonimizar, anota se cada job chama o projeto de config.toml (sem copiar o identificador)."""
    caminho = os.path.join(DIR, "T-BD-09-jobs.csv")
    if not os.path.exists(caminho) or not PROJETO:
        return
    with open(caminho, encoding="utf-8", errors="replace", newline="") as f:
        linhas = list(csv.DictReader(f))
    saida = ["# T-BD-09 — alvo de cada job (gerado por --sanear, sem identificadores)", "", "| Job | Endereço aponta para o projeto de config.toml? |", "|---|---|"]
    for l in linhas:
        l = {(k or "").strip().lower(): (v or "") for k, v in l.items()}
        cmd = l.get("command", "")
        if PROJETO in cmd: alvo = "igual"
        elif "<id-do-projeto>" in cmd: alvo = "já anonimizado antes do registro"
        elif ".supabase." in cmd: alvo = "DIFERENTE"
        else: alvo = "não chama função HTTP"
        saida.append(f"| {l.get('jobname','?')} | {alvo} |")
    open(os.path.join(DIR, "T-BD-09-alvo.md"), "w", encoding="utf-8").write("\n".join(saida) + "\n")
    print("T-BD-09-alvo.md: registrado igual/diferente por job")

def sanear():
    registrar_alvo_dos_jobs()
    for caminho in sorted(glob.glob(os.path.join(DIR, "*.csv")) + glob.glob(os.path.join(DIR, "*.md"))):
        if caminho.endswith(("LEIA-ME.md", "T-BD-09-alvo.md")):
            continue
        texto = open(caminho, encoding="utf-8", errors="replace").read()
        novo, trocas = texto, 0
        for p, s in PADROES:
            novo, n = p.subn(s, novo)
            trocas += n
        if trocas:
            open(caminho, "w", encoding="utf-8").write(novo)
        print(f"{os.path.basename(caminho)}: {trocas} substituição(ões)")

if "--sanear" in args:
    sanear(); sys.exit(0)

# ---------- leitura ----------
def ler(nome):
    caminho = os.path.join(DIR, nome)
    if not os.path.exists(caminho):
        return None
    texto = open(caminho, encoding="utf-8", errors="replace").read()
    pend = nao_anonimizado(texto)
    if pend:
        print(f"!! {nome} contém dado não anonimizado ({len(pend)} padrão/padrões). Rode --sanear antes.")
        sys.exit(2)
    with open(caminho, encoding="utf-8", errors="replace", newline="") as f:
        linhas = list(csv.DictReader(f))
    return [{(k or "").strip().lower(): (v or "").strip() for k, v in l.items()} for l in linhas]

def vdd(v):
    return str(v).strip().lower() in ("true", "t", "1", "yes", "sim")

# ---------- o que o repositório mostra ----------
MIG = glob.glob(os.path.join(RAIZ, "supabase", "migrations", "*.sql"))
sql_repo = "\n".join(open(m, encoding="utf-8", errors="replace").read() for m in MIG)
def nomes(regex):
    return set(x.lower() for x in re.findall(regex, sql_repo, flags=re.I))
REPO = {
    "tabelas": nomes(r"create\s+table\s+(?:if\s+not\s+exists\s+)?finances\.([a-z_]+)"),
    "visoes": nomes(r"create\s+(?:or\s+replace\s+)?view\s+finances\.([a-z_]+)"),
    "funcoes": nomes(r"create\s+(?:or\s+replace\s+)?function\s+finances\.([a-z_]+)"),
    "politicas": set(x.lower() for x in re.findall(r"create\s+policy\s+\"?([^\"\n]+?)\"?\s+on\s+finances\.", sql_repo, flags=re.I)),
    "jobs": nomes(r"cron\.schedule\(\s*'([a-z0-9_-]+)'"),
}
grant_auth = set()
for m in MIG:
    if "20260923190000" in os.path.basename(m):
        grant_auth = set(x.lower() for x in re.findall(r"grant\s+execute\s+on\s+function\s+finances\.([a-z_]+)\s*\(", open(m, encoding="utf-8").read(), flags=re.I))
BASELINE = {"tabelas": 27, "visoes": 4, "funcoes": 34, "politicas": 63}  # docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md:66-69


def titulo(t):
    print(f"\n## {t}\n")

faltando = []
def bloco(nome, arquivo):
    d = ler(arquivo)
    if d is None:
        faltando.append(arquivo)
    return d

# ---------- Bloco 1 ----------
titulo("Bloco 1 — Inventário (T-BD-01)")
t = bloco("1a", "T-BD-01a-tabelas.csv")
if t:
    tabelas = sorted(l["table_name"] for l in t if l["table_type"].upper().startswith("BASE"))
    visoes = sorted(l["table_name"] for l in t if l["table_type"].upper() == "VIEW")
    print(f"| Objeto | Banco | Baseline 2026-09-24 | Com DDL no repositório |\n|---|---|---|---|")
    print(f"| tabelas | {len(tabelas)} | {BASELINE['tabelas']} | {len([x for x in tabelas if x in REPO['tabelas']])} |")
    print(f"| visões | {len(visoes)} | {BASELINE['visoes']} | {len([x for x in visoes if x in REPO['visoes']])} |")
    print("\nTabelas sem DDL no repositório: " + ", ".join(x for x in tabelas if x not in REPO["tabelas"]))
    print("Visões sem DDL no repositório: " + ", ".join(x for x in visoes if x not in REPO["visoes"]))
    print("No repositório mas não no banco: " + (", ".join(sorted((REPO["tabelas"] | REPO["visoes"]) - set(tabelas) - set(visoes))) or "nenhuma"))
f = bloco("1c", "T-BD-01c-funcoes.csv")
if f:
    fn = sorted(set(l["funcao"] for l in f))
    secdef = sorted(set(l["funcao"] for l in f if vdd(l.get("security_definer", ""))))
    print(f"\nFunções no banco: {len(f)} assinaturas, {len(fn)} nomes (baseline {BASELINE['funcoes']}); SECURITY DEFINER: {len(secdef)}")
    print("Sem definição no repositório: " + (", ".join(x for x in fn if x not in REPO["funcoes"]) or "nenhuma"))
    sobre = [k for k, v in collections.Counter(l["funcao"] for l in f).items() if v > 1]
    print("Sobrecargas (T-BD-11): " + (", ".join(sorted(sobre)) or "nenhuma"))
p = bloco("1d", "T-BD-01d-politicas.csv")
e = bloco("1e", "T-BD-01e-rls-volume.csv")
if p is not None:
    por_tab = collections.Counter(l["tablename"] for l in p)
    print(f"\nPolíticas no banco: {len(p)} (baseline {BASELINE['politicas']}; versionadas no repositório: {len(REPO['politicas'])})")
    print("| Tabela | Políticas | Comandos |\n|---|---|---|")
    for tab in sorted(por_tab):
        print(f"| {tab} | {por_tab[tab]} | {', '.join(sorted(set(l['cmd'] for l in p if l['tablename'] == tab)))} |")
    if e:
        sem = [l["tabela"] for l in e if vdd(l["rls_ativo"]) and por_tab.get(l["tabela"], 0) == 0]
        desl = [l["tabela"] for l in e if not vdd(l["rls_ativo"])]
        print("\nRLS ativo sem nenhuma política (só service_role acessa): " + (", ".join(sem) or "nenhuma"))
        print("RLS DESLIGADO (atenção): " + (", ".join(desl) or "nenhuma"))
if e:
    print("\nVolume aproximado de linhas: " + ", ".join(f"{l['tabela']}={l['linhas_aprox']}" for l in e))
v = bloco("1g", "T-BD-01g-visoes.csv")
if v:
    for l in v:
        if l["viewname"] == "investment_positions":
            print(f"\nDefinição de investment_positions (CT-INV-20) tem {len(l['definition'])} caracteres; comparar com scripts/etapa3/modelo-de-posicao-referencia.py:\n")
            print("```sql\n" + l["definition"][:4000] + "\n```")

# ---------- Bloco 2 ----------
titulo("Bloco 2 — Privilégios por tabela (T-BD-02, T-BD-03)")
pr = bloco("2", "T-BD-02-privilegios.csv")
if pr:
    print("| Objeto | anon | authenticated (S/I/U/D) | service_role (S/I/U/D) |\n|---|---|---|---|")
    objs = sorted(set(l["objeto"] for l in pr))
    for o in objs:
        def s(papel):
            l = next((x for x in pr if x["objeto"] == o and x["papel"] == papel), None)
            if not l: return "?"
            return "".join(c if vdd(l[k]) else "-" for c, k in zip("SIUD", ("pode_select", "pode_insert", "pode_update", "pode_delete")))
        print(f"| {o} | {s('anon')} | {s('authenticated')} | {s('service_role')} |")
    anon_ok = [l["objeto"] for l in pr if l["papel"] == "anon" and any(vdd(l[k]) for k in ("pode_select", "pode_insert", "pode_update", "pode_delete"))]
    print("\nanon com algum privilégio (esperado: nenhum): " + (", ".join(anon_ok) or "nenhum"))
    sr_del = [l["objeto"] for l in pr if l["papel"] == "service_role" and vdd(l["pode_delete"])]
    print("service_role com DELETE (repositório concede só S/I/U): " + (", ".join(sr_del) or "nenhum"))

# ---------- Bloco 3 ----------
titulo("Bloco 3 — Funções chamáveis (T-BD-05)")
fp = bloco("3a", "T-BD-05-funcoes-privilegios.csv")
if fp:
    auth = sorted(set(l["funcao"] for l in fp if vdd(l["authenticated"])))
    anon = sorted(set(l["funcao"] for l in fp if vdd(l["anon"])))
    print(f"Executáveis por authenticated: {len(auth)} (repositório 20260923190000 concede {len(grant_auth)})")
    print("A mais (no banco, não no grant versionado): " + (", ".join(x for x in auth if x not in grant_auth) or "nenhuma"))
    print("A menos (no grant versionado, não no banco): " + (", ".join(sorted(grant_auth - set(auth))) or "nenhuma"))
    print("Executáveis por anon (esperado: nenhuma): " + (", ".join(anon) or "nenhuma"))
df = bloco("3b", "T-BD-12-definicoes.csv")
if df:
    print(f"\nDefinições recebidas (T-BD-12): {len(df)}. Comparação textual com o repositório: rodar `diff` por função a partir deste arquivo (passo manual do analista).")

# ---------- Bloco 4 ----------
titulo("Bloco 4 — Jobs agendados (T-BD-09, T-BD-10, CT-ASS-23, CT-IA-19)")
jb = bloco("4a", "T-BD-09-jobs.csv")
if jb:
    print("| Job | Agenda | Ativo | Endereço aponta para o projeto de config.toml? | Versionado no repositório? |\n|---|---|---|---|---|")
    for l in jb:
        cmd = l.get("command", "")
        alvo_reg = {}
        pa = os.path.join(DIR, "T-BD-09-alvo.md")
        if os.path.exists(pa):
            for m in re.finditer(r"^\| (.+?) \| (.+?) \|$", open(pa, encoding="utf-8").read(), flags=re.M):
                alvo_reg[m.group(1)] = m.group(2)
        if l["jobname"] in alvo_reg:
            alvo = alvo_reg[l["jobname"]]
        elif "<id-do-projeto>" in cmd:
            alvo = "anonimizado sem registro (rodar --sanear antes de anonimizar à mão)"
        elif PROJETO and PROJETO in cmd:
            alvo = "igual"
        elif ".supabase." in cmd:
            alvo = "DIFERENTE"
        else:
            alvo = "não chama função HTTP"
        print(f"| {l['jobname']} | {l['schedule']} | {l['active']} | {alvo} | {'sim' if l['jobname'].lower() in REPO['jobs'] else 'não'} |")
    print("\nNota: a coluna 'igual/DIFERENTE' vem de T-BD-09-alvo.md, gerado por --sanear antes de anonimizar o comando.")
    print("Jobs esperados pela homologação: daily-ai-insights (IA), cotação PTAX (ASS), conciliação Mercado Pago (ASS).")
ex = bloco("4b", "T-BD-10-execucoes.csv")
if ex:
    c = collections.Counter((l.get("jobname", "?"), l["status"]) for l in ex)
    print("\n| Job | Status | Ocorrências nas últimas 40 |\n|---|---|---|")
    for (j, s), n in sorted(c.items()):
        print(f"| {j} | {s} | {n} |")
ht = bloco("4c", "T-BD-10-respostas-http.csv")
if ht:
    c = collections.Counter(l["status_code"] for l in ht)
    print("\nRespostas HTTP recebidas pelos jobs (últimas 40): " + ", ".join(f"{k or 'sem código'}×{v}" for k, v in sorted(c.items())))
    for l in ht[:10]:
        print(f"- {l['created'][:19]} status {l['status_code'] or '—'} {('erro: ' + l['error_msg']) if l['error_msg'] else ''} {l['inicio_do_conteudo'][:160]}")

# ---------- Bloco 5 ----------
titulo("Bloco 5 — Job de insights (CT-IA-18)")
ia = bloco("5", "CT-IA-18-insights.csv")
if ia:
    l = ia[0]
    d = vdd(l["service_role_delete_ai_insights"])
    print(f"service_role pode DELETE em ai_insights: **{d}** → " + ("IA-S02 NÃO se confirma: o DELETE é permitido." if d else "IA-S02 CONFIRMADO: compute_ai_insights falha no DELETE."))
    print(f"Insights existentes: {l['insights_existentes']} (último: {l['ultimo_insight'] or 'nunca'}); chamadas IA: total {l['chamadas_ia_total']}, sucesso {l['chamadas_ia_sucesso']}, erro {l['chamadas_ia_erro']}; limites cadastrados: {l['limites_cadastrados']}")

# ---------- Bloco 6 ----------
titulo("Bloco 6 — Categorias de despesa (CT-RDP-01)")
ct = bloco("6", "CT-RDP-01-categorias.csv")
if ct:
    l = ct[0]
    print(f"Workspaces: {l['workspaces']}; com categorias próprias: {l['workspaces_com_categorias']}; categorias sem workspace (compartilhadas): {l['categorias_sem_workspace']}; total: {l['categorias_total']}")
    print(f"Nomes das compartilhadas: {l['nomes_sem_workspace'] or 'nenhuma'}")
    print(f"Funções que citam expense_categories: {l['funcoes_que_citam_categorias'] or 'nenhuma'}")
    ws, com = int(l["workspaces"] or 0), int(l["workspaces_com_categorias"] or 0)
    if int(l["categorias_sem_workspace"] or 0) == 0 and com < ws:
        print(f"→ {ws - com} workspace(s) sem nenhuma categoria e sem categorias compartilhadas: R-RDP-01 provável (usuário novo não consegue registrar despesa).")

# ---------- Bloco 8 ----------
titulo("Bloco 8 — Dados do pagador (CT-ASS-26)")
pk = bloco("8", "CT-ASS-26-payload-chaves.csv")
if pk:
    pessoais = {"email", "first_name", "last_name", "identification", "phone", "address", "card", "payer"}
    achados = sorted(set(l["campo"] for l in pk if l["campo"].lower() in pessoais))
    print("Campos presentes: " + ", ".join(f"{l['nivel']}.{l['campo']}" for l in pk))
    print("Campos pessoais detectados: " + (", ".join(achados) or "nenhum") + (" → ASS-S07 confirmado (retenção sem prazo)." if achados else ""))
vol = bloco("8b", "CT-ASS-26-volume.csv")
if vol:
    l = vol[0]; print(f"Eventos: {l['eventos']} (de {l['primeiro'][:10] if l['primeiro'] else '—'} a {l['ultimo'][:10] if l['ultimo'] else '—'})")

if faltando:
    print("\n## Arquivos ainda não recebidos\n\n- " + "\n- ".join(faltando))
