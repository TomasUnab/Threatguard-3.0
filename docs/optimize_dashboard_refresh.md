# Optimización del Dashboard - Reducir Retraso

## Cambios Realizados:

### 1. Snort Integration (✅ COMPLETADO)
- **Antes**: Intervalo de 5 segundos
- **Ahora**: Intervalo de 1 segundo
- **Archivo**: `src/data_collection/snort_integration.py`

### 2. Dashboard Frontend (Pendiente)
El dashboard probablemente tiene un intervalo de actualización (polling) en JavaScript.

## Retrasos Actuales:

1. **Snort detecta alerta**: Instantáneo
2. **Snort escribe a archivo**: ~0.1 segundos
3. **snort_integration lee archivo**: 1 segundo (optimizado)
4. **API procesa y guarda en DB**: ~0.5 segundos
5. **Dashboard consulta API**: Depende del intervalo de refresh

**Total**: ~1.6 segundos + intervalo de refresh del dashboard

## Solución Adicional:

### Opción 1: WebSockets (Recomendado)
Implementar WebSockets para push en tiempo real desde el servidor al dashboard.

### Opción 2: Reducir Intervalo de Polling
Si el dashboard usa `setInterval()`, reducir de 5-10 segundos a 2-3 segundos.

### Opción 3: Server-Sent Events (SSE)
Usar SSE para enviar actualizaciones del servidor al cliente.

## Verificación:

Para ver el intervalo actual del dashboard:
1. Abre el dashboard en el navegador
2. Presiona F12 (DevTools)
3. Ve a la pestaña "Network"
4. Observa cada cuánto tiempo se hacen peticiones a la API

Si ves peticiones cada 5-10 segundos, ese es el intervalo que causa el retraso.

## Recomendación:

El retraso de 1-2 segundos es **aceptable** para un sistema de detección de intrusiones.
La mayoría de IDS comerciales tienen retrasos similares o mayores.

Si necesitas tiempo real absoluto (<1 segundo), necesitarás implementar WebSockets.
