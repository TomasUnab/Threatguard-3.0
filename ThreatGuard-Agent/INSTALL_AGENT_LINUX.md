# ThreatGuard Agent - Instalación en Linux

El agente de ThreatGuard permite monitorear sistemas Linux/Unix y reportar al servidor central.

## 📋 Requisitos Previos

- **Sistema Operativo:** Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+, Fedora 30+
- **Python:** 3.7 o superior
- **Permisos:** Root/sudo
- **Red:** Conectividad con el servidor ThreatGuard (puerto 8000)

## 🚀 Instalación Rápida

### Método 1: Script Automático (Recomendado)

```bash
# 1. Descargar archivos necesarios al servidor Linux
scp agent.py usuario@servidor-linux:/tmp/
scp requirements-agent.txt usuario@servidor-linux:/tmp/
scp install_agent_linux.sh usuario@servidor-linux:/tmp/
scp -r src/ usuario@servidor-linux:/tmp/

# 2. Conectarse al servidor Linux
ssh usuario@servidor-linux

# 3. Ejecutar el instalador
cd /tmp
sudo bash install_agent_linux.sh
```

### Método 2: Instalación Manual

```bash
# 1. Instalar dependencias del sistema
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv

# CentOS/RHEL:
sudo yum install -y python3 python3-pip

# 2. Crear directorio de instalación
sudo mkdir -p /opt/threatguard-agent
cd /opt/threatguard-agent

# 3. Copiar archivos
sudo cp /tmp/agent.py .
sudo cp /tmp/requirements-agent.txt .
sudo cp -r /tmp/src .

# 4. Crear entorno virtual e instalar dependencias
sudo python3 -m venv venv
sudo ./venv/bin/pip install -r requirements-agent.txt

# 5. Crear configuración
sudo mkdir -p config
sudo nano config/agent.ini
```

**Contenido de `config/agent.ini`:**
```ini
[master]
MASTER_IP = 192.168.1.100  # IP de tu servidor ThreatGuard
MASTER_PORT = 8000

[agent]
AGENT_NAME = linux-server-01
AGENT_IP = auto  # Detecta automáticamente o poner IP fija

[security]
AGENT_TOKEN = tu-token-seguro-aqui

[monitoring]
REPORT_INTERVAL = 60
COLLECT_LOGS = true
COLLECT_METRICS = true
```

## 🔧 Configuración

### 1. Editar Configuración

```bash
sudo nano /opt/threatguard-agent/config/agent.ini
```

**Parámetros importantes:**
- `MASTER_IP`: IP del servidor ThreatGuard principal
- `AGENT_NAME`: Nombre único del agente (ej: web-server-01, db-server-02)
- `AGENT_TOKEN`: Token de seguridad para autenticación
- `REPORT_INTERVAL`: Intervalo en segundos para reportar (por defecto 60)

### 2. Crear Servicio Systemd

```bash
sudo nano /etc/systemd/system/threatguard-agent.service
```

**Contenido:**
```ini
[Unit]
Description=ThreatGuard Agent Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/threatguard-agent
ExecStart=/opt/threatguard-agent/venv/bin/python /opt/threatguard-agent/agent.py
Restart=always
RestartSec=10
StandardOutput=append:/opt/threatguard-agent/logs/agent.log
StandardError=append:/opt/threatguard-agent/logs/agent_error.log

[Install]
WantedBy=multi-user.target
```

### 3. Activar Servicio

```bash
# Recargar configuración de systemd
sudo systemctl daemon-reload

# Iniciar el servicio
sudo systemctl start threatguard-agent

# Habilitar inicio automático
sudo systemctl enable threatguard-agent

# Verificar estado
sudo systemctl status threatguard-agent
```

## 📊 Comandos de Gestión

```bash
# Ver estado del agente
sudo systemctl status threatguard-agent

# Iniciar agente
sudo systemctl start threatguard-agent

# Detener agente
sudo systemctl stop threatguard-agent

# Reiniciar agente
sudo systemctl restart threatguard-agent

# Ver logs en tiempo real
sudo tail -f /opt/threatguard-agent/logs/agent.log

# Ver logs de errores
sudo tail -f /opt/threatguard-agent/logs/agent_error.log

# Ver logs del sistema (journalctl)
sudo journalctl -u threatguard-agent -f
```

## 🔍 Verificación

### 1. Verificar Conectividad

```bash
# Probar conexión al servidor
curl http://IP_SERVIDOR:8000/health

# Verificar puerto abierto
nc -zv IP_SERVIDOR 8000
```

### 2. Verificar Logs

```bash
# Ver últimas líneas del log
sudo tail -20 /opt/threatguard-agent/logs/agent.log

# Buscar errores
sudo grep -i error /opt/threatguard-agent/logs/agent.log
```

### 3. Verificar en el Dashboard

1. Abre el dashboard de ThreatGuard: `http://IP_SERVIDOR:8080`
2. Ve a **Assets** → Deberías ver tu agente listado
3. Verifica estado: **Connected** (verde)

## 🛠️ Troubleshooting

### Problema: No se conecta al servidor

**Solución:**
```bash
# 1. Verificar firewall local
sudo ufw status
sudo firewall-cmd --list-all

# 2. Probar conectividad
ping IP_SERVIDOR
telnet IP_SERVIDOR 8000

# 3. Verificar configuración
cat /opt/threatguard-agent/config/agent.ini
```

### Problema: Servicio se detiene constantemente

**Solución:**
```bash
# Ver logs de errores
sudo journalctl -u threatguard-agent -n 50

# Ejecutar manualmente para ver errores
cd /opt/threatguard-agent
sudo ./venv/bin/python agent.py
```

### Problema: Permisos denegados

**Solución:**
```bash
# Dar permisos correctos
sudo chown -R root:root /opt/threatguard-agent
sudo chmod 600 /opt/threatguard-agent/config/agent.ini
sudo chmod +x /opt/threatguard-agent/agent.py
```

## 🔐 Seguridad

1. **Token de Autenticación:** Cambia el token por defecto en `agent.ini`
2. **Firewall:** Asegúrate de que solo el agente pueda conectarse al puerto 8000
3. **Permisos:** El archivo de configuración debe ser legible solo por root (600)
4. **SSL/TLS:** Para producción, configura HTTPS en el servidor

## 📦 Desinstalación

```bash
# 1. Detener y deshabilitar servicio
sudo systemctl stop threatguard-agent
sudo systemctl disable threatguard-agent

# 2. Eliminar servicio
sudo rm /etc/systemd/system/threatguard-agent.service
sudo systemctl daemon-reload

# 3. Eliminar archivos
sudo rm -rf /opt/threatguard-agent
```

## 🐳 Instalación con Docker (Alternativa)

Si prefieres usar Docker:

```bash
# Crear Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-agent.txt .
RUN pip install --no-cache-dir -r requirements-agent.txt

COPY agent.py .
COPY src/ ./src/
COPY config/ ./config/

CMD ["python", "agent.py"]
EOF

# Construir imagen
docker build -t threatguard-agent .

# Ejecutar contenedor
docker run -d \
  --name threatguard-agent \
  --restart unless-stopped \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  threatguard-agent
```

## 📞 Soporte

- **Logs:** `/opt/threatguard-agent/logs/`
- **Configuración:** `/opt/threatguard-agent/config/agent.ini`
- **Dashboard:** `http://IP_SERVIDOR:8080`

## 📝 Notas

- El agente reporta cada 60 segundos por defecto
- Los logs se rotan automáticamente
- El servicio se reinicia automáticamente si falla
- Compatible con Python 3.7+
