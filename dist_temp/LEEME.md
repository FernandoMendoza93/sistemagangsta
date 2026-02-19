# 🚀 Sistema Gangsta Barber Shop - VERSIÓN PORTABLE

## ✨ VENTAJA: ¡NO NECESITAS INSTALAR NADA!

Este paquete incluye **Node.js portable** - solo descomprime y ejecuta.

---

## 📦 INSTRUCCIONES DE USO

### 1️⃣ PRIMERA VEZ (Instalación)

1. **Descomprime** el archivo ZIP en cualquier carpeta
   - Ejemplo: `C:\SistemaGangsta\`
   - ⚠️ No uses rutas con caracteres especiales

2. **Ejecuta** `INSTALAR.bat` (doble clic)
   - Esto descargará las dependencias necesarias
   - Tardará 10-15 minutos aproximadamente
   - Necesitas **conexión a internet** solo para este paso
   - Verás el mensaje "INSTALACIÓN COMPLETA"

### 2️⃣ USO DIARIO  

1. **Ejecuta** `INICIAR_SISTEMA.bat` (doble clic)
   - Se abrirán 2 ventanas de terminal (NO las cierres)
   - El navegador se abrirá automáticamente
   - Si no se abre, visita: `http://localhost:5173`

2. **Inicia sesión:**
   ```
   📧 Usuario: admin@barberia.com
   🔑 Contraseña: admin123
   ```

### 3️⃣ DETENER EL SISTEMA

- Ejecuta `DETENER_SISTEMA.bat`
- O cierra las ventanas de terminal

---

## ✅ VENTAJAS DE ESTA VERSIÓN

- ✅ **No requiere instalación de Node.js**
- ✅ **100% portable** - lleva el sistema en una USB
- ✅ **Funciona sin internet** (después de la instalación inicial)
- ✅ **No modifica tu sistema** - todo está contenido en una carpeta
- ✅ **Fácil de desinstalar** - solo elimina la carpeta

---

## 📊 CARACTERÍSTICAS

### Módulos Incluidos

- 🏪 **Punto de Venta** - Registro rápido de ventas
- 💰 **Corte de Caja** - Control de ingresos/gastos
- 👥 **Personal** - Gestión de barberos
- 💎 **Comisiones** - Cálculo automático
- 📦 **Inventario** - Control de stock
- ✂️ **Servicios** - Catálogo de servicios
- 📈 **Reportes** - Estadísticas

### Usuarios Precargados

El sistema viene con estos usuarios de prueba:

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Administrador | admin@barberia.com | admin123 | Admin |
| Carlos García | carlos@barberia.com | admin123 | Encargado |
| Juan Pérez | juan@barberia.com | admin123 | Barbero |

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### ❌ Error al instalar dependencias
- Verifica tu **conexión a internet**
- Ejecuta `INSTALAR.bat` como **Administrador**
- Desactiva temporalmente tu antivirus

### ❌ Puerto en uso
- Ejecuta `DETENER_SISTEMA.bat`
- Reinicia la computadora

### ❌ No se abre el navegador
- Espera 15 segundos después de ver las ventanas
- Abre manualmente: `http://localhost:5173`

### ❌ No puedo iniciar sesión
- Usuario: `admin@barberia.com`
- Contraseña: `admin123`
- Asegúrate que el servidor esté corriendo (ventana "Puerto 3000")

---

## 📁 ESTRUCTURA DEL PAQUETE

```
SistemaGangsta/
├── nodejs/              ← Node.js portable (incluido)
├── client/              ← Aplicación web
├── server/              ← Servidor backend
├── INSTALAR.bat         ← Ejecutar UNA VEZ
├── INICIAR_SISTEMA.bat  ← Ejecutar para usar
├── DETENER_SISTEMA.bat  ← Para cerrar
└── LEEME.md            ← Este archivo
```

---

## 💾 COPIAS DE SEGURIDAD

Para respaldar tus datos:

1. Copia el archivo `server/database.sqlite`
2. Guárdalo en un lugar seguro
3. Para restaurar, reemplaza el archivo

---

## 🔐 SEGURIDAD

- ⚠️ **CAMBIA LA CONTRASEÑA** del administrador después del primer inicio
- 🔒 El sistema usa autenticación JWT segura
- 🛡️ Control de roles y permisos

---

## 📞 SOPORTE

Si tienes problemas:

1. Lee la sección "Solución de Problemas"
2. Verifica que completaste la instalación inicial
3. Asegúrate de tener internet durante `INSTALAR.bat`

---

**Versión**: 1.0 Portable  
**Incluye**: Node.js v20.18.0 Portable  
**Tamaño Total**: ~180 MB (después de instalar)

¡Disfruta del sistema! 💈✨
