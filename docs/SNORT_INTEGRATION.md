# Integración de Snort 3 con ThreatGuard

## Descripción

Snort 3 es la última versión del sistema de detección de intrusiones (IDS) de código abierto que analiza el tráfico de red en tiempo real para detectar amenazas conocidas mediante firmas.

**Versión**: Snort 3 (desde GitHub)  
**Repositorio**: https://github.com/snort3/snort3

## Arquitectura

```
Tráfico de Red
    ↓
[Snort IDS] ← Detecta amenazas con reglas/firmas
    ↓
[Archivo de Alertas] (/var/log/snort/alert)
    ↓
[Snort Integration Service] ← Lee y parsea alertas
    ↓
[ThreatGuard API] ← Almacena en PostgreSQL
    ↓
[Dashboard] ← Visualización unificada
```

## Componentes

### 1. Snort IDS
- **Contenedor**: `threatguard-snort`
- **Función**: Analiza tráfico de red en tiempo real
- **Reglas**: 
  - Reglas comunitarias (descargadas automáticamente)
  - Reglas locales personalizadas (`config/local.rules`)

### 2. Snort Integration Service
- **Contenedor**: `threatguard-snort-integration`
- **Función**: Lee alertas de Snort y las envía a ThreatGuard API
- **Archivo**: `src/data_collection/snort_integration.py`

### 3. ThreatGuard API
- **Endpoint**: `POST /alerts`
- **Función**: Recibe alertas de Snort y las almacena

## Instalación

### Opción 1: Docker (Recomendado)

```bash
# Iniciar todos los servicios incluyendo Snort
docker-compose up -d

# Ver logs de Snort
docker-compose logs -f snort

# Ver logs de integración
docker-compose logs -f snort-integration
```

### Opción 2: Instalación Manual

```bash
# Clonar Snort 3
git clone https://github.com/snort3/snort3.git
cd snort3

# Compilar e instalar
./configure_cmake.sh --prefix=/usr/local
cd build
make -j$(nproc)
sudo make install

# Configurar Snort 3
sudo cp config/snort.lua /usr/local/etc/snort/snort.lua
sudo cp config/local.rules /usr/local/etc/snort/rules/local.rules

# Iniciar Snort 3
sudo snort -c /usr/local/etc/snort/snort.lua -i eth0 -A alert_fast -l /var/log/snort

# Iniciar servicio de integración
python -m src.data_collection.snort_integration
```

## Configuración

### Variables de Entorno

```bash
# API de ThreatGuard
THREATGUARD_API_URL=http://localhost:8000

# Archivo de alertas de Snort
SNORT_ALERT_FILE=/var/log/snort/alert

# Interfaz de red a monitorear
INTERFACE=eth0
```

### Reglas Personalizadas

Edita `config/local.rules` para agregar tus propias reglas (formato Snort 3):

```
# Ejemplo: Detectar escaneo de puertos
alert tcp any any -> any any ( msg:"Port Scan Detected"; flags:S; detection_filter:track by_src, count 20, seconds 60; sid:1000100; rev:1; )
```

## Tipos de Alertas Detectadas

### Alta Prioridad
- SSH Brute Force
- SQL Injection
- XSS Attacks
- SYN Flood (DoS)
- Backdoor Communication
- SMB Brute Force

### Media Prioridad
- Port Scans
- HTTP Floods
- Directory Traversal
- DNS Query Floods

### Baja Prioridad
- ICMP Ping Sweeps
- Suspicious Downloads

## Mapeo de Severidad

| Snort Priority | ThreatGuard Severity |
|----------------|---------------------|
| 1              | ALTA                |
| 2              | MEDIA               |
| 3              | BAJA                |

## Monitoreo

### Ver Alertas en Tiempo Real

```bash
# Logs de Snort
tail -f /var/log/snort/alert

# Dashboard de ThreatGuard
http://localhost:8080
```

### Estadísticas

```bash
# Ver estadísticas de Snort
docker exec threatguard-snort snort --version

# Ver alertas procesadas
curl http://localhost:8000/alerts
```

## Troubleshooting

### Snort no detecta tráfico

```bash
# Verificar interfaz de red
docker exec threatguard-snort ip addr

# Cambiar interfaz en docker-compose.yml
environment:
  - INTERFACE=eth0  # Cambiar según tu red
```

### No se envían alertas a ThreatGuard

```bash
# Verificar logs de integración
docker-compose logs snort-integration

# Verificar conectividad con API
docker exec threatguard-snort-integration curl http://threatguard-api:8000/health
```

### Reglas no se cargan

```bash
# Verificar sintaxis de reglas
docker exec threatguard-snort snort -T -c /etc/snort/snort.conf

# Ver errores
docker-compose logs snort
```

## Ventajas de la Integración

1. **Detección en Tiempo Real**: Snort analiza tráfico mientras ocurre
2. **Firmas Actualizadas**: Base de datos de amenazas conocidas
3. **Complementa ML**: Snort detecta amenazas conocidas, ML detecta anomalías
4. **Dashboard Unificado**: Todas las alertas en un solo lugar
5. **Respuesta Automática**: SOAR puede actuar sobre alertas de Snort

## Próximos Pasos

- [ ] Configurar reglas personalizadas para tu red
- [ ] Integrar con SOAR para respuesta automática
- [ ] Configurar notificaciones para alertas críticas
- [ ] Ajustar umbrales de detección según tu entorno
- [ ] Implementar Snort en modo IPS (prevención)

## Referencias

- [Snort 3 GitHub](https://github.com/snort3/snort3)
- [Snort 3 Documentation](https://www.snort.org/snort3)
- [Snort 3 Rules](https://www.snort.org/downloads)
- [ThreatGuard API Documentation](http://localhost:8000/docs)
