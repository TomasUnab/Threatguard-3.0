# ThreatGuard Agent

Agente de seguridad para endpoints que se conecta al servidor principal de ThreatGuard.

## 🚀 Características

- Monitoreo en tiempo real del sistema
- Recopilación de logs y telemetría
- Interfaz gráfica intuitiva
- Conexión segura con el servidor central
- Soporte para Windows y Linux

## 📋 Requisitos

### Windows
- Windows 10/11 o Windows Server 2016+
- Python 3.8+ (para compilar)
- 512 MB RAM mínimo
- Conexión a internet

### Linux
- Ubuntu 20.04+ / Debian 10+ / CentOS 8+
- Python 3.8+
- 512 MB RAM mínimo
- Conexión a internet

## 🔧 Compilar desde el código fuente

### Windows

1. Instalar dependencias:
```powershell
pip install -r requirements-agent-client.txt
pip install pyinstaller
```

2. Ejecutar el script de build:
```powershell
.\build.bat
```

3. El ejecutable estará en `dist\ThreatGuard-Agent.exe`

### Linux

1. Instalar dependencias:
```bash
pip3 install -r requirements-agent-client.txt
pip3 install pyinstaller
```

2. Hacer el script ejecutable y compilar:
```bash
chmod +x build_linux.sh
./build_linux.sh
```

3. El ejecutable estará en `dist/ThreatGuard-Agent`

## 📦 Instalación

### Windows

1. Descargar el ejecutable `ThreatGuard-Agent.exe` desde las releases
2. Ejecutar como administrador
3. Configurar la conexión al servidor
4. El agente iniciará automáticamente con Windows

### Linux

#### Opción 1: Paquete .deb (Ubuntu/Debian)

```bash
# Descargar el paquete
wget https://github.com/TomasUnab/ThreatGuard-Agent-Linux/releases/latest/download/threatguard-agent_1.0.0_amd64.deb

# Instalar
sudo dpkg -i threatguard-agent_1.0.0_amd64.deb
sudo apt-get install -f  # Si hay dependencias faltantes

# Configurar
sudo nano /opt/threatguard-agent/config/agent.ini

# Iniciar
threatguard-agent  # Modo GUI
# O como servicio
sudo systemctl start threatguard-agent
sudo systemctl enable threatguard-agent  # Iniciar al arranque
```

#### Opción 2: Script de instalación universal

```bash
# Descargar el instalador
wget https://github.com/TomasUnab/ThreatGuard-Agent-Linux/releases/latest/download/install_linux.sh
chmod +x install_linux.sh

# Instalar
sudo ./install_linux.sh

# El script detectará automáticamente tu distribución
# Soporta: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Manjaro
```

#### Opción 3: Ejecutar desde código fuente

```bash
# Instalar dependencias
pip3 install requests psutil

# Ejecutar
python3 agent_ui_linux.py
```

## ⚙️ Configuración

Antes de compilar, edita `../config/agent.ini`:

```ini
[AGENT]
AGENT_NAME = nombre-del-host
SERVER_URL = https://tu-servidor-threatguard.com
API_KEY = tu-api-key-aqui

[MONITORING]
INTERVAL = 60
LOG_LEVEL = INFO
```

## 🔒 Seguridad

- El agente usa conexiones HTTPS cifradas
- Las credenciales se almacenan de forma segura
- Solo recopila información autorizada
- No tiene acceso a contraseñas del usuario

## 📝 Licencia

Copyright © 2025 ThreatGuard. Todos los derechos reservados.

Este software es propietario y confidencial.

## 🆘 Soporte

Para problemas o preguntas:
- Documentación completa: Ver archivos `AGENT_SETUP.md` y `AGENT_BUILD.md`
- Issues: Contacta al administrador del sistema
