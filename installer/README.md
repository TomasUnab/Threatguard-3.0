# ThreatGuard Native Installer

## Overview
This directory contains the native installer for ThreatGuard, allowing installation directly on Linux and Windows systems without Docker.

## Directory Structure

```
installer/
├── installer-app/          # Electron-based GUI installer
│   ├── src/
│   │   ├── main.js        # Main process
│   │   ├── renderer/      # UI components
│   │   └── backend/       # Installation logic
│   └── package.json
│
├── binaries/              # Precompiled binaries
│   ├── linux/
│   │   └── snort-3.x.x-x64.tar.gz
│   └── windows/
│       └── snort-3.x.x-win64.zip
│
├── services/              # Service configuration
│   ├── linux/            # systemd service files
│   └── windows/          # Windows service scripts
│
├── config/               # Configuration templates
│   ├── snort.lua.template
│   ├── local.rules
│   └── .env.template
│
└── scripts/              # Installation scripts
    ├── linux/
    └── windows/
```

## Components Installed

### Core Components
- **ThreatGuard API**: FastAPI backend with ML capabilities
- **ThreatGuard Frontend**: React/Next.js web interface
- **Snort 3 IDS**: Network intrusion detection system
- **PostgreSQL**: Database for alerts and system data
- **Redis**: Cache and message broker

### Optional Components
- **OpenVAS**: Vulnerability scanner
- **Elasticsearch**: Advanced log management

## System Requirements

### Linux (Ubuntu 20.04+/Debian 11+)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Disk Space**: 50 GB minimum
- **Network**: Ethernet or Wi-Fi interface
- **Permissions**: Root/sudo access

### Windows (10/11)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Disk Space**: 50 GB minimum
- **Network**: Ethernet or Wi-Fi adapter
- **Permissions**: Administrator access

## Installation

### Using GUI Installer (Recommended)

1. Download the installer:
   - **Linux**: `ThreatGuard-Installer-Linux-x64.AppImage`
   - **Windows**: `ThreatGuard-Installer-Windows-x64.exe`

2. Run the installer:
   ```bash
   # Linux
   chmod +x ThreatGuard-Installer-Linux-x64.AppImage
   ./ThreatGuard-Installer-Linux-x64.AppImage
   
   # Windows
   ThreatGuard-Installer-Windows-x64.exe
   ```

3. Follow the on-screen instructions

### Manual Installation

#### Linux
```bash
cd installer/scripts/linux
sudo ./install.sh
```

#### Windows (PowerShell as Administrator)
```powershell
cd installer\scripts\windows
.\install.ps1
```

## Post-Installation

### Accessing ThreatGuard
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Default Credentials
- **Email**: admin@threatguard.local
- **Password**: (generated during installation, shown in completion screen)

### Service Management

#### Linux (systemd)
```bash
# Check status
sudo systemctl status threatguard-api
sudo systemctl status threatguard-snort
sudo systemctl status threatguard-integration
sudo systemctl status threatguard-frontend

# Start/Stop/Restart
sudo systemctl start threatguard-api
sudo systemctl stop threatguard-api
sudo systemctl restart threatguard-api

# View logs
sudo journalctl -u threatguard-api -f
sudo journalctl -u threatguard-snort -f
```

#### Windows (Services)
```powershell
# Check status
Get-Service ThreatGuardAPI
Get-Service ThreatGuardSnort
Get-Service ThreatGuardIntegration
Get-Service ThreatGuardFrontend

# Start/Stop/Restart
Start-Service ThreatGuardAPI
Stop-Service ThreatGuardAPI
Restart-Service ThreatGuardAPI

# View logs
Get-Content C:\ThreatGuard\logs\api.log -Tail 50 -Wait
```

## Configuration

### Network Interface
Snort monitors the network interface selected during installation. To change it:

#### Linux
```bash
sudo nano /etc/systemd/system/threatguard-snort.service
# Edit the -i parameter in ExecStart
sudo systemctl daemon-reload
sudo systemctl restart threatguard-snort
```

#### Windows
```powershell
# Edit service using NSSM
nssm edit ThreatGuardSnort
# Change the -i parameter
Restart-Service ThreatGuardSnort
```

### Snort Rules
Custom rules are located at:
- **Linux**: `/etc/snort/rules/local.rules`
- **Windows**: `C:\Snort\rules\local.rules`

After modifying rules, restart Snort:
```bash
# Linux
sudo systemctl restart threatguard-snort

# Windows
Restart-Service ThreatGuardSnort
```

## Uninstallation

### Linux
```bash
cd /opt/threatguard/installer/scripts/linux
sudo ./uninstall.sh
```

### Windows
```powershell
cd C:\ThreatGuard\installer\scripts\windows
.\uninstall.ps1
```

Or use Windows "Add or Remove Programs"

## Troubleshooting

### Snort Not Detecting Traffic
1. Verify network interface:
   ```bash
   # Linux
   ip addr show
   
   # Windows
   ipconfig
   ```

2. Check Snort is running:
   ```bash
   # Linux
   sudo systemctl status threatguard-snort
   ps aux | grep snort
   
   # Windows
   Get-Service ThreatGuardSnort
   Get-Process snort
   ```

3. Verify Snort can access the interface:
   ```bash
   # Linux
   sudo snort -c /usr/local/etc/snort/snort.lua -i eth0 -T
   ```

### Database Connection Issues
1. Check PostgreSQL is running:
   ```bash
   # Linux
   sudo systemctl status postgresql
   
   # Windows
   Get-Service postgresql*
   ```

2. Verify database exists:
   ```bash
   # Linux
   sudo -u postgres psql -l | grep threatguard
   
   # Windows
   psql -U postgres -l | findstr threatguard
   ```

### API Not Responding
1. Check API logs:
   ```bash
   # Linux
   sudo journalctl -u threatguard-api -n 100
   
   # Windows
   Get-Content C:\ThreatGuard\logs\api.log -Tail 100
   ```

2. Verify port 8000 is not in use:
   ```bash
   # Linux
   sudo netstat -tlnp | grep 8000
   
   # Windows
   netstat -ano | findstr :8000
   ```

## Development

### Building the Installer

#### Prerequisites
- Node.js 18+
- npm or yarn
- electron-builder

#### Build Commands
```bash
cd installer/installer-app

# Install dependencies
npm install

# Build for Linux
npm run build:linux

# Build for Windows
npm run build:windows

# Build for both
npm run build:all
```

## Support

For issues, questions, or contributions:
- **GitHub**: [ThreatGuard Repository]
- **Documentation**: [Full Documentation]
- **Email**: support@threatguard.local

## License

[Your License Here]

## Credits

- **Snort**: https://www.snort.org/
- **OpenVAS**: https://www.openvas.org/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/
