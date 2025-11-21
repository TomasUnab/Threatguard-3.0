-- Script para limpiar alertas antiguas de ThreatGuard
-- Elimina alertas más antiguas de 30 días y logs históricos

-- 1. Eliminar alertas cerradas/resueltas más antiguas de 30 días
DELETE FROM alerts 
WHERE status IN ('resolved', 'closed', 'false_positive')
AND timestamp < NOW() - INTERVAL '30 days';

-- 2. Eliminar alertas abiertas muy antiguas (más de 90 días)
DELETE FROM alerts 
WHERE status = 'open'
AND timestamp < NOW() - INTERVAL '90 days';

-- 3. Eliminar alertas de baja prioridad antiguas (más de 7 días)
DELETE FROM alerts 
WHERE (ai_classification = 'BAJA' OR severity = 'BAJA')
AND timestamp < NOW() - INTERVAL '7 days';

-- 4. Eliminar alertas benignas antiguas (más de 3 días)
DELETE FROM alerts 
WHERE (ai_classification = 'BENIGNO' OR severity = 'BENIGNO')
AND timestamp < NOW() - INTERVAL '3 days';

-- 5. Limpiar métricas del sistema antiguas (más de 60 días)
DELETE FROM system_metrics 
WHERE timestamp < NOW() - INTERVAL '60 days';

-- Mostrar estadísticas después de la limpieza
SELECT 
    COUNT(*) as total_alertas,
    COUNT(*) FILTER (WHERE status = 'open') as alertas_abiertas,
    COUNT(*) FILTER (WHERE ai_classification = 'ALTA') as alertas_alta,
    COUNT(*) FILTER (WHERE ai_classification = 'MEDIA') as alertas_media,
    MIN(timestamp) as alerta_mas_antigua,
    MAX(timestamp) as alerta_mas_reciente
FROM alerts;
