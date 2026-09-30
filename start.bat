@echo off
setlocal
title AFK Bot Minecraft 26.3

set "NODE_SKIP_PLATFORM_CHECK=1"

if not exist "%~dp0node.exe" (
    echo [ERROR] node.exe was not found in the project directory.
    pause
    exit /b 1
)

set "PATH=%~dp0;%PATH%"

echo Starting AFK Bot...
"%~dp0node.exe" --max-old-space-size=128 --nouse-idle-notification index.js

if %errorlevel% neq 0 (
    echo.
    echo Bot exited with error code %errorlevel%.
    pause
)
