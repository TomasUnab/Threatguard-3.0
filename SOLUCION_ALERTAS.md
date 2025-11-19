# 🔧 SOLUCIÓN - Alertas de Alta Prioridad en ThreatGuard

## ✅ PROBLEMAS IDENTIFICADOS Y SOLUCIONADOS

### 1. **Snort NO estaba funcionando** ❌ → ✅ SOLUCIONADO
**Problema:** Errores de sintaxis en `local.rules` con `priority: = 0` (espacio incorrecto)
**Solución:** Corregido a `priority:1` sin espacios
**Estado:** ✅ Snort ahora funciona correctamente

### 2. **Mapeo incorrecto de prioridades** ❌ → ✅ SOLUCIONADO
**Problema:** En `snort_integration.py`, priority:0 se mapeaba a "BAJA" cuando debería ser "ALTA"
**Solución:** Corregido el mapeo:
```python
priority_map = {
    "0": "ALTA",      # Ataques críticos
    "1": "ALTA",      # Ataques críticos  
    "2": "MEDIA",     # Reconocimiento/escaneos
    "3": "BAJA"       # Anomalías menores
}
```
**Estado:** ✅ Las prioridades ahora se mapean correctamente

## 📊 REGLAS ACTIVAS DE SNORT

### Reglas con PRIORIDAD ALTA (priority:1):
1. **ICMP Flood Attack** - 50+ pings en 5 segundos
2. **ICMP with Suspicious Payload** - Payload > 1000 bytes
3. **SSH Brute Force** - 5+ intentos en 60 segundos al puerto 22
4. **RDP Brute Force** - 5+ intentos en 60 segundos al puerto 3389
5. **FTP Brute Force** - 5+ intentos en 60 segundos al puerto 21
6. **SMB Brute Force** - 5+ intentos en 60 segundos al puerto 445
7. **SQL Injection** - Patrones UNION, OR 1=1, --
8. **XSS Attacks** - <script>, onerror=, onload=
9. **Command Injection** - cmd.exe, /bin/sh, powershell
10. **File Upload Attacks** - .php, .jsp con código malicioso
11. **SYN Flood** - 100+ SYN en 10 segundos
12. **HTTP Flood** - 100+ requests en 10 segundos
13. **UDP Flood** - 200+ paquetes en 10 segundos
14. **Reverse Shell** - Conexiones a puertos 4444, 5555, 6666, etc.
15. **Ransomware** - SMB traffic spike, múltiples conexiones salientes
16. **Exploits** - EternalBlue, Log4Shell, Shellshock

### Reglas con PRIORIDAD MEDIA (priority:2):
- ICMP Ping Sweep
- Port Scans (SYN, NULL, XMAS)
- Directory Traversal
- DNS Amplification
- Network Anomalies

## 🧪 CÓMO GENERAR ALERTAS DE ALTA PRIORIDAD

### Opción 1: ICMP Flood (MÁS FÁCIL)
```bash
# Desde el servidor EC2
sudo docker exec -d threatguard-api sh -c "for i in \$(seq 1 60); do ping -c 1 172.18.0.2; done"
```

### Opción 2: SSH Brute Force
```bash
# Generar 10 intentos de conexión SSH
for i in {1..10}; do
    timeout 1 telnet 172.18.0.2 22 2>/dev/null
    sleep 1
done
```

### Opción 3: HTTP Flood
```bash
# Generar 150 requests HTTP en 5 segundos
for i in {1..150}; do
    curl -s http://localhost:8080 > /dev/null &
done
wait
```

### Opción 4: PostgreSQL Brute Force (RECOMENDADO)
```bash
# Generar intentos de conexión a PostgreSQL
for i in {1..10}; do
    timeout 1 telnet localhost 5432 2>/dev/null
    sleep 1
done
```

## 🎯 VERIFICAR ALERTAS

### 1. Ver logs de integración Snort:
```bash
ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker logs threatguard-snort-integration --tail 50"
```

### 2. Ver alertas de Snort directamente:
```bash
ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker exec threatguard-snort tail -20 /var/log/snort/alert"
```

### 3. Verificar en el Dashboard:
- Abrir: http://localhost:8080
- Las alertas ALTA deberían aparecer en el panel principal

## 📝 ESTADO ACTUAL

✅ **Snort:** Funcionando correctamente
✅ **Integración Snort:** Enviando alertas a la API
✅ **Mapeo de prioridades:** Corregido (0,1=ALTA, 2=MEDIA, 3=BAJA)
⚠️ **Alertas actuales:** Solo se generan alertas de "Internet Traffic to Private IP" (Priority: 2 = MEDIA)

## 🔥 PROBLEMA PENDIENTE

Las alertas de ALTA prioridad requieren condiciones específicas que no se están cumpliendo con el tráfico normal de Docker:

1. **ICMP Flood:** Requiere 50+ pings en 5 segundos desde la misma IP
2. **Brute Force:** Requiere 5+ intentos de conexión en 60 segundos
3. **HTTP Flood:** Requiere 100+ requests en 10 segundos

**Solución:** Ejecutar los scripts de prueba manualmente para generar el tráfico necesario.

## 🚀 SCRIPT DE PRUEBA COMPLETO

Crear archivo `generate_high_alerts.sh`:
```bash
#!/bin/bash
echo "🔥 Generando alertas de ALTA prioridad..."

# PostgreSQL Brute Force (ALTA)
echo "📊 PostgreSQL Brute Force..."
for i in {1..10}; do
    timeout 1 nc -zv localhost 5432 2>/dev/null
    sleep 6
done

# HTTP Flood (ALTA)
echo "🌐 HTTP Flood..."
for i in {1..150}; do
    curl -s http://localhost:8080 > /dev/null &
done
wait

echo "✅ Alertas generadas! Espera 30 segundos y verifica el dashboard"
```

Ejecutar:
```bash
chmod +x generate_high_alerts.sh
./generate_high_alerts.sh
```

## 📌 RESUMEN

- ✅ Snort corregido y funcionando
- ✅ Mapeo de prioridades corregido
- ✅ 16+ reglas de ALTA prioridad activas
- ⚠️ Se necesita generar tráfico específico para activar alertas ALTA
- 📊 Dashboard debería mostrar alertas ALTA una vez generado el tráfico correcto
