@echo off
title ThreatGuard Launcher
echo ========================================
echo    ThreatGuard Desktop - Iniciando...
echo ========================================
echo.

REM Verificar si la API está corriendo
echo [1/3] Verificando API en puerto 8000...
netstat -an | find "8000" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo      API no detectada, iniciando...
    start /B "" cmd /c "cd /d C:\ThreatGuard && C:\Python314\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
    timeout /t 3 /nobreak >nul
) else (
    echo      API ya corriendo OK
)

echo [2/3] Iniciando ThreatGuard Desktop...
cd /d "C:\Users\Matias\Desktop\Threatguard-3.0-master\ThreatGuard-Desktop"

echo [3/3] Abriendo aplicacion...
npm start

echo.
echo ThreatGuard cerrado.
pause
