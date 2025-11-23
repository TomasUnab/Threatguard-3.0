# Building ThreatGuard Installer

This guide explains how to build the complete ThreatGuard installer packages.

## Prerequisites

### For All Platforms
- Node.js 18+ and npm
- Git

### For Windows Installer
- **Inno Setup 6.x**: Download from https://jrsoftware.org/isdl.php
- Windows 10/11
- Visual Studio Build Tools (for native modules)

### For Linux Installer
- Ubuntu 20.04+ or Debian 11+
- Build tools: `sudo apt-get install build-essential`

## Preparation

### 1. Install Dependencies

```bash
cd installer/installer-app
npm install
```

### 2. Download Snort Binaries (Optional but Recommended)

Place Snort binaries in the appropriate directories:

- **Linux**: `installer/binaries/linux/snort-3.1.78.0-x64.tar.gz`
- **Windows**: `installer/binaries/windows/snort-3.1.78.0-win64.zip`

See [binaries/DOWNLOAD_GUIDE.md](../binaries/DOWNLOAD_GUIDE.md) for instructions.

> **Note**: If binaries are not provided, the installer will attempt to install Snort from package managers.

## Building with Electron Builder

### Build for Current Platform

```bash
cd installer/installer-app
npm run build
```

This will create installers for your current platform in `dist/` directory.

### Build for Linux

```bash
npm run build:linux
```

**Output**:
- `dist/ThreatGuard-Installer-1.0.0.AppImage` (~150-200 MB)
- `dist/threatguard-installer_1.0.0_amd64.deb` (~150-200 MB)

### Build for Windows

```bash
npm run build:windows
```

**Output**:
- `dist/ThreatGuard-Setup-1.0.0.exe` (~150-200 MB)

### Build for All Platforms

```bash
npm run build:all
```

> **Note**: Cross-platform building may require additional configuration. It's recommended to build on the target platform.

## Building with Inno Setup (Windows Only)

For more control over the Windows installer, you can use Inno Setup directly.

### 1. Install Inno Setup

Download and install from: https://jrsoftware.org/isdl.php

### 2. Compile the Script

```powershell
# Using Inno Setup Compiler
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\packaging\windows\threatguard-setup.iss
```

Or open `installer/packaging/windows/threatguard-setup.iss` in Inno Setup and click "Compile".

**Output**:
- `installer/dist/ThreatGuard-Setup-1.0.0.exe`

## Installer Contents

The packaged installer includes:

### Application Files (~100 MB)
- `src/` - Python backend source
- `PAGINA WEB/` - Next.js frontend source
- `config/` - Configuration files
- `main.py` - Main application entry
- `requirements.txt` - Python dependencies

### Installer Components (~20 MB)
- `installer-app/` - Electron GUI installer
- `services/` - systemd and Windows service configs
- `scripts/` - Installation scripts
- `config/` - Configuration templates

### Binaries (if included)
- `binaries/linux/snort-*.tar.gz` (~15-20 MB)
- `binaries/windows/snort-*.zip` (~20-25 MB)

### Documentation
- `README.md`
- `DOWNLOAD_GUIDE.md`

**Total Size**: ~150-200 MB (with Snort binaries)

## Testing the Installer

### Linux

```bash
# AppImage
chmod +x dist/ThreatGuard-Installer-1.0.0.AppImage
./dist/ThreatGuard-Installer-1.0.0.AppImage

# Debian Package
sudo dpkg -i dist/threatguard-installer_1.0.0_amd64.deb
```

### Windows

```powershell
# Run the installer
.\dist\ThreatGuard-Setup-1.0.0.exe
```

## Distribution

### Recommended Platforms

1. **GitHub Releases**
   - Upload to GitHub releases
   - Provide checksums (SHA256)
   - Include release notes

2. **Direct Download**
   - Host on your web server
   - Provide download links
   - Include version information

### Checksums

Generate checksums for verification:

```bash
# Linux
sha256sum dist/ThreatGuard-Installer-1.0.0.AppImage > dist/checksums.txt
sha256sum dist/threatguard-installer_1.0.0_amd64.deb >> dist/checksums.txt

# Windows (PowerShell)
Get-FileHash dist\ThreatGuard-Setup-1.0.0.exe -Algorithm SHA256 | Format-List
```

### Code Signing (Recommended for Production)

#### Windows

```powershell
# Sign with certificate
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com dist\ThreatGuard-Setup-1.0.0.exe
```

#### Linux

AppImages can be signed with GPG:

```bash
gpg --detach-sign --armor dist/ThreatGuard-Installer-1.0.0.AppImage
```

## Troubleshooting

### Build Fails on Windows

**Issue**: Native modules fail to compile

**Solution**:
```powershell
npm install --global windows-build-tools
npm rebuild
```

### Build Fails on Linux

**Issue**: Missing dependencies

**Solution**:
```bash
sudo apt-get install build-essential libxtst-dev libpng-dev
```

### Installer Size Too Large

**Issue**: Installer is larger than expected

**Solutions**:
1. Remove `node_modules` from packaged files
2. Use production builds only
3. Compress binaries
4. Exclude unnecessary files in `package.json`

### Electron Builder Errors

**Issue**: "Cannot find module"

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Advanced Configuration

### Custom Installer Icon

Replace these files:
- `installer/assets/icon.ico` (Windows, 256x256)
- `installer/assets/icon.png` (Linux, 512x512)
- `installer/assets/icon.icns` (macOS, if needed)

### Custom Installer UI

Edit:
- `installer/installer-app/src/renderer/index.html`
- `installer/installer-app/src/renderer/styles.css`

### Modify Installation Steps

Edit:
- `installer/installer-app/src/backend/linux-installer.js`
- `installer/installer-app/src/backend/windows-installer.js`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Installers

on:
  push:
    tags:
      - 'v*'

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd installer/installer-app && npm install
      - run: cd installer/installer-app && npm run build:linux
      - uses: actions/upload-artifact@v3
        with:
          name: linux-installers
          path: installer/installer-app/dist/*

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd installer/installer-app && npm install
      - run: cd installer/installer-app && npm run build:windows
      - uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: installer/installer-app/dist/*
```

## Version Management

Update version in:
1. `installer/installer-app/package.json`
2. `installer/packaging/windows/threatguard-setup.iss` (if using Inno Setup)

## Support

For build issues:
- Check [electron-builder documentation](https://www.electron.build/)
- Check [Inno Setup documentation](https://jrsoftware.org/ishelp/)
- Open an issue on GitHub

## License

Ensure compliance with all included components:
- Electron: MIT License
- Snort: GPL v2
- PostgreSQL: PostgreSQL License
- Redis: BSD License
- Your application license
