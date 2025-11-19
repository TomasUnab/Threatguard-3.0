@echo off
REM Script para construir el instalador de ThreatGuard Agent para Windows

echo ========================================
echo   ThreatGuard Agent - Build Script
echo ========================================
echo.

echo [1/4] Instalando dependencias...
pip install -r requirements-agent-client.txt
pip install pyinstaller

echo.
echo [2/4] Limpiando builds anteriores...
if exist "dist" rmdir /s /q dist
if exist "build" rmdir /s /q build

echo.
echo [3/4] Creando ejecutable con PyInstaller...
pyinstaller build_agent.spec --clean --noconfirm

if not exist "dist\ThreatGuard-Agent.exe" (
    echo ERROR: No se pudo crear el ejecutable
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build completado exitosamente!
echo   Ejecutable: dist\ThreatGuard-Agent.exe
echo ========================================
echo.
echo Probando ejecutable...
echo Para crear un instalador, puedes usar Inno Setup
echo Descarga: https://jrsoftware.org/isdl.php
echo.
pause
