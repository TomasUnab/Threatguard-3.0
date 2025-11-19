# 🎯 INSTRUCCIONES PARA GENERAR ALERTA ALTA

## ❌ Problema Actual
Tu compañero no puede alcanzar el servidor EC2 (98.84.174.81) desde su red.

## ✅ Solución: Ejecutar desde TU máquina

Ejecuta este comando en tu máquina Windows (que SÍ tiene acceso):

```bash
python generate_aggressive_scan.py
```

## 🔄 ALTERNATIVA MÁS SIMPLE

Si los scripts no funcionan, ejecuta esto **directamente en el servidor EC2**:

### 1. Conectarse al servidor:
```bash
ssh -i "ICF233.pem" ubuntu@98.84.174.81
```

### 2. Generar ataque desde el mismo servidor (localhost):
```bash
# ICMP Flood (más confiable)
ping -c 60 -i 0.08 localhost

# O SSH Brute Force
for i in {1..10}; do timeout 1 ssh -o ConnectTimeout=1 test@localhost 2>/dev/null & done; wait
```

### 3. Verificar alertas:
```bash
# Ver últimas alertas de Snort
sudo docker exec threatguard-snort tail -50 /var/log/snort/alert | grep -i "priority"
```

## 📊 Verificación en Dashboard

Después de ejecutar el ataque:
1. Espera 20-30 segundos
2. Actualiza el dashboard: http://localhost:8080
3. El contador de "Alertas ALTA" debería aumentar

## 🎯 Por qué no se detectan los ataques desde Python

Los scripts Python usan conexiones TCP completas (3-way handshake), no paquetes SYN puros.
Snort detecta mejor:
- Herramientas como `nmap` (con sudo)
- Ataques ICMP (ping flood)
- Múltiples conexiones SSH reales

## ✅ RECOMENDACIÓN FINAL

**Ejecuta el ataque DESDE el servidor EC2 hacia sí mismo:**

```bash
ssh -i "ICF233.pem" ubuntu@98.84.174.81 "ping -c 60 -i 0.08 localhost"
```

Esto generará una alerta "ICMP Flood Attack Detected" (ALTA) garantizada.
