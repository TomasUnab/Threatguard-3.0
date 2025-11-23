#!/bin/bash
#
# ThreatGuard Native Installer for Linux
# Ubuntu 20.04+ / Debian 11+
#
# Usage: sudo ./install.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_PATH="/opt/threatguard"
SNORT_PATH="/usr/local"
LOG_FILE="/var/log/threatguard-install.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

# Banner
clear
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🛡️  ThreatGuard Installer                    ║
║                                                            ║
║          Advanced Threat Detection System                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF

echo ""
log "Starting ThreatGuard installation..."

# Step 1: Check system requirements
log "Step 1/13: Checking system requirements..."

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    info "OS: $NAME $VERSION"
else
    error "Cannot detect OS version"
fi

# Check RAM
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 8 ]; then
    warn "RAM: ${TOTAL_RAM}GB (8GB recommended)"
else
    info "RAM: ${TOTAL_RAM}GB ✓"
fi

# Check disk space
AVAILABLE_SPACE=$(df -BG / | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 50 ]; then
    warn "Disk space: ${AVAILABLE_SPACE}GB (50GB recommended)"
else
    info "Disk space: ${AVAILABLE_SPACE}GB ✓"
fi

# Step 2: Update package lists
log "Step 2/13: Updating package lists..."
apt-get update -qq || error "Failed to update package lists"

# Step 3: Install system dependencies
log "Step 3/13: Installing system dependencies..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    nodejs \
    npm \
    postgresql \
    postgresql-contrib \
    redis-server \
    libpcap-dev \
    libdnet-dev \
    build-essential \
    git \
    curl \
    wget \
    || error "Failed to install dependencies"

# Step 4: Create directories
log "Step 4/13: Creating directories..."
mkdir -p "$INSTALL_PATH"/{logs,data,config,models}
mkdir -p /var/log/snort
mkdir -p /etc/snort/rules
mkdir -p /var/log/threatguard

# Create threatguard user
if ! id -u threatguard > /dev/null 2>&1; then
    useradd -r -s /bin/false threatguard
    log "Created threatguard user"
fi

# Step 5: Copy application files
log "Step 5/13: Copying application files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_SOURCE="$(dirname "$(dirname "$SCRIPT_DIR")")"

if [ -d "$APP_SOURCE/src" ]; then
    cp -r "$APP_SOURCE/src" "$INSTALL_PATH/"
    cp "$APP_SOURCE/main.py" "$INSTALL_PATH/"
    cp "$APP_SOURCE/requirements.txt" "$INSTALL_PATH/"
    cp -r "$APP_SOURCE/PAGINA WEB" "$INSTALL_PATH/"
    cp -r "$APP_SOURCE/config" "$INSTALL_PATH/"
    log "Application files copied"
else
    error "Application source files not found"
fi

# Step 6: Install Python dependencies
log "Step 6/13: Installing Python dependencies..."
python3 -m venv "$INSTALL_PATH/venv"
"$INSTALL_PATH/venv/bin/pip" install --upgrade pip setuptools wheel
"$INSTALL_PATH/venv/bin/pip" install -r "$INSTALL_PATH/requirements.txt"

# Step 7: Install Snort
log "Step 7/13: Installing Snort 3..."
if [ -f "$SCRIPT_DIR/../binaries/linux/snort-3.1.78.0-x64.tar.gz" ]; then
    tar -xzf "$SCRIPT_DIR/../binaries/linux/snort-3.1.78.0-x64.tar.gz" -C "$SNORT_PATH"
    ln -sf "$SNORT_PATH/snort/bin/snort" /usr/local/bin/snort
    log "Snort installed from binary"
else
    warn "Snort binary not found, installing from package..."
    apt-get install -y snort || warn "Snort installation failed"
fi

# Step 8: Setup PostgreSQL
log "Step 8/13: Configuring PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

DB_PASSWORD=$(openssl rand -base64 12)

sudo -u postgres psql << EOF
CREATE DATABASE threatguard_db;
CREATE USER threatguard_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE threatguard_db TO threatguard_user;
ALTER DATABASE threatguard_db OWNER TO threatguard_user;
EOF

# Create .env file
cat > "$INSTALL_PATH/.env" << EOF
DATABASE_URL=postgresql+psycopg2://threatguard_user:$DB_PASSWORD@localhost:5432/threatguard_db
REDIS_HOST=localhost
REDIS_PORT=6379
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
NEXT_PUBLIC_API_URL=http://localhost:8000
SNORT_ALERT_FILE=/var/log/snort/alert
THREATGUARD_API_URL=http://localhost:8000
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF

log "PostgreSQL configured (password: $DB_PASSWORD)"

# Step 9: Setup Redis
log "Step 9/13: Configuring Redis..."
systemctl start redis-server
systemctl enable redis-server

# Step 10: Configure Snort
log "Step 10/13: Configuring Snort..."

# Detect primary network interface
PRIMARY_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
info "Primary network interface: $PRIMARY_INTERFACE"

# Copy Snort config
if [ -f "$SCRIPT_DIR/../config/snort.lua.template" ]; then
    sed "s/INTERFACE/$PRIMARY_INTERFACE/g" "$SCRIPT_DIR/../config/snort.lua.template" > /usr/local/etc/snort/snort.lua
fi

# Copy rules
if [ -f "$SCRIPT_DIR/../config/local.rules" ]; then
    cp "$SCRIPT_DIR/../config/local.rules" /etc/snort/rules/
fi

# Step 11: Configure systemd services
log "Step 11/13: Configuring systemd services..."

for service in api snort integration frontend; do
    if [ -f "$SCRIPT_DIR/../services/linux/threatguard-$service.service" ]; then
        cp "$SCRIPT_DIR/../services/linux/threatguard-$service.service" /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable "threatguard-$service.service"
        log "Service configured: threatguard-$service"
    fi
done

# Step 12: Build frontend
log "Step 12/13: Building frontend..."
cd "$INSTALL_PATH/PAGINA WEB"
npm install
npm run build

# Step 13: Create admin user
log "Step 13/13: Creating admin user..."
ADMIN_PASSWORD=$(openssl rand -base64 12)

cat > /tmp/create_admin.py << EOF
import sys
sys.path.append('$INSTALL_PATH')

from src.database import SessionLocal, engine
from src.models import User, Base
import bcrypt

Base.metadata.create_all(bind=engine)

db = SessionLocal()
hashed = bcrypt.hashpw("$ADMIN_PASSWORD".encode(), bcrypt.gensalt())
admin = User(
    email="admin@threatguard.local",
    password=hashed.decode(),
    is_admin=True,
    is_active=True
)
db.add(admin)
db.commit()
db.close()

print("Admin user created")
EOF

"$INSTALL_PATH/venv/bin/python" /tmp/create_admin.py
rm /tmp/create_admin.py

# Set permissions
chown -R threatguard:threatguard "$INSTALL_PATH"
chown -R threatguard:threatguard /var/log/threatguard

# Start services
log "Starting services..."
systemctl start threatguard-api
systemctl start threatguard-snort
systemctl start threatguard-integration
systemctl start threatguard-frontend

# Wait for services to start
sleep 5

# Verify installation
log "Verifying installation..."
if systemctl is-active --quiet threatguard-api; then
    info "API service: Running ✓"
else
    warn "API service: Not running"
fi

if systemctl is-active --quiet threatguard-snort; then
    info "Snort service: Running ✓"
else
    warn "Snort service: Not running"
fi

# Installation complete
cat << EOF

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          ✅  Installation Completed Successfully!         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📊 ThreatGuard Access Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🌐 Frontend URL:    http://localhost:3000
  🔌 API URL:         http://localhost:8000
  📚 API Docs:        http://localhost:8000/docs

  👤 Admin Email:     admin@threatguard.local
  🔑 Admin Password:  $ADMIN_PASSWORD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Save these credentials in a secure location!

📝 Service Management:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Check status:   sudo systemctl status threatguard-api
  View logs:      sudo journalctl -u threatguard-api -f
  Restart:        sudo systemctl restart threatguard-api

  Services:
    - threatguard-api
    - threatguard-snort
    - threatguard-integration
    - threatguard-frontend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Installation Path: $INSTALL_PATH
📋 Log File:          $LOG_FILE

EOF

log "Installation completed successfully!"
