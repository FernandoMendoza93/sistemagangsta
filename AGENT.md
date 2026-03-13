# 🧠 FLOW SAAS - AGENT CORE DIRECTIVES & ENGRAM

Este archivo representa la memoria persistente y las reglas operativas del Agente de IA para el proyecto Flow SaaS. Su propósito es actuar como "Engrama" para evitar la regresión de bugs, aplicar estrictamente las preferencias del desarrollador principal (Human Gate), y evitar la sobrecarga de contexto ("God Agent").

## 1. 🛡️ PROTOCOLOS DE OPERACIÓN (Anti God-Agent)
- **Scope Limitado**: Prohibido hacer cambios Full-Stack masivos de un solo golpe. Las tareas deben ejecutarse de forma atómica.
- **Declaración de Modo**: El Agente debe operar bajo modos específicos: `[FRONTEND_UI]`, `[BACKEND_API]`, `[DB_MIGRATION]`, `[SECURITY]`. Está estrictamente prohibido alterar archivos fuera del scope de la tarea actual.
- **Plan Mode (Human Gate)**: Antes de realizar modificaciones destructivas o complejas en la base de código, el Agente debe proponer un Plan de Acción breve estructurado de la siguiente manera:
  - 🎯 **Objetivo**
  - 🏗️ **Archivos a Modificar (Scope)**
  - ⚠️ **Análisis de Riesgos (Side-effects)**
  - 🛠️ **Procedimiento (Checklist paso a paso)**
  - 🔍 **Auto-Validación**: "He verificado que este cambio no rompe la regla Multi-tenant del Engram 002".
  - *Bloqueo: Esperar confirmación "Proceed" o "Hazlo" del Human Gate.*

## 2. 🏛️ INFRAESTRUCTURA INMUTABLE (Anti Amnesia)
- **Entorno de Producción**: Railway.
- **Entorno Local (Desarrollo)**: 
  - Backend API: `http://localhost:3000`
  - Frontend React: `http://localhost:5173`
  - *Evitar iniciar múltiples terminales en puertos colisionados.*
- **Credenciales Frecuentes (Datos Semilla)**:
  - SuperAdmin: `superadmin@flow.com` / `admin123`
  - Admin (Tenant 1): `admin@barberia.com` / `admin123`
  - Cliente Prueba (Pedro): Teléfono `9511289141` / `admin123`
- **Motor de Base de Datos**: SQLite (Multi-tenant) con `better-sqlite3`.
- **Rutas y Volúmenes**: 
  - La conexión SQLite DEBE usar siempre la validación para Railway: `const dbPath = process.env.DATABASE_URL || join(__dirname, 'data', 'database.sqlite');`
  - Esto evita crear bases temporales que ignoran el Volumen Persistente de producción (`/app/server/data`).
- **Zona Horaria Estricta**: Todas las instancias y consultas que usen tiempo actual deben respetar `process.env.TZ = 'America/Mexico_City'` y `datetime('now', 'localtime')`.
- **Ley Multi-tenant**: Toda consulta (SELECT, UPDATE, DELETE) en tablas maestras debe filtrar el contexto usando `WHERE barberia_id = ?`.

## 3. 🎨 ADN DE DISEÑO (UI / UX Preferences)
- **Framework Oculto**: CSS Vanilla adaptado a componentes de React modulares.
- **Layout y Filosofía**: Diseño tipo "Bento Grid". Interfaces modulares en tarjetas o bloques.
- **Aesthetic**: Minimalismo intensivo. Evitar cargar la pantalla con información redundante.
- **Efectos Visuales**: Aprovechar el "Glassmorphism" (fondos translúcidos con `backdrop-filter: blur`, modales superpuestos suaves). Bordes con radio amplio (semi-redondeados).
- **Paleta de Colores**: Tema prioritariamente oscuro/sofisticado con interfaces limpias. Color de acento corporativo: **Naranja Coral** (`#FF6B4A`) u otros tonos cálidos/vibrantes.
- **Tipografía e Iconografía**: Fuente moderna sans-serif. Uso de iconos elegantes y consistentes desde `lucide-react`.

## 4. 🗂️ ENGRAMAS (Bitácora de Aprendizajes y Bugs Clásicos)
Esta lista debe crecer con el tiempo para recordar al Agente los problemas pasados de este proyecto específico.

- **[Engram 001 - QR de Lealtad y Sesiones Expiradas]**: Si un cliente llega con un JWT obsoleto (sin `barberia_id` en el payload tras la migración multi-tenant), el backend arrojará un error silencioso 404 al intentar armar su Wallet QR. 
  * *Prevención:* Siempre debe existir un bloque `catch` en el `Promise.all` del frontend (`ClientePortalPage`) que detecte este fallo de red y muestre un aviso forzado para que el cliente cierre y vuelva a iniciar sesión. Nunca dejar pantallas de "Cargando..." infinitas.
  
- **[Engram 002 - Migraciones de SQLite en Railway]**: En despliegues nuevos en producción, si la base de datos de Railway ya existe (Volumen Persistente) pero carece de nuevas tablas (ej. `visitas_lealtad`), el archivo maestro `schema.sql` NO las creará automáticamente para evitar corromper datos previos.
  * *Prevención:* Toda tabla o columna estructural nueva debe inyectarse con un comando `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` directamente en el script de arranque dinámico (`server/scripts/migrate-multitenant.js`) para que se procese de forma garantizada antes de inicializar Express.
