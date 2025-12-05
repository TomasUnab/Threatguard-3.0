# 🎯 COMANDO DE ATAQUE GARANTIZADO

## Problema Actual:
El comando `for i in {1..10}; do timeout 1 ssh ... done` no genera suficientes paquetes SYN para activar la regla.

## ✅ Solución - Comando Garantizado:

```bash
for i in {1..15}; do timeout 0.5 ssh -o ConnectTimeout=1 -o StrictHostKeyChecking=no test@98.84.174.81 2>/dev/null & done; wait
```

### Cambios:
- **15 intentos** (en lugar de 10)
- **timeout 0.5** segundos (más rápido)
- Esto genera más paquetes SYN en menos tiempo

## 🔥 Alternativa Más Agresiva:

```bash
for i in {1..20}; do nc -w 1 98.84.174.81 22 & done; wait
```

Esto genera 20 conexiones TCP puras al puerto 22.

## 📊 Qué Esperar:

Después de ejecutar el comando, en **1-2 segundos** verás:
- Dashboard: Alertas ALTA aumenta
- Snort detecta: "SSH Brute Force Attack" [Priority: 1]

## ⚠️ Importante:

El `detection_filter` requiere **6 conexiones SYN en 60 segundos**.
Si pasan más de 60 segundos entre ataques, el contador se reinicia.

**Ejecuta el comando 2-3 veces seguidas (sin esperar) para garantizar la detección.**
