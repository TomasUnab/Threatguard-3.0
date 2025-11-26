# 🎯 COMANDOS DE ATAQUE - SOLO ALERTAS ALTA

## 📋 Información del Target
- **IP Target**: 98.84.174.81
- **Objetivo**: Generar alertas de prioridad ALTA únicamente

---

## 🔥 OPCIÓN 1: ICMP Flood (MÁS RÁPIDO - RECOMENDADO)

```bash
# Enviar 60 pings rápidos en 5 segundos (activa SID 1000001)
ping -c 60 -i 0.08 98.84.174.81
```

**Resultado esperado**: 
- ✅ Genera alerta "ICMP Flood Attack Detected" (ALTA)
- ⏱️ Tiempo: ~5 segundos

---

## 🔥 OPCIÓN 2: SSH Brute Force

```bash
# Intentar 6 conexiones SSH rápidas (activa SID 1000010)
for i in {1..6}; do 
  timeout 1 ssh -o ConnectTimeout=1 test@98.84.174.81 2>/dev/null &
done
wait
```

**Resultado esperado**:
- ✅ Genera alerta "SSH Brute Force Attack" (ALTA)
- ⏱️ Tiempo: ~6 segundos

---

## 🔥 OPCIÓN 3: Port Scan SYN (Requiere nmap)

```bash
# SYN Scan a 25 puertos (activa SID 1000005)
sudo nmap -sS -p 1-25 --max-rate 100 98.84.174.81
```

**Resultado esperado**:
- ✅ Genera alerta "TCP SYN Port Scan Detected - HIGH INTENSITY" (ALTA)
- ⏱️ Tiempo: ~30 segundos

---

## 🔥 OPCIÓN 4: ICMP Ping Sweep

```bash
# Ping sweep - 15 pings en 10 segundos (activa SID 1000002)
for i in {1..15}; do 
  ping -c 1 -W 1 98.84.174.81 &
  sleep 0.6
done
wait
```

**Resultado esperado**:
- ✅ Genera alerta "ICMP Ping Sweep - Network Reconnaissance" (ALTA)
- ⏱️ Tiempo: ~10 segundos

---

## 🔥 OPCIÓN 5: HTTP Flood (Si hay servidor web)

```bash
# 110 peticiones HTTP en 10 segundos (activa SID 1000041)
for i in {1..110}; do 
  curl -s http://98.84.174.81:8080 &
done
wait
```

**Resultado esperado**:
- ✅ Genera alerta "HTTP Flood Attack" (ALTA)
- ⏱️ Tiempo: ~10 segundos

---

## 📊 VERIFICACIÓN

Después de ejecutar el ataque, espera 10-15 segundos y verifica:

```bash
# En tu máquina local (Windows)
python check_alert_titles.py
```

O revisa el dashboard:
- http://localhost:8080
- El contador de "Alertas de Prioridad ALTA" debería aumentar

---

## ⚠️ IMPORTANTE

- Ejecuta **SOLO UNA OPCIÓN** a la vez
- Espera 15 segundos entre ataques
- La **OPCIÓN 1 (ICMP Flood)** es la más rápida y confiable
- Todas estas opciones generan **SOLO alertas ALTA**

---

## 🎯 RECOMENDACIÓN FINAL

**Comando más simple y efectivo:**

```bash
ping -c 60 -i 0.08 98.84.174.81
```

Este comando:
- ✅ No requiere permisos root
- ✅ Funciona en cualquier sistema
- ✅ Genera alerta ALTA garantizada
- ✅ Toma solo 5 segundos
