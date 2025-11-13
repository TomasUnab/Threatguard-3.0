@echo off
echo ========================================
echo Actualizando repositorio ThreatGuard
echo ========================================
echo.

echo [1/4] Agregando cambios al staging...
git add "PAGINA WEB/executive_summary/code.html"
git add threatguard_api.py

echo.
echo [2/4] Creando commit...
git commit -m "Fix: Actualizar tabla de alertas para carga dinamica en tiempo real

- Tabla Top 5 Alertas ahora se actualiza cada 5 segundos
- Muestra alertas de todas las fuentes (ML Model, Snort IDS, etc.)
- Soporte para todos los niveles de prioridad (ALTA, MEDIA, BAJA, BENIGNO)
- Colores diferenciados por prioridad
- Sin cache del navegador con timestamp en peticiones
- Endpoint /dashboard/stats optimizado"

echo.
echo [3/4] Subiendo cambios a GitHub...
git push origin master

echo.
echo [4/4] Reconstruyendo contenedor Docker...
docker-compose down
docker-compose build --no-cache threatguard-api nginx
docker-compose up -d

echo.
echo ========================================
echo Actualizacion completada!
echo ========================================
pause
