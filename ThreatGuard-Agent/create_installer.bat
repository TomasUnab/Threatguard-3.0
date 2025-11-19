@echo off
REM Script para crear el instalador de ThreatGuard Agent usando Inno Setup

echo ========================================
echo   ThreatGuard Agent - Crear Instalador
echo ========================================
echo.

REM Verificar si existe el ejecutable
if not exist "dist\ThreatGuard-Agent.exe" (
    echo ERROR: No se encuentra el ejecutable ThreatGuard-Agent.exe
    echo Por favor, ejecuta primero: python -m PyInstaller build_agent.spec --noconfirm
    pause
    exit /b 1
)

REM Ruta de Inno Setup (ajusta si está instalado en otra ubicación)
set INNO_SETUP="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

REM Verificar si Inno Setup está instalado
if not exist %INNO_SETUP% (
    echo ERROR: Inno Setup no está instalado
    echo.
    echo Descarga Inno Setup desde: https://jrsoftware.org/isdl.php
    echo.
    echo Rutas comunes de instalación:
    echo   - C:\Program Files (x86)\Inno Setup 6\ISCC.exe
    echo   - C:\Program Files\Inno Setup 6\ISCC.exe
    echo.
    pause
    exit /b 1
)

echo [1/2] Compilando script de Inno Setup...
%INNO_SETUP% setup.iss

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Falló la compilación del instalador
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Instalador creado exitosamente!
echo ========================================
echo.

REM Buscar el instalador creado
if exist "..\installer_output\ThreatGuard-Agent-Setup.exe" (
    echo Ubicación: ..\installer_output\ThreatGuard-Agent-Setup.exe
    echo.
    
    REM Mostrar tamaño del instalador
    for %%A in ("..\installer_output\ThreatGuard-Agent-Setup.exe") do (
        set size=%%~zA
        set /A sizeMB=!size!/1048576
        echo Tamaño: !sizeMB! MB
    )
    
    echo.
    echo ¿Deseas probar el instalador? (S/N)
    choice /C SN /N
    if errorlevel 2 goto end
    if errorlevel 1 (
        echo.
        echo Abriendo el instalador...
        start "" "..\installer_output\ThreatGuard-Agent-Setup.exe"
    )
) else (
    echo ADVERTENCIA: No se encuentra el instalador en la ubicación esperada
)

:end
echo.
pause
