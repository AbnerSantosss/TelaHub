# ==============================
# Stage 1: Build the React app
# ==============================
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first for better Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Destinos do funil (checkout e painel). O Vite resolve `VITE_*` em tempo de
# BUILD e embute o valor no bundle — trocar o domínio exige rebuild da imagem,
# não basta mudar a variável no Portainer.
#
# Sem estes args valem os defaults de produção de `src/lib/funnel.js`.
ARG VITE_CHECKOUT_URL
ARG VITE_APP_URL
ENV VITE_CHECKOUT_URL=$VITE_CHECKOUT_URL
ENV VITE_APP_URL=$VITE_APP_URL

# Build the production bundle
RUN npm run build

# ==============================
# Stage 2: Serve with Nginx
# ==============================
FROM nginx:alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
