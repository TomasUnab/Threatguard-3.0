@echo off
echo ========================================
echo Reconstruyendo contenedores ThreatGuard
echo ========================================
echo.

echo [1/4] Deteniendo contenedores...
docker-compose down

echo.
echo [2/4] Eliminando imagenes antiguas...
docker rmi threatguard-3.0-master-api 2>nul
docker rmi threatguard-3.0-master-snort-integration 2>nul
docker rmi threatguard-3.0-master-web 2>nul

echo.
echo [3/4] Reconstruyendo imagenes...
docker-compose build --no-cache

echo.
echo [4/4] Iniciando contenedores...
docker-compose up -d

echo.
echo ========================================
echo Contenedores reconstruidos exitosamente
echo ========================================
echo.
echo Verificando estado...
docker-compose ps

echo.
echo Logs disponibles con: docker-compose logs -f
pause
