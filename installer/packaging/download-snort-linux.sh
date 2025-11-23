#!/bin/bash
#
# Download Snort Binaries - Automated Script for Linux
#

VERSION="3.1.78.0"
OUTPUT_DIR="../../binaries/linux"

echo "Snort Binary Download Script"
echo "============================="
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Snort download URL (may require authentication)
LINUX_URL="https://www.snort.org/downloads/snort/snort-${VERSION}-linux-x86_64.tar.gz"
OUTPUT_FILE="$OUTPUT_DIR/snort-${VERSION}-x64.tar.gz"

echo "Attempting to download Snort ${VERSION} for Linux..."
echo ""

if wget -O "$OUTPUT_FILE" "$LINUX_URL" 2>/dev/null; then
    echo "✓ Download successful!"
    echo ""
    echo "File saved to: $OUTPUT_FILE"
    
    # Verify file size
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "File size: $FILE_SIZE"
    
else
    echo "✗ Automatic download failed"
    echo ""
    echo "This is normal - Snort.org requires authentication."
    echo ""
    echo "Please download manually:"
    echo "1. Visit: https://www.snort.org/downloads"
    echo "2. Create a free account or log in"
    echo "3. Download: Snort ${VERSION} for Linux (x86_64)"
    echo "4. Save as: $OUTPUT_FILE"
    echo ""
    echo "Alternative - Build from source:"
    echo "  git clone https://github.com/snort3/snort3.git"
    echo "  cd snort3"
    echo "  ./configure_cmake.sh --prefix=/usr/local"
    echo "  cd build"
    echo "  make -j\$(nproc)"
    echo "  sudo make install"
    echo ""
    
    # Ask to open browser
    read -p "Open Snort download page in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "https://www.snort.org/downloads" 2>/dev/null || \
        open "https://www.snort.org/downloads" 2>/dev/null || \
        echo "Please visit: https://www.snort.org/downloads"
    fi
fi

echo ""
echo "Note: The installer will work WITHOUT binaries."
echo "It will install Snort from apt-get if binaries are missing."
