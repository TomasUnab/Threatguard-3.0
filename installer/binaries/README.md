# Snort Binaries

This directory should contain precompiled Snort 3 binaries for faster installation.

## Required Files

### Linux
- `linux/snort-3.1.78.0-x64.tar.gz` (~15-20 MB)

### Windows
- `windows/snort-3.1.78.0-win64.zip` (~20-25 MB)

## Download Instructions

See [DOWNLOAD_GUIDE.md](DOWNLOAD_GUIDE.md) for detailed instructions on obtaining these binaries.

## Quick Download

### Linux
```bash
cd linux
wget https://www.snort.org/downloads/snort/snort-3.1.78.0-linux-x86_64.tar.gz -O snort-3.1.78.0-x64.tar.gz
```

### Windows
```powershell
cd windows
Invoke-WebRequest -Uri "https://www.snort.org/downloads/snort/snort-3.1.78.0-win64.zip" -OutFile "snort-3.1.78.0-win64.zip"
```

> **Note**: You may need to create a free account on snort.org to download binaries.

## Fallback

If binaries are not provided, the installer will attempt to install Snort from the system package manager:
- **Linux**: `apt-get install snort`
- **Windows**: Installation will fail (no package manager available)

For best results, provide precompiled binaries.
