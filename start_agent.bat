@echo off
REM Script para iniciar el agente de logs en Windows

echo ========================================
echo   ThreatGuard - Agente de Logs
echo ========================================
echo.

REM Verificar si existe el archivo de configuracion
if not exist "config\agent.ini" (
    echo ERROR: No se encuentra config\agent.ini
    echo Por favor, configurar la IP del maestro en config\agent.ini
    pause
    exit /b 1
)

echo Iniciando agente de logs...
python log_agent.py

pause
