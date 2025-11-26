# 🎯 INSTRUCCIONES PARA ATAQUE EXTERNO A THREATGUARD

## 📋 INFORMACIÓN DEL SERVIDOR

**IP Objetivo:** `98.84.174.81`
**Dashboard:** http://98.84.174.81:8080

---

## 🔓 PASO 1: VERIFICAR SECURITY GROUP (AWS)

**IMPORTANTE:** El Security Group de AWS debe permitir tráfico desde cualquier IP.

### Reglas necesarias (Inbound):
```
SSH         | TCP | 22    | 0.0.0.0/0
HTTP        | TCP | 80    | 0.0.0.0/0
HTTP        | TCP | 8080  | 0.0.0.0/0
PostgreSQL  | TCP | 5432  | 0.0.0.0/0
Custom      | TCP | 8000  | 0.0.0.0/0
```

**Cómo verificar:**
1. AWS Console → EC2 → Instances
2. Selecciona la instancia
3. Security → Security Groups
4. Verifica que las reglas permitan `0.0.0.0/0` (cualquier IP)

---

## 🎯 PASO 2: ATAQUES PARA PERSONA EXTERNA

### OPCIÓN A: Port Scan (MEDIA) - Más fácil
```bash
nmap -sS -p 22,80,443,8080,5432 98.84.174.81
```
**Resultado esperado:** Alertas de prioridad MEDIA

---

### OPCIÓN B: SSH Brute Force (ALTA) - Tarda ~1 minuto
```bash
for i in {1..10}; do 
    timeout 1 nc -zv 98.84.174.81 22
    sleep 6
done
```
**Resultado esperado:** Alerta de prioridad ALTA después de 5+ intentos

---

### OPCIÓN C: PostgreSQL Brute Force (ALTA) - Tarda ~1 minuto
```bash
for i in {1..10}; do 
    timeout 1 nc -zv 98.84.174.81 5432
    sleep 6
done
```
**Resultado esperado:** Alerta de prioridad ALTA

---

### OPCIÓN D: HTTP Requests (Simple)
```bash
for i in {1..50}; do 
    curl -s http://98.84.174.81:8080 > /dev/null
done
```
**Resultado esperado:** Alertas de prioridad MEDIA

---

### OPCIÓN E: Combinado (Recomendado)
```bash
# Port Scan
nmap -sS -p 22,80,8080 98.84.174.81

# HTTP Flood
for i in {1..30}; do curl -s http://98.84.174.81:8080 > /dev/null & done
wait

# SSH Brute Force
for i in {1..8}; do timeout 1 nc -zv 98.84.174.81 22; sleep 7; done
```
**Resultado esperado:** Múltiples alertas MEDIA y posiblemente ALTA

---

## 📊 PASO 3: VERIFICAR RESULTADOS

### A. Dashboard Web (Público)
```
http://98.84.174.81:8080
```
- Verás el contador de alertas aumentar
- Las alertas se clasifican por prioridad: ALTA / MEDIA / BAJA
- Aparecerá la IP del atacante en "Top 5 Hosts"

### B. Verificación Manual (Requiere SSH)
```bash
ssh -i ICF233.pem ubuntu@98.84.174.81 "sudo docker exec threatguard-snort tail -50 /var/log/snort/alert"
```

---

## 🎯 CLASIFICACIÓN DE ALERTAS

### ALTA (Priority: 0 o 1)
- SSH Brute Force (5+ intentos en 60s)
- PostgreSQL Brute Force (5+ intentos en 60s)
- SQL Injection
- XSS Attacks
- Command Injection
- Reverse Shell
- Ransomware

### MEDIA (Priority: 2)
- Port Scans
- ICMP Ping Sweep
- Tráfico sospechoso
- C2 Beacon
- Conexiones anómalas

### BAJA (Priority: 3)
- Anomalías menores
- Tráfico inusual

---

## ⚠️ NOTAS IMPORTANTES

1. **Espera 30-60 segundos** después del ataque para que las alertas se procesen
2. **Recarga el dashboard** para ver las actualizaciones
3. **La IP del atacante** aparecerá en "Top 5 Hosts con Más Alertas"
4. **Las alertas ALTA** requieren múltiples intentos (5+ en 60 segundos)
5. **Port Scan** es el ataque más fácil y rápido de detectar

---

## 🧪 EJEMPLO DE FLUJO COMPLETO

```bash
# 1. Persona externa ejecuta desde su terminal:
nmap -sS -p 22,80,8080 98.84.174.81

# 2. Espera 30 segundos

# 3. Abre el dashboard:
http://98.84.174.81:8080

# 4. Verifica:
# - Contador de alertas MEDIA aumentó
# - Su IP aparece en "Top 5 Hosts"
# - Gráfico de tráfico muestra actividad
```

---

## 🔍 TROUBLESHOOTING

### El ataque no aparece en el dashboard:
1. ✅ Verifica que el Security Group permita tu IP
2. ✅ Espera 30-60 segundos para procesamiento
3. ✅ Recarga el dashboard (F5)
4. ✅ Verifica que usaste la IP correcta: 98.84.174.81

### Solo veo alertas MEDIA, no ALTA:
- Las alertas ALTA requieren **múltiples intentos repetidos**
- Ejecuta el SSH Brute Force completo (10 intentos con pausas)
- O usa el script de inyección: `python inject_high_alerts.py`

---

## ✅ CONFIRMACIÓN DE FUNCIONAMIENTO

El sistema ThreatGuard está funcionando correctamente si:
- ✅ El dashboard es accesible públicamente
- ✅ Las alertas aumentan después de ataques
- ✅ La IP del atacante aparece en los logs
- ✅ Las alertas se clasifican por prioridad

---

**Sistema ThreatGuard - Detección de Amenazas en Tiempo Real**
