@echo off
setlocal
title AFK Bot Minecraft 26.3

set "NODE_SKIP_PLATFORM_CHECK=1"

if exist "%~dp0node.exe" (
    set "PATH=%~dp0;%PATH%"
    goto check_modules
)

where node >nul 2>nul
if %errorlevel% equ 0 goto check_modules

if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    goto check_modules
)

if exist "C:\nodejs\node.exe" (
    set "PATH=C:\nodejs;%PATH%"
    goto check_modules
)

if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
    goto check_modules
)

echo [ERRO] Node.js nao foi encontrado no sistema.
echo Para Windows 7 32 bits, descarregue o Node.js 18.20.8 x86 para C:\nodejs ou C:\Program Files (x86)\nodejs
pause
exit /b 1

:check_modules
if exist "node_modules\" goto run_bot
echo A instalar dependencias necessarias...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias com npm.
    pause
    exit /b 1
)

:run_bot
echo A iniciar o bot AFK...
node --max-old-space-size=128 --nouse-idle-notification index.js

if %errorlevel% neq 0 (
    echo.
    echo O bot terminou com codigo de erro %errorlevel%.
    pause
)
