# Instalación del Agente ThreatGuard

El agente ThreatGuard recopila métricas, logs y eventos de seguridad de los endpoints y los envía al servidor central.

## 📦 Descarga

Descarga la última versión desde [GitHub Releases](https://github.com/TomasUnab/Threatguard-3.0/releases/latest):

- **Windows:** `ThreatGuard-Agent-Setup.exe`
- **Linux:** `install_linux.sh` o `threatguard-agent_1.0.0_amd64.deb`

## 🪟 Instalación en Windows

### Método 1: Instalador Gráfico (Recomendado)

1. **Descargar** el instalador:
   ```
   ThreatGuard-Agent-Setup.exe
   ```

2. **Ejecutar** como Administrador:
   - Click derecho → "Ejecutar como administrador"

3. **Seguir el asistente:**
   - Aceptar licencia
   - Elegir carpeta de instalación
   - Seleccionar opciones:
     - ☑ Crear icono en escritorio
     - ☑ Iniciar con Windows

4. **Configurar:**
   - Se abrirá la interfaz gráfica
   - Configurar IP del servidor
   - Ingresar token de autenticación

### Método 2: Desde Código Fuente

```powershell
# Clonar repositorio
git clone https://github.com/TomasUnab/Threatguard-3.0.git
cd Threatguard-3.0\ThreatGuard-Agent

# Instalar dependencias
pip install -r requirements-agent-client.txt

# Configurar
copy config\agent.ini.example config\agent.ini
notepad config\agent.ini

# Ejecutar
python agent_ui.py
```

## 🐧 Instalación en Linux

### Método 1: Script de Instalación Universal (Recomendado)

Compatible con: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Manjaro

```bash
# Descargar instalador
wget https://github.com/TomasUnab/Threatguard-3.0/releases/latest/download/install_linux.sh

# Dar permisos de ejecución
chmod +x install_linux.sh

# Instalar (requiere sudo)
sudo ./install_linux.sh
```

El script instalará:
- ✅ Dependencias del sistema
- ✅ Paquetes de Python
- ✅ Servicio systemd
- ✅ Acceso directo en menú de aplicaciones

### Método 2: Paquete .deb (Ubuntu/Debian)

```bash
# Descargar paquete
wget https://github.com/TomasUnab/Threatguard-3.0/releases/latest/download/threatguard-agent_1.0.0_amd64.deb

# Instalar
sudo dpkg -i threatguard-agent_1.0.0_amd64.deb

# Si hay dependencias faltantes
sudo apt-get install -f
```

### Método 3: Desde Código Fuente

```bash
# Clonar repositorio
git clone https://github.com/TomasUnab/Threatguard-3.0.git
cd Threatguard-3.0/ThreatGuard-Agent

# Instalar dependencias
pip3 install -r requirements-agent-client.txt

# Configurar
cp config/agent.ini.example config/agent.ini
nano config/agent.ini

# Ejecutar
python3 agent_ui_linux.py
```

## ⚙️ Configuración

### Archivo de Configuración

**Windows:** `C:\Program Files\ThreatGuard Agent\config\agent.ini`  
**Linux:** `/opt/threatguard-agent/config/agent.ini`

Editar el archivo:

```ini
[master]
MASTER_IP = 192.168.1.100        # IP del servidor ThreatGuard
MASTER_PORT = 8000               # Puerto del servidor

[agent]
AGENT_NAME = mi-computadora      # Nombre único del agente
AGENT_IP = auto                  # auto = detectar automáticamente

[security]
AGENT_TOKEN = tu_token_aqui      # Token de autenticación

[monitoring]
REPORT_INTERVAL = 60             # Intervalo de reporte (segundos)
COLLECT_LOGS = true              # Recopilar logs del sistema
COLLECT_METRICS = true           # Recopilar métricas (CPU, RAM, etc.)
```

### Obtener Token de Autenticación

1. Acceder al panel de ThreatGuard
2. Ir a **Configuración** → **Agentes**
3. Clic en **"Generar Token"**
4. Copiar el token generado
5. Pegarlo en `AGENT_TOKEN` del archivo de configuración

## 🚀 Iniciar el Agente

### Windows

**Modo GUI:**
- Inicio → ThreatGuard Agent

**Modo Servicio:**
```powershell
# Iniciar servicio
net start ThreatGuardAgent

# Detener servicio
net stop ThreatGuardAgent
```

### Linux

**Modo GUI:**
```bash
threatguard-agent
```

**Modo Servicio:**
```bash
# Iniciar servicio
sudo systemctl start threatguard-agent

# Detener servicio
sudo systemctl stop threatguard-agent

# Habilitar al inicio
sudo systemctl enable threatguard-agent

# Ver estado
sudo systemctl status threatguard-agent

# Ver logs
sudo journalctl -u threatguard-agent -f
```

## ✅ Verificar Conexión

1. **En el Agente:**
   - Abrir interfaz gráfica
   - Verificar estado: "● Conectado" (verde)
   - Ver logs de conexión

2. **En el Servidor:**
   - Acceder al panel web
   - Ir a **Gestión de Activos**
   - Verificar que aparezca el nuevo agente
   - Estado debe ser "Online"

## 🔧 Interfaz Gráfica del Agente

La GUI del agente muestra:

- **📊 Información del Sistema:**
  - Hostname
  - IP local
  - Sistema operativo

- **⚙️ Configuración:**
  - IP del servidor
  - Puerto
  - Nombre del agente
  - Token

- **🎮 Control:**
  - Iniciar/Detener agente
  - Reiniciar
  - Estado de conexión

- **📋 Logs:**
  - Actividad en tiempo real
  - Errores y advertencias
  - Guardar logs

## 🔄 Actualización

### Windows
1. Descargar nuevo instalador
2. Ejecutar (mantendrá configuración)

### Linux

**Desde script:**
```bash
sudo ./install_linux.sh  # Sobrescribirá versión anterior
```

**Desde .deb:**
```bash
sudo dpkg -i threatguard-agent_X.X.X_amd64.deb
```

## 🗑️ Desinstalación

### Windows
- Panel de Control → Programas → Desinstalar ThreatGuard Agent
- O ejecutar: `C:\Program Files\ThreatGuard Agent\uninstall.exe`

### Linux

**Si se instaló con script:**
```bash
sudo /opt/threatguard-agent/uninstall.sh
```

**Si se instaló con .deb:**
```bash
# Desinstalar pero mantener configuración
sudo apt-get remove threatguard-agent

# Desinstalar y eliminar configuración
sudo apt-get purge threatguard-agent
```

## 🐛 Solución de Problemas

### El agente no se conecta al servidor

1. **Verificar conectividad:**
   ```bash
   ping IP_DEL_SERVIDOR
   telnet IP_DEL_SERVIDOR 8000
   ```

2. **Verificar firewall:**
   - Asegurar que el puerto 8000 esté abierto
   - Verificar reglas de firewall

3. **Verificar token:**
   - Token correcto en configuración
   - Token no expirado

### El agente consume muchos recursos

- Aumentar `REPORT_INTERVAL` en configuración
- Deshabilitar recopilación de logs si no es necesaria

### Más ayuda
Ver [Troubleshooting](Troubleshooting) para más soluciones.
