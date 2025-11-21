@echo off
REM Script de limpieza rápida para ThreatGuard 3.0 (Windows)
REM Ejecuta la limpieza de logs antiguos vía API

echo ============================================================
echo   LIMPIEZA DE LOGS - ThreatGuard 3.0
echo ============================================================
echo.

set API_URL=http://localhost:8000

REM Verificar conexión API
echo [1/3] Verificando API...
curl -s -f %API_URL%/health >nul 2>&1
if errorlevel 1 (
    echo [ERROR] API no responde en %API_URL%
    echo Asegurate de que los contenedores esten corriendo:
    echo    docker-compose up -d
    pause
    exit /b 1
)
echo [OK] API respondiendo correctamente
echo.

REM Mostrar estadísticas antes
echo [2/3] Estadisticas ANTES de la limpieza:
curl -s %API_URL%/dashboard/stats
echo.
echo.

REM Ejecutar limpieza
echo [3/3] Ejecutando limpieza...
echo.
curl -X POST "%API_URL%/maintenance/cleanup?days_closed=30&days_open=90&days_low=7&days_benign=3"
echo.
echo.

echo ============================================================
echo   LIMPIEZA COMPLETADA
echo ============================================================
echo.
echo Para ver estadisticas actualizadas:
echo    curl %API_URL%/dashboard/stats
echo.
pause
