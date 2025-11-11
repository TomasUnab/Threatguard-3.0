@echo off
REM Script para construir el instalador de ThreatGuard Agent

echo ========================================
echo   ThreatGuard Agent - Build Script
echo ========================================
echo.

echo [1/3] Activando entorno virtual...
call .venv\Scripts\activate.bat

echo.
echo [2/3] Instalando dependencias...
python -m pip install customtkinter pillow pyinstaller requests pystray psutil

echo.
echo [3/3] Creando ejecutable con PyInstaller...
python -m PyInstaller build_agent.spec --clean

if not exist "dist\ThreatGuard-Agent.exe" (
    echo ERROR: No se pudo crear el ejecutable
    pause
    exit /b 1
)

echo.
echo [4/4] Creando instalador con Inno Setup...
echo NOTA: Debes tener Inno Setup instalado
echo Descarga: https://jrsoftware.org/isdl.php
echo.
echo Ejecuta manualmente:
echo "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
echo.

echo ========================================
echo   Build completado exitosamente!
echo   Ejecutable: dist\ThreatGuard-Agent.exe
echo ========================================
pause
