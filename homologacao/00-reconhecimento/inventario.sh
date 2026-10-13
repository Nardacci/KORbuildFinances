#!/usr/bin/env bash
# Inventário por script do repositório KORbuildFinances (somente leitura).
# Uso: ./inventario.sh /caminho/da/raiz/deste/repositorio (ex.: ../..)
# Não imprime chaves: filtra padrões de chave do Supabase antes de mostrar.
set -euo pipefail
R="${1:?informe o caminho do clone}"
cd "$R"
echo "## Linhas por tipo"; for ext in html js css sql ts md; do printf "%s;%s;%s\n" "$ext" "$(find . -path ./.git -prune -o -name "*.$ext" -type f -print | grep -v package-lock | wc -l)" "$(find . -path ./.git -prune -o -name "*.$ext" -type f -print | grep -v package-lock | xargs cat | wc -l)"; done
echo "## Telas: pagina;titulo;scripts"; for f in *.html; do echo "$f;$(grep -oE '<title>[^<]*' "$f" | head -1 | sed 's/<title>//');$(grep -oE "<script[^>]*src=['\"][^'\"]+" "$f" | sed -E "s/.*src=['\"]//" | grep -v '^http' | tr '\n' ' ')"; done
echo "## Tabelas/RPC por arquivo JS"; for f in *.js; do grep -oE "\.(from|rpc)\(['\"][a-zA-Z_]+['\"]" "$f" 2>/dev/null | sed -E "s/\.(from|rpc)\(['\"]([a-zA-Z_]+)['\"]/\1;\2/" | sort -u | awk -v f="$f" '{print f";"$0}'; done
echo "## Objetos nas migracoes"; for k in "create table" "create (or replace )?view" "create (or replace )?function" "create (or replace )?trigger" "create policy" "grant " "revoke " "cron\.schedule" "security definer"; do printf "%s;%s\n" "$k" "$(grep -iE "$k" supabase/migrations/*.sql | wc -l)"; done
echo "## Edge functions: nome;linhas;dominios;variaveis"; for d in supabase/functions/*/; do n=$(basename "$d"); printf "%s;%s;%s;%s\n" "$n" "$(cat "$d"/* | wc -l)" "$(grep -ohE 'https://[a-z.]+' "$d"/*.ts | sort -u | tr '\n' ' ')" "$(grep -ohE "Deno\.env\.get\(['\"][A-Z0-9_]+['\"]\)" "$d"/*.ts | sed -E "s/Deno.env.get\(['\"]//; s/['\"]\)//" | sort -u | tr '\n' ' ')"; done
echo "## Testes: spec;casos;pulados"; for f in tests/*.spec.js; do printf "%s;%s;%s\n" "$(basename "$f")" "$(grep -cE '^\s*test\(' "$f")" "$(grep -cE 'test\.(skip|fixme)' "$f")"; done
echo "## Git"; echo "commits;$(git rev-list --count HEAD)"; echo "primeiro;$(git log --reverse --format=%ad --date=short | head -1)"; echo "ultimo;$(git log -1 --format=%ad --date=short)"
