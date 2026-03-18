# 🚀 FLOW SAAS - Guía de Arquitectura y Configuración Local

Bienvenido a **Flow SaaS (Sistema Gangsta)**. Este documento es una guía general diseñada para que cualquier ingeniero de software (o Agente de IA como Antigravity) pueda entender el ecosistema, las tecnologías involucradas y levantar el proyecto en un entorno local de inmediato.

---

## 🏗️ 1. Descripción del Sistema
Flow es un **SaaS Multi-tenant (Multi-inquilino)** diseñado específicamente para la gestión operativa y retención de clientes en barberías. El sistema permite que múltiples negocios (Tenants) operen bajo la misma base de datos e infraestructura, asegurando el aislamiento total de la información de sus clientes, citas, inventario y finanzas a través del identificador `barberia_id`.

### ✨ Core Features:
- **Agendamiento Dinámico Tetris:** Sistema inteligente que calcula la disponibilidad de tiempo de los barberos en bloques matemáticos, considerando duraciones de servicios y buffers de limpieza.
- **Portal del Cliente (Wallet):** Interfaz móvil donde los clientes visualizan sus próximas citas, su progreso de lealtad, y exponen un **Código QR Dinámico** en pantalla para ser escaneado en sucursal.
- **Lealtad de 120 Días:** Algoritmo de fidelización que premia la retención. Los clientes deben acumular 10 visitas en un margen móvil (ventana dinámica) de 120 días para ganar beneficios VIP.
- **Punto de Venta (POS) y Caja:** Flujo de cobro fluido, comisiones automáticas a barberos, gestión de inventario, y reportes de cortes de caja ciegos para encargados.
- **Role-Based Access Control (RBAC):** Jerarquía estricta dividida en: `SuperAdmin`, `Admin` (Dueño del Tenant), `Encargado`, `Barbero` y `Cliente`.

---

## 🛠️ 2. Stack Tecnológico

### Frontend (User Interface)
- **Core:** React 18 + Vite (ES Modules).
- **Estilos:** Vanilla CSS modular con filosofía de diseño **Bento Grid** y **Glassmorphism** (bordes semi-redondeados, desenfoques de fondo). Tema predominantemente oscuro con color de acento Naranja Coral (`#FF6B4A`).
- **Iconografía:** `lucide-react` para mantener limpieza visual.
- **Escaneo QR:** `html5-qrcode` para lectura óptica desde dispositivos de staff.
- **Generación QR:** Librería `qrcode.react` para compilar el wallet dinámicamente en el dispositivo del cliente.

### Backend (API & Lógica de Negocio)
- **Runtime:** Node.js (Configurado estrictamente como ES Module mediante `"type": "module"` en `package.json`).
- **Framework:** Express.js gestionando rutas RESTful `/api/*`.
- **Autenticación:** JWT (JSON Web Tokens). Los payloads incluyen de forma inmutable el `id_rol` y el `barberia_id` del usuario en sesión.
- **Criptografía:** `bcryptjs` para el hashing seguro de contraseñas de Staff y Clientes.
- **Manejo del Tiempo:** Librería `dayjs` (con plugins `utc` y `timezone`). **Inmutable:** Todo el sistema funciona forzosamente bajo la zona horaria `America/Mexico_City`.

### Base de Datos
- **Motor:** SQLite3 impulsado por `better-sqlite3` operando en modo WAL (Write-Ahead Logging) para alta concurrencia en discos de estado sólido.
- **Estructura Cero-Instalación:** SQLite permite que toda la base viva en un solo archivo físico (`server/data/database.sqlite`), ideal para despliegues portátiles y volúmenes persistentes en Railway.
- **Script de Migraciones:** `server/scripts/migrate-multitenant.js` asegura inyectar nuevas tablas/columnas dinámicamente durante el arranque si una instancia de producción no está actualizada.

---

## ⚙️ 3. Reglas de Inviolabilidad (El Engrama)
Si estás leyendo esto para codificar sobre el sistema, respeta la santidad de estas tres directivas:
1. **El Candado Multi-Tenant:** Jamás escribas un `SELECT`, `UPDATE` o `DELETE` para tablas de negocio sin pasar el filtro `AND barberia_id = ?`.
2. **La Línea del Tiempo:** Usa exclusivamente `dayjs.tz(fecha, "America/Mexico_City")` o la función `datetime('now', 'localtime')` en queries de SQLite. Nunca dependas de la hora local del servidor del host.
3. **Persistencia de Railway:** La instancia de la DB debe ser construida priorizando la variable de entorno `process.env.DATABASE_URL` para asegurar que sobreviva recomplilaciones del contenedor en producción.

---

## �️ 4. Local Setup (Cómo correrlo en tu máquina o Antigravity)

El proyecto está dividido en dos monorepos funcionales: `/client` y `/server`. Ambos deben correr simultáneamente.

### Requisitos Previos:
- Node.js (V 18 o superior).
- Git (opcional, para ramas y control de versiones).

### Paso a Paso:

**Paso 1: Levantar el Backend (API & Base de Datos)**
```bash
# Navega al directorio del backend
cd server

# Instala dependencias
npm install

# Inicia el servidor de desarrollo (con hot-reload)
npm run dev
```
*El servidor arrancará en `http://localhost:3000`. Al correr, ejecutará automáticamente los scripts `schema.sql` y de migración para inicializar datos dummy si tu base está en blanco.*

**Paso 2: Levantar el Frontend (React App)**
Abre una segunda terminal y ejecuta:
```bash
# Navega al directorio de UI
cd client

# Instala dependencias
npm install

# Inicia Vite
npm run dev
```
*La aplicación cliente estará viva instantáneamente en `http://localhost:5173`.*

---

## 🧪 5. Datos de Prueba Locales (Semillas)
Para probar la aplicación inmediatamente, puedes iniciar sesión visitando `http://localhost:5173/login` usando cualquiera de estas cuentas inyectadas por defecto:

| Rol | Usuario / Teléfono | Contraseña | Contexto |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `superadmin@flow.com` | `admin123` | Control Global del SaaS |
| **Admin** | `admin@barberia.com` | `admin123` | Dueño del Tenant #1 |
| **Barbero** | `barber@barberia.com` | `admin123` | Staff de corte (Tenant #1) |
| **Cliente** | `9511289141` | `admin123` | Ingresa por `http://localhost:5173/cliente/login` |

¡Con esto estás listo para diseccionar, proponer iteraciones y evolucionar la plataforma Flow!
