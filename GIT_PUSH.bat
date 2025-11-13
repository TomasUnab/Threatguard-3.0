@echo off
echo ========================================
echo ThreatGuard - Git Push Script
echo ========================================
echo.

REM Verificar si estamos en un repositorio git
if not exist ".git" (
    echo ERROR: No se encontro repositorio Git
    echo Ejecuta primero: git init
    pause
    exit /b 1
)

echo [1/5] Agregando archivos al staging...
git add .

echo.
echo [2/5] Creando commit...
set /p commit_msg="Ingresa mensaje del commit: "
if "%commit_msg%"=="" (
    set commit_msg=Update: Nuevas funcionalidades agregadas
)
git commit -m "%commit_msg%"

echo.
echo [3/5] Verificando rama actual...
git branch

echo.
echo [4/5] Verificando remote...
git remote -v

echo.
echo [5/5] Subiendo cambios...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo Intentando con 'master' en lugar de 'main'...
    git push origin master
)

echo.
echo ========================================
echo Cambios subidos exitosamente!
echo ========================================
pause
