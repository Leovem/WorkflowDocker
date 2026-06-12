# ===============================
# ETAPA 1: COMPILAR ANGULAR
# ===============================
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build -- --configuration production


# ===============================
# ETAPA 2: SERVIR CON NGINX
# ===============================
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos el build a una carpeta temporal
COPY --from=build /app/dist/frontend-angular /tmp/angular-dist

# Si Angular generó /browser, copiamos /browser.
# Si no generó /browser, copiamos directamente el contenido.
RUN if [ -d /tmp/angular-dist/browser ]; then \
      cp -r /tmp/angular-dist/browser/* /usr/share/nginx/html/; \
    else \
      cp -r /tmp/angular-dist/* /usr/share/nginx/html/; \
    fi && rm -rf /tmp/angular-dist

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]