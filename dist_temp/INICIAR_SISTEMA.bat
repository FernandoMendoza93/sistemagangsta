@echo off
chcp 65001 >nul
title Sistema de Gestión para Barbería - The Gangsta Barber Shop
color 0A
cls

REM Configurar Node.js portable
set NODE_PATH=%~dp0nodejs
set PATH=%NODE_PATH%;%PATH%

echo ╔════════════════════════════════════════════════════════════════╗
echo ║     SISTEMA DE GESTIÓN PARA BARBERÍA - INICIANDO...           ║
echo ║                    The Gangsta Barber Shop                     ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo [1/2] Iniciando servidor backend...
echo.

REM Iniciar el servidor en segundo plano
start "Servidor Backend - Puerto 3000" cmd /k "cd /d %~dp0server && "%NODE_PATH%\npm.cmd" run dev"
timeout /t 4 /nobreak >nul

echo ✅ Servidor backend iniciado en http://localhost:3000
echo.
echo [2/2] Iniciando cliente frontend...
echo.

REM Iniciar el cliente en segundo plano  
start "Cliente Frontend - Puerto 5173" cmd /k "cd /d %~dp0client && "%NODE_PATH%\npm.cmd" run dev"
timeout /t 6 /nobreak >nul

echo ✅ Cliente frontend iniciado
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    SISTEMA INICIADO                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 🌐 Abriendo el sistema en tu navegador...
echo.
echo Si no se abre automáticamente, visita: http://localhost:5173
echo.
echo Credenciales:
echo   📧 Usuario: admin@barberia.com
echo   🔑 Contraseña: admin123
echo.
echo ⚠️  IMPORTANTE: No cierres esta ventana ni las ventanas del servidor
echo.

REM Esperar a que se inicie completamente
timeout /t 8 /nobreak >nul

REM Abrir navegador
start http://localhost:5173

echo.
echo Presiona cualquier tecla para salir (esto NO detendrá el sistema)
pause >nul
