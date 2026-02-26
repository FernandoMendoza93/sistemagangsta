# ============================================
# Multi-stage Dockerfile para Railway
# The Gangsta Barber Shop — Sistema de Gestión
# ============================================

# --- Stage 1: Build del Frontend ---
FROM node:20-alpine AS builder

WORKDIR /app/client

# Copiar solo archivos de dependencias primero (para cache de Docker)
COPY client/package.json client/package-lock.json ./

# Instalar dependencias del frontend
RUN npm ci

# Copiar el resto del código del frontend
COPY client/ ./

# Build de producción (genera /app/client/dist)
RUN npm run build

# --- Stage 2: Producción ---
FROM node:20-alpine AS production

WORKDIR /app

# Copiar package.json del server
COPY server/package.json server/package-lock.json ./server/

# Instalar SOLO dependencias de producción del backend
WORKDIR /app/server
RUN npm ci --omit=dev

# Volver a /app
WORKDIR /app

# Invalida el cache de Docker a partir de aquí (Railway Cache Busting)
ARG CACHE_BUST=1

# Copiar código del servidor
COPY server/ ./server/

# Copiar el frontend compilado (respeta la ruta ../client/dist que usa index.js)
COPY --from=builder /app/client/dist ./client/dist/

# Copiar script SQL inicial
COPY database/ ./database/

# Crear carpeta para la base de datos (punto de montaje del volumen en Railway)
RUN mkdir -p /app/server/data

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponer puerto (Railway inyecta PORT automáticamente)
EXPOSE ${PORT}


# Directorio de trabajo
WORKDIR /app

# Arrancar el servidor
CMD ["node", "server/index.js"]
