# ThreatGuard Agent - Instalación con Interfaz Gráfica en Linux

## 🖥️ **Versión GUI para Linux**

Esta versión incluye una interfaz gráfica (GUI) moderna y fácil de usar para gestionar el agente de ThreatGuard en sistemas Linux con entorno de escritorio.

---

## 📋 **Requisitos**

- **Sistema Operativo:** Ubuntu 18.04+, Debian 10+, Linux Mint, Elementary OS, Fedora 30+
- **Python:** 3.7 o superior con tkinter
- **Entorno de Escritorio:** GNOME, KDE, XFCE, MATE, Cinnamon, etc.
- **Red:** Conectividad con el servidor ThreatGuard

---

## 🚀 **Instalación Rápida**

### **Paso 1: Copiar archivos al servidor Linux**

Desde tu máquina Windows (PowerShell):
```powershell
# Copiar archivos necesarios
scp agent.py usuario@servidor:/tmp/
scp agent_ui_linux.py usuario@servidor:/tmp/
scp requirements-agent.txt usuario@servidor:/tmp/
scp install_agent_linux.sh usuario@servidor:/tmp/
scp start_agent_gui.sh usuario@servidor:/tmp/
scp threatguard-agent.desktop usuario@servidor:/tmp/
scp -r src/ usuario@servidor:/tmp/
```

### **Paso 2: Instalar en el servidor Linux**

```bash
# Conectarse al servidor
ssh usuario@servidor

# Ir al directorio temporal
cd /tmp

# Ejecutar instalador
sudo bash install_agent_linux.sh
```

El instalador automáticamente:
- ✅ Instala Python y tkinter
- ✅ Crea el entorno virtual
- ✅ Instala dependencias gráficas
- ✅ Configura el launcher GUI
- ✅ Crea acceso directo en el escritorio
- ✅ Agrega entrada en el menú de aplicaciones

### **Paso 3: Ejecutar la Interfaz Gráfica**

**Opción A: Desde el menú de aplicaciones**
1. Buscar "ThreatGuard Agent" en el menú de aplicaciones
2. Hacer clic para abrir

**Opción B: Desde el escritorio**
1. Doble clic en el icono "ThreatGuard Agent" del escritorio

**Opción C: Desde terminal**
```bash
/opt/threatguard-agent/start_agent_gui.sh
```

O si estás en el directorio de instalación:
```bash
cd /opt/threatguard-agent
./start_agent_gui.sh
```

---

## 🎨 **Características de la Interfaz**

### **Panel de Información del Sistema**
- 📊 Hostname del servidor
- 🌐 IP local detectada automáticamente
- 💻 Sistema operativo y versión

### **Panel de Configuración**
- 🔧 IP y puerto del servidor ThreatGuard
- 🏷️ Nombre del agente (personalizable)
- 🔑 Token de seguridad
- 💾 Guardar configuración con un clic

### **Panel de Control**
- ▶️ Iniciar/Detener agente con botones
- 🔄 Reiniciar agente
- 🟢 Indicador de estado en tiempo real
- ✅ Indicador de conexión con el servidor

### **Panel de Logs**
- 📋 Logs en tiempo real con timestamps
- 🗑️ Limpiar logs
- 💾 Guardar logs en archivo
- 📊 Monitoreo de CPU y RAM

### **Barra de Estado**
- ⏱️ Última actualización
- 📊 Uso de CPU y RAM en tiempo real
- 🔌 Estado de conexión

---

## ⚙️ **Uso de la Interfaz**

### **Primera Configuración**

1. **Abrir ThreatGuard Agent GUI**
2. **Configurar servidor:**
   - IP del Servidor: `192.168.1.100` (tu IP del servidor ThreatGuard)
   - Puerto: `8000`
3. **Configurar agente:**
   - Nombre: `servidor-web-01` (nombre único)
   - Token: Tu token de seguridad
4. **Guardar Configuración** (botón 💾)
5. **Iniciar Agente** (botón ▶️)

### **Monitoreo**

La interfaz mostrará:
- ✅ **Conectado** cuando está enviando datos al servidor
- ❌ **Desconectado** si hay problemas de conexión
- 📊 **Métricas en tiempo real:** CPU, RAM, Disco, Red
- 📋 **Logs detallados** de todas las operaciones

### **Control del Agente**

- **▶️ Iniciar:** Comienza a enviar datos al servidor (cada 60 segundos)
- **⏹️ Detener:** Para el envío de datos
- **🔄 Reiniciar:** Detiene e inicia nuevamente el agente

---

## 🖥️ **Screenshots (Descripción de la Interfaz)**

```
┌─────────────────────────────────────────────────────────┐
│  ThreatGuard Agent - Linux                              │
├─────────────────────────────────────────────────────────┤
│  📊 Información del Sistema                             │
│  ├─ Hostname: servidor-web-01                           │
│  ├─ IP Local: 192.168.1.50                              │
│  └─ Sistema: Linux 5.15.0-ubuntu                        │
├─────────────────────────────────────────────────────────┤
│  ⚙️ Configuración del Agente                            │
│  ├─ IP del Servidor: [192.168.1.100] Puerto: [8000]    │
│  ├─ Nombre del Agente: [servidor-web-01]               │
│  ├─ Token: [********************]                      │
│  └─ [💾 Guardar Configuración]                          │
├─────────────────────────────────────────────────────────┤
│  🎮 Control del Agente                                  │
│  ├─ Estado: ● Ejecutando                               │
│  └─ [▶️ Iniciar] [⏹️ Detener] [🔄 Reiniciar]           │
├─────────────────────────────────────────────────────────┤
│  📋 Logs del Agente                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [2025-11-09 15:30:01] 🚀 Iniciando agente...   │   │
│  │ [2025-11-09 15:30:05] ✅ Datos enviados (CPU:  │   │
│  │ 23.4%, RAM: 45.2%)                              │   │
│  └─────────────────────────────────────────────────┘   │
│  [🗑️ Limpiar Logs] [💾 Guardar Logs]                   │
├─────────────────────────────────────────────────────────┤
│  ThreatGuard Agent v1.0 | CPU: 23.4% | RAM: 45.2%      │
│                                          ✅ Conectado    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 **Instalación Manual de Tkinter**

Si el instalador no puede instalar tkinter automáticamente:

**Ubuntu/Debian:**
```bash
sudo apt-get install python3-tk
```

**Fedora:**
```bash
sudo dnf install python3-tkinter
```

**CentOS/RHEL:**
```bash
sudo yum install python3-tkinter
```

---

## 🐧 **Distribuciones Linux Soportadas**

### **Completamente Probado:**
- ✅ Ubuntu 20.04, 22.04, 24.04
- ✅ Linux Mint 20, 21
- ✅ Pop!_OS 20.04+
- ✅ Elementary OS 6+
- ✅ Debian 11, 12

### **Compatible (requiere tkinter):**
- ✅ Fedora 35+
- ✅ CentOS Stream 8, 9
- ✅ RHEL 8, 9
- ✅ openSUSE Leap 15+
- ✅ Manjaro (instalar con: `sudo pacman -S tk`)
- ✅ Arch Linux (instalar con: `sudo pacman -S tk`)

---

## 🔄 **Dos Modos de Operación**

### **Modo 1: GUI Interactiva** ⭐ Recomendado para escritorio
- Interfaz gráfica completa
- Configuración visual
- Logs en tiempo real
- Control con botones
```bash
/opt/threatguard-agent/start_agent_gui.sh
```

### **Modo 2: Servicio en segundo plano** ⭐ Recomendado para servidores sin GUI
- Ejecución como daemon
- Auto-inicio con el sistema
- Gestión con systemctl
```bash
sudo systemctl start threatguard-agent
sudo systemctl enable threatguard-agent
```

---

## 📂 **Estructura de Archivos**

```
/opt/threatguard-agent/
├── agent_ui_linux.py         # Interfaz gráfica
├── agent.py                   # Agente en modo consola
├── start_agent_gui.sh         # Launcher de la GUI
├── requirements-agent.txt     # Dependencias Python
├── config/
│   └── agent.ini             # Configuración del agente
├── logs/
│   ├── agent.log             # Logs del servicio
│   └── agent_*.log           # Logs guardados desde GUI
└── venv/                     # Entorno virtual Python
```

---

## 🛠️ **Troubleshooting**

### **Error: "No module named 'tkinter'"**
```bash
# Ubuntu/Debian
sudo apt-get install python3-tk

# Fedora
sudo dnf install python3-tkinter
```

### **No aparece el icono en el escritorio**
```bash
# Copiar manualmente el archivo .desktop
cp /opt/threatguard-agent/threatguard-agent.desktop ~/Desktop/
chmod +x ~/Desktop/threatguard-agent.desktop
```

### **Error de permisos al ejecutar**
```bash
chmod +x /opt/threatguard-agent/start_agent_gui.sh
chmod +x /opt/threatguard-agent/agent_ui_linux.py
```

### **No se conecta al servidor**
1. Verificar IP y puerto en la configuración
2. Probar conectividad: `curl http://IP_SERVIDOR:8000/health`
3. Verificar firewall del servidor

---

## 🎯 **Ventajas de la Versión GUI**

✅ **Fácil configuración** - Sin editar archivos de texto  
✅ **Monitoreo visual** - Ver estado en tiempo real  
✅ **Control inmediato** - Iniciar/detener con un clic  
✅ **Logs visuales** - Ver todo lo que sucede  
✅ **Friendly** - Ideal para usuarios no técnicos  
✅ **Portable** - Funciona en cualquier Linux con GUI  

---

## 🔐 **Seguridad**

- 🔒 Token de autenticación encriptado (campo oculto con asteriscos)
- 🔑 Archivo de configuración con permisos 600 (solo root)
- 🛡️ Comunicación HTTPS (si el servidor está configurado)
- 📝 Logs locales con información de auditoría

---

## 📞 **Soporte**

**Archivos de logs:**
- GUI: `/opt/threatguard-agent/logs/agent_YYYYMMDD_HHMMSS.log`
- Servicio: `/opt/threatguard-agent/logs/agent.log`

**Comandos útiles:**
```bash
# Ver logs de la GUI
ls -lh /opt/threatguard-agent/logs/

# Ejecutar en modo debug (terminal)
cd /opt/threatguard-agent
source venv/bin/activate
python3 agent_ui_linux.py
```

---

## 📝 **Notas Importantes**

1. La GUI y el servicio **NO deben ejecutarse simultáneamente**
2. Si ejecutas la GUI, detén el servicio: `sudo systemctl stop threatguard-agent`
3. Para servidores sin GUI, usa el modo servicio
4. Para desktops/workstations, usa la GUI

---

¡Disfruta de ThreatGuard Agent con interfaz gráfica! 🚀
