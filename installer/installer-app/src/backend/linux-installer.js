const { InstallerCommon } = require('./common');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');

class LinuxInstaller extends InstallerCommon {
    constructor() {
        super();
        this.installPath = '/opt/threatguard';
        this.servicePath = '/etc/systemd/system';
        this.snortPath = '/usr/local';
        this.snortConfigPath = '/usr/local/etc/snort';
        this.snortRulesPath = '/etc/snort/rules';
        this.logPath = '/var/log/threatguard';
    }

    /**
     * Check system requirements
     */
    async checkRequirements() {
        this.log('Checking system requirements...');

        const requirements = {
            os: {
                valid: os.platform() === 'linux',
                value: `${os.type()} ${os.release()}`,
                required: 'Linux (Ubuntu 20.04+ / Debian 11+)'
            },
            ram: {
                valid: this.getTotalRAM() >= 8,
                value: `${this.getTotalRAM()} GB`,
                required: '8 GB minimum'
            },
            disk: {
                valid: await this.checkDiskSpace('/') >= 50,
                value: `${await this.checkDiskSpace('/')} GB available`,
                required: '50 GB minimum'
            },
            sudo: {
                valid: this.isAdmin(),
                value: this.isAdmin() ? 'Yes' : 'No',
                required: 'Root/sudo access required'
            },
            python: {
                valid: await this.commandExists('python3'),
                value: await this.getPythonVersion(),
                required: 'Python 3.10+'
            },
            node: {
                valid: await this.commandExists('node'),
                value: await this.getNodeVersion(),
                required: 'Node.js 18+'
            }
        };

        return requirements;
    }

    /**
     * Get Python version
     */
    async getPythonVersion() {
        try {
            const { stdout } = await this.execCommand('python3 --version');
            return stdout.trim();
        } catch {
            return 'Not installed';
        }
    }

    /**
     * Get Node.js version
     */
    async getNodeVersion() {
        try {
            const { stdout } = await this.execCommand('node --version');
            return stdout.trim();
        } catch {
            return 'Not installed';
        }
    }

    /**
     * Get available network interfaces
     */
    async getNetworkInterfaces() {
        this.log('Detecting network interfaces...');

        const interfaces = os.networkInterfaces();
        const result = [];

        for (const [name, addrs] of Object.entries(interfaces)) {
            // Skip loopback
            if (name === 'lo') continue;

            const ipv4 = addrs.find(addr => addr.family === 'IPv4' && !addr.internal);
            if (ipv4) {
                // Get interface status
                const status = await this.getInterfaceStatus(name);

                result.push({
                    name,
                    ip: ipv4.address,
                    mac: ipv4.mac,
                    netmask: ipv4.netmask,
                    status: status.up ? 'Connected' : 'Disconnected',
                    speed: status.speed || 'Unknown'
                });
            }
        }

        return result;
    }

    /**
     * Get interface status
     */
    async getInterfaceStatus(interfaceName) {
        try {
            const { stdout } = await this.execCommand(`ip link show ${interfaceName}`);
            const up = stdout.includes('state UP');

            // Try to get speed
            let speed = null;
            try {
                const { stdout: speedOut } = await this.execCommand(
                    `ethtool ${interfaceName} 2>/dev/null | grep Speed`
                );
                speed = speedOut.trim().split(':')[1]?.trim();
            } catch {
                // Speed detection failed, not critical
            }

            return { up, speed };
        } catch {
            return { up: false, speed: null };
        }
    }

    /**
     * Main installation function
     */
    async install(config, progressCallback) {
        this.log('Starting ThreatGuard installation...');
        const startTime = Date.now();

        try {
            // Step 1: Install system dependencies (10%)
            progressCallback({
                step: 'dependencies',
                progress: 5,
                message: 'Updating package lists...'
            });
            await this.updatePackageLists();

            progressCallback({
                step: 'dependencies',
                progress: 10,
                message: 'Installing system dependencies...'
            });
            await this.installSystemDependencies();

            // Step 2: Create directories (20%)
            progressCallback({
                step: 'directories',
                progress: 20,
                message: 'Creating directories...'
            });
            await this.createDirectories();

            // Step 3: Copy application files (30%)
            progressCallback({
                step: 'files',
                progress: 30,
                message: 'Copying application files...'
            });
            await this.copyApplicationFiles();

            // Step 4: Install Python dependencies (40%)
            progressCallback({
                step: 'python',
                progress: 40,
                message: 'Installing Python dependencies...'
            });
            await this.installPythonDependencies();

            // Step 5: Install Snort (50%)
            progressCallback({
                step: 'snort',
                progress: 50,
                message: 'Installing Snort 3...'
            });
            await this.installSnort();

            // Step 6: Setup PostgreSQL (60%)
            progressCallback({
                step: 'database',
                progress: 60,
                message: 'Configuring PostgreSQL database...'
            });
            await this.setupPostgreSQL(config);

            // Step 7: Setup Redis (65%)
            progressCallback({
                step: 'redis',
                progress: 65,
                message: 'Configuring Redis...'
            });
            await this.setupRedis();

            // Step 8: Configure services (70%)
            progressCallback({
                step: 'services',
                progress: 70,
                message: 'Configuring systemd services...'
            });
            await this.configureServices(config);

            // Step 9: Configure Snort (80%)
            progressCallback({
                step: 'snort-config',
                progress: 80,
                message: 'Configuring Snort IDS...'
            });
            await this.configureSnort(config);

            // Step 10: Build frontend (85%)
            progressCallback({
                step: 'frontend',
                progress: 85,
                message: 'Building frontend...'
            });
            await this.buildFrontend();

            // Step 11: Create admin user (90%)
            progressCallback({
                step: 'admin',
                progress: 90,
                message: 'Creating admin user...'
            });
            const credentials = await this.createAdminUser();

            // Step 12: Start services (95%)
            progressCallback({
                step: 'start',
                progress: 95,
                message: 'Starting services...'
            });
            await this.startServices();

            // Step 13: Verify installation (100%)
            progressCallback({
                step: 'verify',
                progress: 98,
                message: 'Verifying installation...'
            });
            await this.verifyInstallation();

            progressCallback({
                step: 'complete',
                progress: 100,
                message: 'Installation completed successfully!'
            });

            const duration = Math.round((Date.now() - startTime) / 1000);
            this.log(`Installation completed in ${duration} seconds`);

            return {
                success: true,
                credentials,
                duration,
                installPath: this.installPath
            };

        } catch (error) {
            this.log(`Installation failed: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message,
                logs: this.getLogs()
            };
        }
    }

    /**
     * Update package lists
     */
    async updatePackageLists() {
        this.log('Updating package lists...');
        await this.execCommand('sudo apt-get update -qq');
    }

    /**
     * Install system dependencies
     */
    async installSystemDependencies() {
        this.log('Installing system dependencies...');

        const packages = [
            'python3',
            'python3-pip',
            'python3-venv',
            'python3-dev',
            'nodejs',
            'npm',
            'postgresql',
            'postgresql-contrib',
            'redis-server',
            'libpcap-dev',
            'libdnet-dev',
            'build-essential',
            'git',
            'curl',
            'wget'
        ];

        await this.execCommand(`sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${packages.join(' ')}`);
        this.log('System dependencies installed');
    }

    /**
     * Create necessary directories
     */
    async createDirectories() {
        this.log('Creating directories...');

        const dirs = [
            this.installPath,
            `${this.installPath}/logs`,
            `${this.installPath}/data`,
            `${this.installPath}/config`,
            `${this.installPath}/models`,
            this.logPath,
            '/var/log/snort',
            this.snortRulesPath
        ];

        for (const dir of dirs) {
            await this.createDirectory(dir);
        }

        // Create threatguard user
        try {
            await this.execCommand('sudo useradd -r -s /bin/false threatguard');
            this.log('Created threatguard user');
        } catch {
            this.log('User threatguard already exists', 'warn');
        }

        // Set ownership
        await this.execCommand(`sudo chown -R threatguard:threatguard ${this.installPath}`);
        await this.execCommand(`sudo chown -R threatguard:threatguard ${this.logPath}`);
    }

    /**
     * Copy application files
     */
    async copyApplicationFiles() {
        this.log('Copying application files...');

        const appPath = this.getResourcePath('../../..');

        // Copy backend
        await this.execCommand(`sudo cp -r "${appPath}/src" ${this.installPath}/`);
        await this.execCommand(`sudo cp "${appPath}/main.py" ${this.installPath}/`);
        await this.execCommand(`sudo cp "${appPath}/requirements.txt" ${this.installPath}/`);

        // Copy frontend
        await this.execCommand(`sudo cp -r "${appPath}/PAGINA WEB" "${this.installPath}/"`);

        // Copy config
        await this.execCommand(`sudo cp -r "${appPath}/config" ${this.installPath}/`);

        this.log('Application files copied');
    }

    /**
     * Install Python dependencies
     */
    async installPythonDependencies() {
        this.log('Installing Python dependencies...');

        // Create virtual environment
        await this.execCommand(`sudo python3 -m venv ${this.installPath}/venv`);

        // Install dependencies
        await this.execCommand(
            `sudo ${this.installPath}/venv/bin/pip install --upgrade pip setuptools wheel`
        );
        await this.execCommand(
            `sudo ${this.installPath}/venv/bin/pip install -r ${this.installPath}/requirements.txt`
        );

        this.log('Python dependencies installed');
    }

    /**
     * Install Snort
     */
    async installSnort() {
        this.log('Installing Snort 3...');

        const snortBinary = this.getResourcePath('binaries/linux/snort-3.1.78.0-x64.tar.gz');

        if (await fs.pathExists(snortBinary)) {
            // Extract precompiled binary
            await this.execCommand(`sudo tar -xzf "${snortBinary}" -C ${this.snortPath}`);
            await this.execCommand(`sudo ln -sf ${this.snortPath}/snort/bin/snort /usr/local/bin/snort`);
        } else {
            // Install from package manager as fallback
            this.log('Precompiled binary not found, installing from package...', 'warn');
            await this.execCommand('sudo apt-get install -y snort');
        }

        // Verify installation
        const { stdout } = await this.execCommand('snort --version');
        this.log(`Snort installed: ${stdout.split('\n')[0]}`);
    }

    /**
     * Setup PostgreSQL
     */
    async setupPostgreSQL(config) {
        this.log('Setting up PostgreSQL...');

        const dbPassword = this.generatePassword(16);

        // Create database and user
        const sqlScript = `
      CREATE DATABASE threatguard_db;
      CREATE USER threatguard_user WITH PASSWORD '${dbPassword}';
      GRANT ALL PRIVILEGES ON DATABASE threatguard_db TO threatguard_user;
      ALTER DATABASE threatguard_db OWNER TO threatguard_user;
    `;

        await fs.writeFile('/tmp/setup_db.sql', sqlScript);
        await this.execCommand('sudo -u postgres psql -f /tmp/setup_db.sql');
        await fs.remove('/tmp/setup_db.sql');

        // Update .env file
        const envPath = `${this.installPath}/.env`;
        const envTemplate = this.getResourcePath('config/.env.template');

        await this.processTemplate(envTemplate, envPath, {
            DATABASE_PASSWORD: dbPassword,
            API_PORT: config.apiPort || 8000,
            FRONTEND_PORT: config.frontendPort || 3000,
            SECRET_KEY: this.generateSecretKey(),
            JWT_SECRET: this.generateSecretKey()
        });

        this.log('PostgreSQL configured');
        return dbPassword;
    }

    /**
     * Setup Redis
     */
    async setupRedis() {
        this.log('Setting up Redis...');

        // Start Redis service
        await this.execCommand('sudo systemctl enable redis-server');
        await this.execCommand('sudo systemctl start redis-server');

        this.log('Redis configured');
    }

    /**
     * Configure systemd services
     */
    async configureServices(config) {
        this.log('Configuring systemd services...');

        const services = ['api', 'snort', 'integration', 'frontend'];
        const servicesPath = this.getResourcePath('services/linux');

        for (const service of services) {
            const serviceFile = `threatguard-${service}.service`;
            const srcPath = path.join(servicesPath, serviceFile);
            const destPath = path.join(this.servicePath, serviceFile);

            await this.copyFile(srcPath, destPath, 0o644);
            await this.execCommand('sudo systemctl daemon-reload');
            await this.execCommand(`sudo systemctl enable ${serviceFile}`);

            this.log(`Service configured: ${serviceFile}`);
        }
    }

    /**
     * Configure Snort
     */
    async configureSnort(config) {
        this.log('Configuring Snort...');

        const snortTemplate = this.getResourcePath('config/snort.lua.template');
        const snortConfig = `${this.snortConfigPath}/snort.lua`;

        await this.processTemplate(snortTemplate, snortConfig, {
            INTERFACE: config.networkInterface
        });

        // Copy rules
        const rulesPath = this.getResourcePath('config/local.rules');
        await this.copyFile(rulesPath, `${this.snortRulesPath}/local.rules`, 0o644);

        this.log('Snort configured');
    }

    /**
     * Build frontend
     */
    async buildFrontend() {
        this.log('Building frontend...');

        const frontendPath = `${this.installPath}/PAGINA WEB`;

        // Install dependencies
        await this.execCommand(`cd "${frontendPath}" && npm install`);

        // Build
        await this.execCommand(`cd "${frontendPath}" && npm run build`);

        this.log('Frontend built');
    }

    /**
     * Create admin user
     */
    async createAdminUser() {
        this.log('Creating admin user...');

        const password = this.generatePassword(12);
        const email = 'admin@threatguard.local';

        // Create Python script to add user
        const script = `
import sys
sys.path.append('${this.installPath}')

from src.database import SessionLocal, engine
from src.models import User, Base
import bcrypt

# Create tables
Base.metadata.create_all(bind=engine)

# Create admin user
db = SessionLocal()
hashed = bcrypt.hashpw("${password}".encode(), bcrypt.gensalt())
admin = User(
    email="${email}",
    password=hashed.decode(),
    is_admin=True,
    is_active=True
)
db.add(admin)
db.commit()
db.close()

print("Admin user created successfully")
`;

        await fs.writeFile('/tmp/create_admin.py', script);
        await this.execCommand(`sudo ${this.installPath}/venv/bin/python /tmp/create_admin.py`);
        await fs.remove('/tmp/create_admin.py');

        this.log('Admin user created');

        return { email, password };
    }

    /**
     * Start services
     */
    async startServices() {
        this.log('Starting services...');

        const services = [
            'postgresql',
            'redis-server',
            'threatguard-api',
            'threatguard-snort',
            'threatguard-integration',
            'threatguard-frontend'
        ];

        for (const service of services) {
            await this.execCommand(`sudo systemctl start ${service}`);
            await this.sleep(1000); // Wait 1 second between services
            this.log(`Started service: ${service}`);
        }
    }

    /**
     * Verify installation
     */
    async verifyInstallation() {
        this.log('Verifying installation...');

        // Check services
        const services = ['threatguard-api', 'threatguard-snort', 'threatguard-integration', 'threatguard-frontend'];

        for (const service of services) {
            const { stdout } = await this.execCommand(`sudo systemctl is-active ${service}`);
            if (stdout.trim() !== 'active') {
                throw new Error(`Service ${service} is not running`);
            }
        }

        // Check API health
        await this.sleep(3000); // Wait for API to start
        try {
            await this.execCommand('curl -f http://localhost:8000/health');
            this.log('API health check passed');
        } catch {
            this.log('API health check failed, but continuing...', 'warn');
        }

        this.log('Installation verified');
    }
}

module.exports = { LinuxInstaller };
