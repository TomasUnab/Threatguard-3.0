# Snort 3 Binaries Download Guide

## Overview

This guide explains how to download and package Snort 3 binaries for the ThreatGuard installer.

## Required Binaries

### Linux Binary
- **File**: `snort-3.1.78.0-x64.tar.gz`
- **Location**: `installer/binaries/linux/`
- **Architecture**: x86_64
- **OS**: Ubuntu 20.04+ / Debian 11+

### Windows Binary
- **File**: `snort-3.1.78.0-win64.zip`
- **Location**: `installer/binaries/windows/`
- **Architecture**: x64
- **OS**: Windows 10/11

## Download Options

### Option 1: Official Snort Website (Recommended)

1. Visit the official Snort download page:
   - **URL**: https://www.snort.org/downloads

2. Create a free account or log in

3. Download the appropriate version:
   - **Linux**: Look for "Snort 3.x.x for Linux (x86_64)"
   - **Windows**: Look for "Snort 3.x.x for Windows (x64)"

4. Place the downloaded files in the correct directories:
   ```bash
   # Linux
   mv snort-3.*.tar.gz installer/binaries/linux/snort-3.1.78.0-x64.tar.gz
   
   # Windows
   mv snort-3.*.zip installer/binaries/windows/snort-3.1.78.0-win64.zip
   ```

### Option 2: Build from Source

If precompiled binaries are not available, you can build Snort from source.

#### Linux Build

```bash
# Install build dependencies
sudo apt-get install -y \
    build-essential \
    cmake \
    libpcap-dev \
    libpcre3-dev \
    libdnet-dev \
    zlib1g-dev \
    liblzma-dev \
    openssl \
    libssl-dev \
    libnghttp2-dev \
    libhwloc-dev \
    libluajit-5.1-dev \
    pkg-config

# Download and build libdaq
cd /tmp
wget https://github.com/snort3/libdaq/archive/refs/tags/v3.0.13.tar.gz
tar xzf v3.0.13.tar.gz
cd libdaq-3.0.13
./bootstrap
./configure
make
sudo make install

# Download and build Snort 3
cd /tmp
wget https://github.com/snort3/snort3/archive/refs/tags/3.1.78.0.tar.gz
tar xzf 3.1.78.0.tar.gz
cd snort3-3.1.78.0
./configure_cmake.sh --prefix=/usr/local
cd build
make -j$(nproc)
sudo make install

# Package the binary
cd /usr/local
tar -czf /tmp/snort-3.1.78.0-x64.tar.gz bin/snort lib/snort* etc/snort

# Move to installer directory
mv /tmp/snort-3.1.78.0-x64.tar.gz /path/to/ThreatGuard/installer/binaries/linux/
```

#### Windows Build

Building Snort on Windows is more complex. It's recommended to use the official precompiled binaries.

If you must build from source:

1. Install Visual Studio 2019 or later with C++ tools
2. Install CMake
3. Install vcpkg for dependencies
4. Follow the official Snort 3 Windows build guide:
   - https://github.com/snort3/snort3/blob/master/doc/user/building.txt

### Option 3: Package Manager (Fallback)

If binaries are not available, the installer will automatically fall back to installing Snort from the system package manager:

- **Linux**: `apt-get install snort`
- **Windows**: Not available via package manager

> **Note**: Package manager versions may be older than the latest Snort 3 release.

## Verifying Binaries

### Linux

```bash
# Extract and verify
cd installer/binaries/linux
tar -tzf snort-3.1.78.0-x64.tar.gz

# Should contain:
# - bin/snort
# - lib/snort_*
# - etc/snort/snort.lua (optional)
```

### Windows

```powershell
# Extract and verify
cd installer\binaries\windows
Expand-Archive -Path snort-3.1.78.0-win64.zip -DestinationPath temp

# Should contain:
# - bin\snort.exe
# - lib\*.dll
# - etc\snort.lua (optional)
```

## File Structure

After downloading, your directory structure should look like:

```
installer/
└── binaries/
    ├── linux/
    │   └── snort-3.1.78.0-x64.tar.gz      (~15-20 MB)
    └── windows/
        └── snort-3.1.78.0-win64.zip       (~20-25 MB)
```

## Alternative: Download Script

You can use this script to automatically download Snort binaries:

### Linux Download Script

```bash
#!/bin/bash
# download-snort-linux.sh

SNORT_VERSION="3.1.78.0"
DOWNLOAD_URL="https://www.snort.org/downloads/snort/snort-${SNORT_VERSION}-linux-x86_64.tar.gz"
OUTPUT_DIR="installer/binaries/linux"

mkdir -p "$OUTPUT_DIR"

echo "Downloading Snort ${SNORT_VERSION} for Linux..."
wget -O "${OUTPUT_DIR}/snort-${SNORT_VERSION}-x64.tar.gz" "$DOWNLOAD_URL"

echo "Download complete!"
```

### Windows Download Script

```powershell
# download-snort-windows.ps1

$SnortVersion = "3.1.78.0"
$DownloadUrl = "https://www.snort.org/downloads/snort/snort-${SnortVersion}-win64.zip"
$OutputDir = "installer\binaries\windows"

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

Write-Host "Downloading Snort ${SnortVersion} for Windows..."
Invoke-WebRequest -Uri $DownloadUrl -OutFile "${OutputDir}\snort-${SnortVersion}-win64.zip"

Write-Host "Download complete!"
```

## Important Notes

1. **License**: Snort is released under the GPL v2 license. Ensure compliance when distributing.

2. **Version Compatibility**: The installer is designed for Snort 3.1.78.0. Other versions may work but are untested.

3. **Size Considerations**: 
   - Linux binary: ~15-20 MB compressed
   - Windows binary: ~20-25 MB compressed
   - Total installer size will increase accordingly

4. **Updates**: Check for newer Snort versions periodically:
   - https://www.snort.org/downloads
   - https://github.com/snort3/snort3/releases

5. **Dependencies**: Precompiled binaries may have library dependencies:
   - Linux: libpcap, libdnet, libhwloc, libluajit
   - Windows: WinPcap or Npcap

## Troubleshooting

### Binary Not Found During Installation

If the installer cannot find the binary:

1. Check the file path is correct
2. Verify the filename matches exactly
3. Ensure the file is not corrupted (check file size)

### Binary Fails to Execute

If Snort fails to run after installation:

1. **Linux**: Check library dependencies
   ```bash
   ldd /usr/local/bin/snort
   ```

2. **Windows**: Install Npcap
   - Download from: https://npcap.com/
   - Required for packet capture on Windows

### Permission Issues

- **Linux**: Snort requires root privileges or CAP_NET_RAW capability
- **Windows**: Snort service must run as Administrator

## Support

For issues with Snort binaries:

- **Official Documentation**: https://docs.snort.org/
- **GitHub Issues**: https://github.com/snort3/snort3/issues
- **Mailing List**: https://lists.snort.org/

## License Information

Snort is licensed under the GNU General Public License v2.0:
- https://github.com/snort3/snort3/blob/master/COPYING

When distributing ThreatGuard with Snort binaries, ensure GPL compliance.
