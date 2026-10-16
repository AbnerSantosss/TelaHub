# Repasse para a api. Incluído nas locations /api/ e /uploads/ dos dois
# `server` do gateway (ver nginx.conf). Extensão .inc de propósito: o nginx da
# imagem inclui conf.d/*.conf no bloco `http`, e este trecho só vale dentro de
# uma location.
proxy_pass http://backend:3001;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
# A cadeia de X-Forwarded-For é o que deixa o backend ver o IP do visitante.
# Sem ela o rate limit agrupa todo mundo num contador só (TRUST_PROXY=2:
# túnel do Cloudflare e este nginx).
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
# Fixo em https: o túnel entrega HTTP puro na porta, mas o visitante está em
# HTTPS. Com $scheme o backend montaria links e cookies como http.
proxy_set_header X-Forwarded-Proto https;

# Upload de mídia grande (vídeo) no painel.
proxy_read_timeout 300s;
proxy_send_timeout 300s;
proxy_connect_timeout 60s;

# A api já manda os headers de segurança (helmet) e o próprio Cache-Control.
# Este add_header existe para CANCELAR a herança dos add_header do server:
# sem ele a resposta da api sairia com Cache-Control e X-Frame-Options
# duplicados.
add_header X-Robots-Tag $telahub_robots always;
