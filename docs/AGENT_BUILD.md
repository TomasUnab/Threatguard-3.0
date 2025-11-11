# 🔨 Compilar Agente ThreatGuard

## Cambios Implementados

El agente ahora detecta y envía información del sistema operativo:
- ✅ **Windows**: Detecta versión, build, arquitectura
- ✅ **Linux**: Lee `/etc/os-release`, kernel version
- ✅ **macOS**: Detecta versión con `sw_vers`
- ✅ **Métricas**: CPU, memoria, disco

## Compilar en Windows

### 1. Instalar Dependencias
```bash
pip install -r requirements-agent.txt
```

### 2. Ejecutar Build
```bash
build.bat
```

### 3. Resultado
```
dist/ThreatGuard-Agent.exe
```

## Compilar en Linux

### 1. Instalar Dependencias
```bash
pip3 install -r requirements-agent.txt
```

### 2. Compilar con PyInstaller
```bash
pyinstaller --onefile \
  --windowed \
  --name ThreatGuard-Agent \
  --add-data "config:config" \
  --add-data "src:src" \
  --hidden-import psutil \
  --hidden-import platform \
  --hidden-import socket \
  agent_ui.py
```

### 3. Resultado
```
dist/ThreatGuard-Agent
```

## Compilar en macOS

### 1. Instalar Dependencias
```bash
pip3 install -r requirements-agent.txt
```

### 2. Compilar con PyInstaller
```bash
pyinstaller --onefile \
  --windowed \
  --name ThreatGuard-Agent \
  --add-data "config:config" \
  --add-data "src:src" \
  --hidden-import psutil \
  --hidden-import platform \
  --hidden-import socket \
  --icon assets/icon.ico \
  agent_ui.py
```

### 3. Resultado
```
dist/ThreatGuard-Agent.app
```

## Información Enviada al Servidor

El agente envía cada 60 segundos:
```json
{
  "hostname": "DESKTOP-ABC123",
  "ip": "192.168.1.100",
  "os": "Windows 10",
  "os_version": "10.0.19045",
  "os_details": "Windows 10 Pro",
  "architecture": "AMD64",
  "processor": "Intel64 Family 6 Model 142",
  "agent_name": "Agent-001",
  "cpu_percent": 15.2,
  "memory_percent": 45.8,
  "disk_percent": 62.3
}
```

## Verificar Funcionamiento

### 1. Ejecutar Agente
```bash
# Windows
ThreatGuard-Agent.exe

# Linux/macOS
./ThreatGuard-Agent
```

### 2. Verificar en Dashboard
```
http://localhost:8080/assets/code.html
```

Debe mostrar:
- Hostname del sistema
- IP local
- Sistema operativo detectado
- Estado: Active

### 3. Verificar API
```bash
curl http://localhost:8000/system/info
```

Debe retornar la información del sistema.

## Solución de Problemas

### Error: psutil no encontrado
```bash
pip install psutil
```

### Error: No se puede conectar al servidor
Verificar en `config/agent.ini`:
```ini
[master]
MASTER_IP = 192.168.1.24
MASTER_PORT = 8000
```

### Error en Linux: Permission denied
```bash
chmod +x dist/ThreatGuard-Agent
```

### Error en macOS: App no verificada
```bash
xattr -cr dist/ThreatGuard-Agent.app
```

## Notas Importantes

1. **Multiplataforma**: El mismo código funciona en Windows, Linux y macOS
2. **Detección automática**: No requiere configuración adicional
3. **Heartbeat**: Envía información cada 60 segundos
4. **Caché**: El servidor guarda la info por 90 segundos en Redis
5. **Estado**: Si no hay heartbeat por >90s, el agente aparece como "Inactive"
