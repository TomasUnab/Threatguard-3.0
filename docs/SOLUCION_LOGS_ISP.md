# Solución de Problemas - ThreatGuard 3.0

## 🔧 Problemas Resueltos

### 1. ✅ Limpieza de Logs Antiguos

Se han implementado múltiples soluciones para eliminar logs antiguos que seguían apareciendo:

#### A) Script SQL Manual
```bash
# Ejecutar desde PostgreSQL
psql -U threatguard_user -d threatguard_db -f scripts/cleanup_old_alerts.sql
```

#### B) Script Python Automatizado
```bash
# Simulación (dry-run)
python scripts/cleanup_old_alerts.py --dry-run

# Ejecución real
python scripts/cleanup_old_alerts.py
```

#### C) Endpoint API (Recomendado)
```bash
# Limpieza con valores por defecto
curl -X POST "http://localhost:8000/maintenance/cleanup"

# Limpieza personalizada
curl -X POST "http://localhost:8000/maintenance/cleanup?days_closed=30&days_open=90&days_low=7&days_benign=3"
```

**Parámetros:**
- `days_closed`: Días para eliminar alertas cerradas/resueltas (default: 30)
- `days_open`: Días para eliminar alertas abiertas muy antiguas (default: 90)
- `days_low`: Días para eliminar alertas de baja prioridad (default: 7)
- `days_benign`: Días para eliminar alertas benignas (default: 3)

**Política de Retención:**
- Alertas cerradas/resueltas: 30 días
- Alertas abiertas antiguas: 90 días
- Alertas de baja prioridad: 7 días
- Alertas benignas: 3 días
- Métricas del sistema: 60 días

---

### 2. ✅ Filtrado de Alertas Medias del ISP

Se ha mejorado `snort_integration.py` para **filtrar automáticamente** tráfico legítimo del ISP que generaba muchas alertas medias:

#### Cambios Implementados:

**A) Detección de IPs Privadas:**
- Identifica rangos privados: `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`
- Detecta localhost y link-local: `127.x.x.x`, `169.254.x.x`
- Soporte IPv6: `fe80:`, `fc00:`, `fd00:`, `::1`

**B) Filtrado de Tráfico ISP:**
El sistema ahora filtra automáticamente:
- ✅ ICMP multicast del ISP (IPv6 router advertisements)
- ✅ Neighbor Discovery (IPv6)
- ✅ IGMP queries legítimas
- ✅ Tráfico de link-local (fe80::)
- ✅ Multicast (ff02::)

**C) Conserva Alertas Importantes:**
- ❌ **NO filtra** alertas de severidad ALTA
- ❌ **NO filtra** tráfico sospechoso entre IPs privadas
- ❌ **NO filtra** ataques reales (DDoS, scans maliciosos, etc.)

#### Funciones Agregadas:
```python
def is_private_ip(ip: str) -> bool
    """Verifica si IP es privada/local"""

def is_isp_traffic(alert_data: Dict) -> bool
    """Detecta si es tráfico legítimo del ISP"""

def should_filter_alert(alert_data: Dict) -> bool
    """Determina si alerta debe ser filtrada"""
```

#### Logs Mejorados:
```
✅ ALTA: Port Scan Detected - 192.168.1.100
🚫 Filtrado (ISP): ICMP Router Advertisement - fe80::1
```

---

## 📊 Verificación de Resultados

### Verificar Limpieza de Logs:
```bash
# Desde Docker
docker exec -it threatguard-postgres psql -U threatguard_user -d threatguard_db -c "
SELECT 
    COUNT(*) as total_alertas,
    COUNT(*) FILTER (WHERE status = 'open') as abiertas,
    MIN(timestamp) as mas_antigua,
    MAX(timestamp) as mas_reciente
FROM alerts;"
```

### Verificar Filtrado de ISP:
```bash
# Ver logs de Snort integration
docker logs snort-integration -f

# Deberías ver menos alertas MEDIA de tráfico ISP
# Y logs como: "🚫 Filtrado (ISP): ..."
```

### Estadísticas de Alertas:
```bash
curl http://localhost:8000/dashboard/stats | jq
```

---

## 🔄 Mantenimiento Automático (Opcional)

### Cron Job para Limpieza Diaria:
```bash
# Agregar a crontab
0 3 * * * cd /path/to/Threatguard-3.0-master && python scripts/cleanup_old_alerts.py >> logs/cleanup.log 2>&1
```

### Tarea Programada Windows:
```powershell
# Crear tarea que ejecute diariamente a las 3 AM
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\Users\Matias\Desktop\Threatguard-3.0-master\scripts\cleanup_old_alerts.py"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ThreatGuard Cleanup" -Description "Limpieza diaria de alertas antiguas"
```

---

## 🐛 Troubleshooting

### Problema: Logs antiguos aún aparecen
**Solución:**
1. Verificar que Docker esté usando PostgreSQL (no SQLite)
2. Ejecutar limpieza manual: `python scripts/cleanup_old_alerts.py`
3. Reiniciar contenedores: `docker-compose restart`

### Problema: Muchas alertas MEDIA del ISP
**Solución:**
1. Verificar que `snort_integration.py` esté actualizado
2. Reiniciar contenedor Snort: `docker-compose restart snort-integration`
3. Revisar logs: `docker logs snort-integration -f`

### Problema: Se filtran alertas importantes
**Solución:**
- Las alertas ALTA **nunca** se filtran
- Revisar función `is_isp_traffic()` en `snort_integration.py`
- Ajustar patrones si es necesario

---

## 📝 Archivos Modificados

1. ✅ `scripts/cleanup_old_alerts.sql` - Script SQL de limpieza
2. ✅ `scripts/cleanup_old_alerts.py` - Script Python automatizado
3. ✅ `threatguard_api.py` - Endpoint `/maintenance/cleanup`
4. ✅ `src/data_collection/snort_integration.py` - Filtros de ISP mejorados

---

## ✨ Mejoras Implementadas

### Rendimiento:
- ⚡ Menos alertas innecesarias en base de datos
- ⚡ Filtrado antes de inserción (ahorra I/O)
- ⚡ Limpieza automática previene crecimiento excesivo

### Precisión:
- 🎯 Reduce falsos positivos de tráfico ISP
- 🎯 Mantiene alertas críticas intactas
- 🎯 Mejor clasificación de severidad

### Operación:
- 🔧 Mantenimiento automatizable vía API
- 🔧 Scripts reutilizables
- 🔧 Logs más limpios y relevantes

---

## 📞 Contacto

Si encuentras problemas con estas soluciones:
1. Revisar logs: `docker-compose logs -f`
2. Verificar base de datos: Scripts de verificación arriba
3. Consultar documentación en `docs/`

**Fecha de implementación:** 21 de Noviembre 2025
**Versión:** ThreatGuard 3.0
