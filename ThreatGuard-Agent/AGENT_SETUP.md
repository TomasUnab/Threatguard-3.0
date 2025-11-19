# Configuración de Agentes ThreatGuard

## Instalación Rápida

### 1. Configurar IP del Maestro

Editar `config/agent.ini`:
```ini
[master]
MASTER_IP = 192.168.1.100  # Cambiar por la IP del servidor maestro
MASTER_PORT = 8000
```

O usar variables de entorno:
```bash
export MASTER_IP=192.168.1.100
export MASTER_PORT=8000
```

### 2. Iniciar Agente

**Windows:**
```cmd
start_agent.bat
```

**Linux/macOS:**
```bash
chmod +x start_agent.sh
./start_agent.sh
```

**Python directo:**
```bash
python log_agent.py
```

## Verificación

El agente mostrará:
```
[Log Agent] Conectando a maestro: 192.168.1.100:8000
[Log Agent] Iniciando recolección de logs - 2024-01-20 10:30:00
```

Si la IP es incorrecta, verás errores de conexión.

## Configuración Avanzada

### Múltiples Agentes en la Misma Red

Cada agente debe tener un nombre único en `config/agent.ini`:
```ini
[agent]
AGENT_NAME = agente-servidor-web
AGENT_NAME = agente-base-datos
AGENT_NAME = agente-firewall
```

### Captura de Red Personalizada

Modificar interfaz de red en `log_agent.py`:
```python
# Cambiar 'ens33' por tu interfaz
pcap_files = capture_pcap_ens33(duration=60, bpf_filter='tcp')
```

Ver interfaces disponibles:
```bash
# Linux
ip link show

# Windows
ipconfig

# macOS
ifconfig
```

## Troubleshooting

### Error: No se puede conectar al maestro
```bash
# Verificar conectividad
ping 192.168.1.100
curl http://192.168.1.100:8000/health
```

### Error: Permiso denegado en logs
```bash
# Linux - ejecutar con sudo
sudo python3 log_agent.py
```

### Error: tshark no encontrado
```bash
# Linux
sudo apt-get install tshark

# macOS
brew install wireshark

# Windows
# Descargar Wireshark desde wireshark.org
```
