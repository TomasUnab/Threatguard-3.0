@echo off
echo ========================================
echo MONITOREANDO ATAQUES EN TIEMPO REAL
echo ========================================
echo.
echo Ejecuta el ataque desde tu otra VM y presiona ENTER cuando termines...
pause
echo.
echo Verificando alertas...
echo.

ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker exec threatguard-snort tail -30 /var/log/snort/alert"

echo.
echo ========================================
echo Presiona cualquier tecla para salir...
pause > nul
