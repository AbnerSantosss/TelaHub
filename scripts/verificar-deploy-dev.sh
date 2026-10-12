#!/usr/bin/env bash
# Verificação da versão nova nos hosts devtelahub. Só GET, OPTIONS e POSTs
# que a validação recusa: nada é gravado no banco.
P=https://devtelahubpainel.proxserverabner.site
S=https://devtelahublandingpage.proxserverabner.site
C=https://devtelahubcheckout.proxserverabner.site
UA="verificacao-deploy/1.0"

echo "== 1. Status e X-Robots-Tag"
for h in $P $S $C; do
  printf '%-50s ' "$h/"
  curl -s -o /dev/null -D - -A "$UA" "$h/" | tr -d '\r' | awk 'NR==1{printf "%s ", $2} tolower($1)=="x-robots-tag:"{printf "robots=%s %s", $2, $3} END{print ""}'
done

echo "== 2. robots.txt do site"
curl -s -A "$UA" "$S/robots.txt" | tr -d '\r' | head -5

echo "== 3. Domínios dentro do JS do painel"
html=$(curl -s -A "$UA" "$P/")
echo "$html" | grep -o 'assets/[^"]*\.js' | sort -u | while read -r js; do
  echo "  $js"; curl -s -A "$UA" "$P/$js" | grep -oE 'https://[a-z0-9.-]*proxserverabner\.site[a-z/]*' | sort -u | sed 's/^/    /'
done

echo "== 4. Domínios dentro do JS do site"
html=$(curl -s -A "$UA" "$S/")
echo "$html" | grep -o 'assets/[^"]*\.js' | sort -u | while read -r js; do
  echo "  $js"; curl -s -A "$UA" "$S/$js" | grep -oE 'https://[a-z0-9.-]*proxserverabner\.site[a-z/]*' | sort -u | sed 's/^/    /'
done
echo "  canonical: $(echo "$html" | grep -oE '<link rel="canonical"[^>]*>' | head -1)"

echo "== 5. API"
for u in "$P/api/health" "$P/api/plans" "$C/api/plans"; do
  printf '%-60s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A "$UA" "$u")"
done

echo "== 6. Preflight de CORS para /api/auth/login"
for o in $P $S $C https://painel.proxserverabner.site; do
  aco=$(curl -s -o /dev/null -D - -X OPTIONS -A "$UA" "$P/api/auth/login" \
    -H "Origin: $o" -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type' | tr -d '\r' \
    | awk 'tolower($1)=="access-control-allow-origin:"{print $2}')
  printf '%-50s allow-origin=%s\n' "$o" "${aco:-(nenhum)}"
done

echo "== 7. POSTs recusados pela validação (nada gravado)"
printf 'login inválido (origem painel): '
curl -s -o /dev/null -w '%{http_code}\n' -A "$UA" -X POST "$P/api/auth/login" \
  -H "Origin: $P" -H 'Content-Type: application/json' \
  -d '{"email":"verificacao-deploy@example.invalid","password":"x"}'
printf 'lead vazio (origem site): '
curl -s -o /dev/null -w '%{http_code}\n' -A "$UA" -X POST "$P/api/leads" \
  -H "Origin: $S" -H 'Content-Type: application/json' -d '{}'

echo "== 8. Checkout: meta robots"
curl -s -A "$UA" "$C/" | grep -oE '<meta name="robots"[^>]*>' | head -1
