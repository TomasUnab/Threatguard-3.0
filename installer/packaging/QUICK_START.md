# Quick Start - Building ThreatGuard Installer

## For Users Who Just Want the Installer

### Windows

1. **Install Inno Setup**
   - Download: https://jrsoftware.org/isdl.php
   - Install with default options

2. **Build the Installer**
   ```powershell
   cd "C:\Users\tomas\Proyecto u\ThreatGuard\installer\packaging\windows"
   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" threatguard-setup.iss
   ```

3. **Find Your Installer**
   - Location: `installer\dist\ThreatGuard-Setup-1.0.0.exe`
   - Size: ~150-200 MB
   - Ready to distribute!

### Linux

1. **Install Dependencies**
   ```bash
   cd installer/installer-app
   npm install
   ```

2. **Build the Installer**
   ```bash
   npm run build:linux
   ```

3. **Find Your Installers**
   - AppImage: `dist/ThreatGuard-Installer-1.0.0.AppImage`
   - Debian: `dist/threatguard-installer_1.0.0_amd64.deb`
   - Ready to distribute!

## What Gets Packaged

✅ Complete ThreatGuard application (backend + frontend)  
✅ Installation scripts  
✅ Service configurations  
✅ Configuration templates  
✅ Snort rules  
✅ Documentation  
⚠️ Snort binaries (if you downloaded them)

## User Experience

When someone runs your installer:

1. **Windows**: Double-click `.exe` → Follow wizard → Everything installs automatically
2. **Linux**: Run AppImage or install .deb → Everything installs automatically

The installer will:
- ✅ Check system requirements
- ✅ Install Python, Node.js, PostgreSQL, Redis
- ✅ Install Snort 3
- ✅ Configure all services
- ✅ Create database and admin user
- ✅ Start ThreatGuard automatically
- ✅ Open browser to dashboard

**Total installation time**: 15-30 minutes (depending on internet speed)

## Testing

Test on a clean VM before distributing:

- **Windows**: Windows 10/11 VM
- **Linux**: Ubuntu 22.04 LTS VM

## That's It!

Your installer is ready to share. Users just need to:
1. Download the installer
2. Run it as Administrator/root
3. Wait for installation
4. Access ThreatGuard at http://localhost:3000

For detailed build options, see [BUILD_GUIDE.md](BUILD_GUIDE.md)
