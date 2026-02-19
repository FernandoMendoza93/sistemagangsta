@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════════╗
echo ║          DETENER SISTEMA - The Gangsta Barber Shop            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Deteniendo todos los procesos del sistema...
echo.

REM Matar solo los procesos de node que estén en esta carpeta
taskkill /F /FI "WINDOWTITLE eq Servidor Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Cliente Frontend*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

echo ✅ Sistema detenido correctamente
echo.
echo Presiona cualquier tecla para salir...
pause >nul
