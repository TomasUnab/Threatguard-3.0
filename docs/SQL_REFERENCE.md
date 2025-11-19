# ThreatGuard - Referencia SQL

Guía rápida para usar la terminal SQL en ThreatGuard.

## Acceso
URL: `http://localhost:8080/alerts/code.html`

## Comandos Especiales

| Comando | Descripción |
|---------|-------------|
| `\tables` | Lista todas las tablas disponibles |
| `\schema` | Muestra el esquema de las tablas principales |
| `\desc <tabla>` | Describe la estructura completa de una tabla |
| `\clear` o `Ctrl+L` | Limpia la pantalla |
| `\history` | Muestra el historial de queries |
| `\help` | Muestra la ayuda |

## Tablas Principales

### 1. Tabla: `alerts`
Almacena todas las alertas de seguridad detectadas.

**Columnas principales:**
```sql
id                  UUID        - Identificador único
timestamp           DATETIME    - Fecha/hora de la alerta
source              STRING      - Origen: 'wazuh', 'openvas', 'manual'
severity            STRING      - Severidad: 'high', 'medium', 'low'
title               STRING      - Título de la alerta
description         TEXT        - Descripción detallada
status              STRING      - Estado: 'open', 'in_progress', 'resolved', 'false_positive'
ai_classification   STRING      - Clasificación por IA
ai_confidence       FLOAT       - Confianza de la IA (0.0 - 1.0)
assigned_to         STRING      - Usuario asignado
resolved_at         DATETIME    - Fecha de resolución
created_at          DATETIME    - Fecha de creación
updated_at          DATETIME    - Última actualización
```

**Queries de ejemplo:**
```sql
-- Listar todas las alertas abiertas
SELECT * FROM alerts WHERE status = 'open' ORDER BY timestamp DESC;

-- Contar alertas por severidad
SELECT severity, COUNT(*) as total 
FROM alerts 
GROUP BY severity 
ORDER BY total DESC;

-- Alertas de alta severidad sin asignar
SELECT id, timestamp, title, severity 
FROM alerts 
WHERE severity = 'high' 
  AND assigned_to IS NULL 
  AND status = 'open';

-- Alertas clasificadas por IA con alta confianza
SELECT * FROM alerts 
WHERE ai_confidence > 0.8 
  AND ai_classification IS NOT NULL
ORDER BY timestamp DESC 
LIMIT 20;

-- Estadísticas por fuente
SELECT source, 
       COUNT(*) as total,
       AVG(ai_confidence) as avg_confidence
FROM alerts 
WHERE ai_classification IS NOT NULL
GROUP BY source;
```

### 2. Tabla: `vulnerabilities`
Almacena las vulnerabilidades encontradas en los escaneos.

**Columnas principales:**
```sql
id                    UUID        - Identificador único
scan_id               STRING      - ID del escaneo
target_host           STRING      - Host objetivo
target_port           INTEGER     - Puerto objetivo
cve_id                STRING      - Identificador CVE
cvss_score            FLOAT       - Puntuación CVSS (0.0 - 10.0)
severity              STRING      - Severidad: 'critical', 'high', 'medium', 'low'
vulnerability_name    STRING      - Nombre de la vulnerabilidad
description           TEXT        - Descripción
solution              TEXT        - Solución recomendada
service               STRING      - Servicio afectado
protocol              STRING      - Protocolo
status                STRING      - Estado: 'open', 'patched', 'mitigated', 'false_positive'
priority              INTEGER     - Prioridad (0-10)
discovered_at         DATETIME    - Fecha de descubrimiento
last_seen             DATETIME    - Última vez detectada
patched_at            DATETIME    - Fecha de parche
```

**Queries de ejemplo:**
```sql
-- Vulnerabilidades críticas abiertas
SELECT * FROM vulnerabilities 
WHERE severity = 'critical' 
  AND status = 'open'
ORDER BY cvss_score DESC;

-- Top 10 hosts con más vulnerabilidades
SELECT target_host, 
       COUNT(*) as vuln_count,
       AVG(cvss_score) as avg_cvss
FROM vulnerabilities 
WHERE status = 'open'
GROUP BY target_host 
ORDER BY vuln_count DESC 
LIMIT 10;

-- Vulnerabilidades por CVE
SELECT cve_id, 
       COUNT(*) as affected_hosts,
       MAX(cvss_score) as max_cvss,
       MIN(discovered_at) as first_seen
FROM vulnerabilities 
WHERE cve_id IS NOT NULL
GROUP BY cve_id
ORDER BY affected_hosts DESC;

-- Estadísticas de remediación
SELECT 
    status,
    COUNT(*) as total,
    AVG(EXTRACT(EPOCH FROM (patched_at - discovered_at))/86400) as avg_days_to_patch
FROM vulnerabilities 
WHERE patched_at IS NOT NULL
GROUP BY status;
```

### 3. Tabla: `scan_jobs`
Trabajos de escaneo programados y ejecutados.

**Columnas principales:**
```sql
id              UUID        - Identificador único
scan_type       STRING      - Tipo: 'vulnerability', 'port', 'service'
target          STRING      - Objetivo del escaneo
status          STRING      - Estado del trabajo
created_at      DATETIME    - Fecha de creación
```

**Queries de ejemplo:**
```sql
-- Listar todos los escaneos
SELECT * FROM scan_jobs ORDER BY created_at DESC LIMIT 20;

-- Escaneos por tipo
SELECT scan_type, COUNT(*) as total 
FROM scan_jobs 
GROUP BY scan_type;
```

## Queries Útiles Combinadas

### Dashboard de Seguridad
```sql
-- Resumen general de seguridad
SELECT 
    'Alertas Abiertas' as metric,
    COUNT(*) as count
FROM alerts 
WHERE status = 'open'
UNION ALL
SELECT 
    'Vulnerabilidades Críticas',
    COUNT(*)
FROM vulnerabilities 
WHERE severity = 'critical' AND status = 'open'
UNION ALL
SELECT 
    'Alertas Alta Severidad',
    COUNT(*)
FROM alerts 
WHERE severity = 'high' AND status = 'open';
```

### Análisis de Tendencias
```sql
-- Alertas por día (últimos 7 días)
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as alert_count,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity
FROM alerts 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Hosts más Vulnerables
```sql
-- Hosts con alertas y vulnerabilidades
SELECT 
    v.target_host,
    COUNT(DISTINCT v.id) as vuln_count,
    COUNT(DISTINCT a.id) as alert_count,
    MAX(v.cvss_score) as max_cvss
FROM vulnerabilities v
LEFT JOIN alerts a ON a.title LIKE '%' || v.target_host || '%'
WHERE v.status = 'open'
GROUP BY v.target_host
ORDER BY vuln_count DESC, alert_count DESC
LIMIT 20;
```

## Restricciones de Seguridad

⚠️ **Importante:** La terminal SQL tiene restricciones de seguridad:

- ✅ **Permitido:** Solo queries `SELECT`
- ❌ **Bloqueado:** `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`

Esto protege la integridad de la base de datos mientras permite análisis completo de los datos.

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `↑` / `↓` | Navegar por el historial de comandos |
| `Ctrl+C` | Cancelar query actual |
| `Ctrl+L` | Limpiar pantalla |
| `Enter` | Ejecutar query |
| `Backspace` | Borrar carácter |

## Consejos

1. **Usa LIMIT**: Para evitar resultados masivos, usa `LIMIT` en tus queries
   ```sql
   SELECT * FROM alerts LIMIT 100;
   ```

2. **Ordena los resultados**: Facilita el análisis
   ```sql
   SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 20;
   ```

3. **Filtra con WHERE**: Reduce el conjunto de datos
   ```sql
   SELECT * FROM alerts WHERE severity = 'high' AND status = 'open';
   ```

4. **Usa agregaciones**: Para estadísticas rápidas
   ```sql
   SELECT COUNT(*), AVG(cvss_score) FROM vulnerabilities;
   ```

5. **Explora con \schema**: Antes de hacer queries complejas, usa `\schema` para ver la estructura

---

**Versión:** 1.0  
**Última actualización:** Noviembre 2025
