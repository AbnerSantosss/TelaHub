FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Recebe a URL da API no momento do build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

# Copia os arquivos buildados do React para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração customizada do Nginx para suportar o React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3025
CMD ["nginx", "-g", "daemon off;"]
