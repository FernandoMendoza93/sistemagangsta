# 🧠 FLOW SAAS — AGENT CORE (V3.0 — MYSQL + AUDIT EDITION)

---

## 1. 🛡️ PROTOCOLOS DE OPERACIÓN
- **Modos Estrictos**: [FRONTEND], [BACKEND], [DB_SQL], [SECURITY].
- **Plan Mode**: Antes de escribir código, proponer: 🎯 Objetivo, 🏗️ Archivos (Scope), ⚠️ Riesgos, 🛠️ Procedimiento.
- **Human Gate**: Bloqueo obligatorio hasta recibir "Proceed" del usuario.

---

## 2. 🏛️ INFRAESTRUCTURA (REGLAS INMUTABLES)
- **Stack**: React (5173), Node/Express (3000), MySQL Puro (`mysql2/promise`).
- **Entorno**: Railway (Producción). Variables MySQL autoinyectadas como `MYSQL*`.
- **Ley Multi-tenant**: Toda consulta DEBE incluir `WHERE barberia_id = ?`. El ID se extrae de `req.barberia_id` vía JWT Middleware.
- **Identidad SA**: `superadmin@flow.com` / `admin123`
- **Timezone**: `process.env.TZ = 'America/Mexico_City'` (forzado en `index.js`).
- **Base de Datos**: 24 tablas en local. Ver §8 para inventario completo.

---

## 3. 🎨 ADN VISUAL (LUXURY MODE)
- **Paleta Base**: Negro Cuero, Oro Industrial, Champán Mate. Acento Coral `#FF6B4A`.
- **UI**: Bento Grid, Glassmorphism (`backdrop-filter: blur`), Bordes redondeados (16px+).
- **UX Estricta**:
  - Modales: backdrop click **DESACTIVADO** (no cerrar al hacer clic fuera).
  - Inputs Numéricos: `onFocus={(e) => e.target.select()}`. Ocultar spinners. Sin ceros iniciales.
  - Botones táctiles: Área mínima 44px × 44px.
- **Iconos**: `lucide-react` exclusivamente.
- **Motor de Temas**: 15 paletas en tabla `temas`. Variables CSS inyectadas en `:root` vía `ThemeContext.jsx`. Detección dark/light automática por luminosidad HSL.

---

## 4. 🗂️ ENGRAMAS (BITÁCORA DE BUGS CRÍTICOS)

| ID | Nombre | Descripción |
|---|---|---|
| 001 | **SMTP Multi-tenant** | Credenciales de correo en `barberia_smtp_settings`. Password cifrada con `crypto-js` (AES-256). REQUIERE `SMTP_ENCRYPTION_KEY` en `.env`. Si la key cambia, las passwords existentes son irrecuperables. |
| 002 | **Error 404 de Rutas** | Al crear endpoints: 1) Registrar en `index.js`. 2) No repetir prefijos. 3) Headers `Authorization: Bearer` en fetch del Frontend. |
| 003 | **Notificaciones RT** | WebSockets + Audio (mp3) + TTS (Voz). Siempre combinar con Toast visual de `sonner`. |
| 004 | **SQL Case Sensitivity** | Usar `LOWER(columna) IN ('valor')` o `LIKE` para evitar fallos por mayúsculas en roles de la BD. |
| 005 | **Migraciones en Railway** | Si la BD de producción ya existe, `schema.mysql.sql` NO crea tablas nuevas automáticamente. **No existe script de migración automática.** Toda tabla nueva debe ejecutarse con SQL manual en Railway. |
| 006 | **Dual Theme Binding** | La tabla `barberias` tiene dos mecanismos de vinculación de tema: `theme` (nombre texto) y `tema_id` (FK relacional). Ambos coexisten. El endpoint público usa `theme` + string matching; el privado usa `tema_id` + JOIN por FK. |
| 007 | **ESM vs CommonJS Strictness** | El proyecto es 100% ESM (`type: "module"`). Nunca usar `require` o `module.exports` en rutas o archivos del servidor. Node 20 fallará en `export` si se interpreta como CommonJS. |
| 008 | **Cierre de Llaves en Rutas** | Al agregar endpoints al final de un archivo (como en `barberos.js`), asegurar que los anteriores estén cerrados con `});` y no queden abiertos, lo que causa errores de sintaxis en el `export`. |

---

## 5. 🛠️ PROTOCOLO DE DESARROLLO (ANTI-ERRORS)
- **DB First**: Antes de crear lógica de negocio, ejecutar `DESCRIBE tabla` o `SELECT` de prueba para confirmar columnas.
- **CORS & Proxy**: En local, las peticiones van al proxy de Vite. En producción, asegurar que Origin de Railway esté permitido.
- **Clean Inputs**: Antes de escribir en un input en tests: `Focus → Select All → Delete → Type`.
- **Railway MySQL**: Las variables se llaman `MYSQLHOST`, `MYSQLUSER`, etc. El `index.js` soporta ambos formatos con fallback: `process.env.MYSQLHOST || process.env.DB_HOST`.

---

## 6. 📱 ESTÁNDAR MOBILE-FIRST (Ley Estricta)
- **Responsividad**: PROHIBIDO entregar vistas que no sean Mobile-First (clases `sm:`, `md:`, `lg:`).
- **Colores Sagrados**: Naranja Coral `#FF6B4A` como acento por defecto. Temas dinámicos sobrescriben vía CSS vars.
- **UX Táctil**: Botones y modales deben ser cómodos para el pulgar (44px × 44px mínimo).
- **Protocolo de Entrega**: Auto-validar resoluciones pequeñas y contraste de Glassmorphism antes de commit.

---

## 7. ⌨️ PROTOCOLO DE INTERACCIÓN CON FORMULARIOS (Anti-Autofill)
Debido a injerencias del auto-completado de Chrome, los inputs pueden combinar cadenas con credenciales viciadas.
- **Acción Estricta** al interactuar con `<input>`:
  1. `Focus` (Clic o Tab)
  2. `Select All` (Ctrl+A)
  3. `Delete / Backspace`
  4. `Type` (cadena real)
- Aplicar para: Login, Cierre de citas, Creación de Horarios, Creación de Staff.

---

## 8. 🗄️ INVENTARIO DE BASE DE DATOS (24 tablas — MySQL)

### Tablas Core
| Tabla | Módulo | Columnas Clave |
|---|---|---|
| `barberias` | Tenants (17 cols) | `slug`, `logo_url`, `theme`, `tema_id`, `loyalty_card_image_url` |
| `roles` | RBAC | `id`, `nombre_rol` |
| `usuarios` | RBAC/Staff | `id_rol` FK → roles, `barberia_id` |
| `temas` | Identidad Visual (9 cols) | `bg_main`, `accent_primary`, `text_main`, `clase_glass` |

### Tablas Operativas
| Tabla | Módulo |
|---|---|
| `barberos` | Personal |
| `servicios` | Catálogo |
| `clientes` | CRM |
| `citas` | Agenda |
| `categorias` | Inventario |
| `productos` | Inventario |
| `movimientos_inventario` | Inventario |
| `ventas_cabecera` | POS |
| `ventas_detalle` | POS |
| `horarios_barberos` | Turnos |

### Tablas Financieras
| Tabla | Módulo |
|---|---|
| `comisiones_pendientes` | Comisiones |
| `comisiones_pagadas` | Comisiones |
| `cortes_caja` | Corte Diario |
| `gastos` | Gastos Operativos |
| `entradas_efectivo` | Entradas de Efectivo |

### Tablas de Módulos Especializados
| Tabla | Módulo | Estado en Railway |
|---|---|---|
| `visitas_lealtad` | Lealtad (sellos) | ✅ |
| `loyalty_tokens` | QR Tokens | ✅ |
| `notificaciones` | Notificaciones RT | ✅ |
| `barberia_smtp_settings` | SMTP/Marketing (15 cols) | ⚠️ **FALTA** |
| `barberia_lealtad_niveles` | Niveles VIP | ⚠️ **FALTA** |

---

## 9. 📧 ARQUITECTURA DE CORREOS (SMTP Multi-Tenant)

### Modelo
Cada barbería configura sus **propias credenciales SMTP** en `barberia_smtp_settings`. Si no tiene, se usa el transportador global (`MAIL_*` del `.env`).

### Stack
- **Librería**: `nodemailer`
- **Cifrado**: `crypto-js` (AES-256) vía `server/utils/encryption.js`
- **Servicio**: `server/services/emailService.js` (304 líneas, 4 funciones)
- **API**: `server/routes/settings.js` montado en `/api/settings`

### Funciones del emailService
| Función | Tipo | Trigger |
|---|---|---|
| `sendNewAppointmentEmail()` | Notificación | Cliente agenda cita |
| `createDynamicTransporter()` | Helper | Interno (descifra password) |
| `enviarRecordatorioCliente()` | Marketing | CRON / Anti-abandono |
| `enviarReporteManual()` | Reportes | Botón "Enviar Ahora" del admin |

### Templates
HTML inline (no archivos `.html` separados). Soportan variables: `{nombre_cliente}`, `{nombre_barberia}`.

---

## 10. 🗺️ MAPA DE RUTAS (18 archivos de rutas)

| Archivo | Prefijo | Módulo |
|---|---|---|
| `auth.js` | `/api/auth` | Login, Register, JWT |
| `usuarios.js` | `/api/usuarios` | RBAC, Staff, `GET /staff-admin` |
| `barberos.js` | `/api/barberos` | Personal |
| `servicios.js` | `/api/servicios` | Catálogo |
| `productos.js` | `/api/productos` | Inventario |
| `ventas.js` | `/api/ventas` | POS |
| `corteCaja.js` | `/api/corte-caja` | Cortes |
| `reportes.js` | `/api/reportes` | Dashboard |
| `clientes.js` | `/api/clientes` | CRM |
| `citas.js` | `/api/citas` | Agenda |
| `loyalty.js` | `/api/loyalty` | QR + Stamps + SSE |
| `lealtad.js` | `/api/lealtad` | Plan Config |
| `superadmin.js` | `/api/superadmin` | Puente de Mando |
| `themes.js` | `/api/super` | Temas + Cloudinary + **Endpoint Público** |
| `horarios.js` | `/api/horarios` | Turnos |
| `notificaciones.js` | `/api/notificaciones` | Campanita RT |
| `escaner.js` | `/api/escaner` | Escáner QR |
| `settings.js` | `/api/settings` | SMTP Config + Test + Reportes |

---

## 11. 🔑 VARIABLES DE ENTORNO (16 requeridas)

### Obligatorias para arranque
| Variable | Módulo |
|---|---|
| `DB_HOST` | MySQL |
| `DB_USER` | MySQL |
| `DB_PASSWORD` | MySQL |
| `DB_NAME` | MySQL |

### Seguridad (con fallbacks inseguros)
| Variable | Módulo | Fallback |
|---|---|---|
| `JWT_SECRET` | Auth | `barberia-secret-key-2024` ⚠️ |
| `SMTP_ENCRYPTION_KEY` | Correos | `Fl0wB@rb3r_T3mp0ral_S3cUr1ty_K3y!2026` ⚠️ |

### Servicios Externos
| Variable | Módulo |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Identidad Visual |
| `CLOUDINARY_API_KEY` | Identidad Visual |
| `CLOUDINARY_API_SECRET` | Identidad Visual |

### SMTP Global (Fallback)
| Variable | Default |
|---|---|
| `MAIL_HOST` | smtp.gmail.com |
| `MAIL_PORT` | 587 |
| `MAIL_USER` | — |
| `MAIL_PASS` | — |

### Aplicación
| Variable | Default |
|---|---|
| `PORT` | 3000 |
| `NODE_ENV` | development |
| `FRONTEND_URL` | http://localhost:5173 |
