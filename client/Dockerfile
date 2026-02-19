# ===============================================
# Etapa 1: Build del Frontend
# ===============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# ===============================================
# Etapa 2: Servidor Nginx para servir frontend
# ===============================================
FROM nginx:alpine

# Copiar archivos compilados desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando por defecto (nginx)
CMD ["nginx", "-g", "daemon off;"]
