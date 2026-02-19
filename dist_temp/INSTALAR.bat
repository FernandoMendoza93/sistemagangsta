@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     SISTEMA DE GESTIÓN PARA BARBERÍA - INSTALADOR v1.0        ║
echo ║                    The Gangsta Barber Shop                     ║
echo ║                     VERSIÓN PORTABLE                           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Este paquete incluye Node.js portable - NO necesitas instalar nada
echo.

REM Configurar Node.js portable
set NODE_PATH=%~dp0nodejs
set PATH=%NODE_PATH%;%PATH%

echo [PASO 1/4] Verificando Node.js portable...
"%NODE_PATH%\node.exe" --version
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: No se encontró Node.js portable
    echo.
    echo Por favor descarga el paquete completo que incluye Node.js
    pause
    exit /b 1
)
echo ✅ Node.js portable encontrado
echo.

echo [PASO 2/4] Instalando dependencias del servidor...
echo (Esto puede tardar 5-10 minutos)
echo.
cd server
call "%NODE_PATH%\npm.cmd" install --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error al instalar dependencias del servidor
    pause
    exit /b 1
)
cd ..
echo ✅ Dependencias del servidor instaladas
echo.

echo [PASO 3/4] Instalando dependencias del cliente...
echo (Esto puede tardar 5-10 minutos)
echo.
cd client
call "%NODE_PATH%\npm.cmd" install --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error al instalar dependencias del cliente
    pause
    exit /b 1
)
cd ..
echo ✅ Dependencias del cliente instaladas
echo.

echo [PASO 4/4] Inicializando base de datos...
cd server
if exist database.sqlite (
    echo ℹ️  Base de datos existente encontrada
) else (
    echo ✅ Base de datos se creará al iniciar el sistema
)
cd ..
echo.

echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    INSTALACIÓN COMPLETA                        ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ✅ El sistema está listo para usarse
echo.
echo Para iniciar: Haz doble clic en INICIAR_SISTEMA.bat
echo.
echo Credenciales de acceso:
echo   📧 Usuario: admin@barberia.com
echo   🔑 Contraseña: admin123
echo.
pause
