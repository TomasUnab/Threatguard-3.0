const { InstallerCommon } = require('./common');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');

class WindowsInstaller extends InstallerCommon {
    constructor() {
        super();
        this.installPath = 'C:\\ThreatGuard';
        this.snortPath = 'C:\\Snort';
        this.postgresPath = 'C:\\Program Files\\PostgreSQL\\15';
        this.redisPath = 'C:\\Redis';
    }

    /**
     * Check system requirements
     */
    async checkRequirements() {
        this.log('Checking system requirements...');

        const requirements = {
            os: {
                valid: os.platform() === 'win32' && parseFloat(os.release()) >= 10,
                value: `Windows ${os.release()}`,
                required: 'Windows 10/11'
            },
            ram: {
                valid: this.getTotalRAM() >= 8,
                value: `${this.getTotalRAM()} GB`,
                required: '8 GB minimum'
            },
            disk: {
                valid: await this.checkDiskSpace('C:\\') >= 50,
                value: `${await this.checkDiskSpace('C:\\')} GB available`,
                required: '50 GB minimum'
            },
            admin: {
                valid: this.isAdmin(),
                value: this.isAdmin() ? 'Yes' : 'No',
                required: 'Administrator access required'
            },
            python: {
                valid: await this.commandExists('python'),
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
            const { stdout } = await this.execCommand('python --version');
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
            if (name.includes('Loopback')) continue;

            const ipv4 = addrs.find(addr => addr.family === 'IPv4' && !addr.internal);
            if (ipv4) {
                // Get interface index for Snort
                const index = await this.getInterfaceIndex(name);

                result.push({
                    name,
                    index,
                    ip: ipv4.address,
                    mac: ipv4.mac,
                    netmask: ipv4.netmask,
                    status: 'Connected'
                });
            }
        }

        return result;
    }

    /**
     * Get interface index for Snort (Windows uses numeric indices)
     */
    async getInterfaceIndex(interfaceName) {
        try {
            const { stdout } = await this.execCommand(
                `powershell "Get-NetAdapter | Where-Object {$_.Name -like '*${interfaceName}*'} | Select-Object -ExpandProperty InterfaceIndex"`
            );
            return stdout.trim() || '1';
        } catch {
            return '1'; // Default to first interface
        }
    }

    /**
     * Main installation function
     */
    async install(config, progressCallback) {
        this.log('Starting ThreatGuard installation...');
        const startTime = Date.now();

        try {
            // Step 1: Install Chocolatey (5%)
            progressCallback({
                step: 'chocolatey',
                progress: 5,
                message: 'Installing Chocolatey package manager...'
            });
            await this.installChocolatey();

            // Step 2: Install system dependencies (15%)
            progressCallback({
                step: 'dependencies',
                progress: 15,
                message: 'Installing system dependencies...'
            });
            await this.installSystemDependencies();

            // Step 3: Create directories (25%)
            progressCallback({
                step: 'directories',
                progress: 25,
                message: 'Creating directories...'
            });
            await this.createDirectories();

            // Step 4: Copy application files (35%)
            progressCallback({
                step: 'files',
                progress: 35,
                message: 'Copying application files...'
            });
            await this.copyApplicationFiles();

            // Step 5: Install Python dependencies (45%)
            progressCallback({
                step: 'python',
                progress: 45,
                message: 'Installing Python dependencies...'
            });
            await this.installPythonDependencies();

            // Step 6: Install Snort (55%)
            progressCallback({
                step: 'snort',
                progress: 55,
                message: 'Installing Snort 3...'
            });
            await this.installSnort();

            // Step 7: Setup PostgreSQL (65%)
            progressCallback({
                step: 'database',
                progress: 65,
                message: 'Configuring PostgreSQL database...'
            });
            await this.setupPostgreSQL(config);

            // Step 8: Setup Redis (70%)
            progressCallback({
                step: 'redis',
                progress: 70,
                message: 'Configuring Redis...'
            });
            await this.setupRedis();

            // Step 9: Configure services (75%)
            progressCallback({
                step: 'services',
                progress: 75,
                message: 'Configuring Windows services...'
            });
            await this.configureServices(config);

            // Step 10: Configure Snort (82%)
            progressCallback({
                step: 'snort-config',
                progress: 82,
                message: 'Configuring Snort IDS...'
            });
            await this.configureSnort(config);

            // Step 11: Build frontend (88%)
            progressCallback({
                step: 'frontend',
                progress: 88,
                message: 'Building frontend...'
            });
            await this.buildFrontend();

            // Step 12: Create admin user (93%)
            progressCallback({
                step: 'admin',
                progress: 93,
                message: 'Creating admin user...'
            });
            const credentials = await this.createAdminUser();

            // Step 13: Start services (97%)
            progressCallback({
                step: 'start',
                progress: 97,
                message: 'Starting services...'
            });
            await this.startServices();

            // Step 14: Configure firewall (99%)
            progressCallback({
                step: 'firewall',
                progress: 99,
                message: 'Configuring firewall...'
            });
            await this.configureFirewall(config);

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
     * Install Chocolatey package manager
     */
    async installChocolatey() {
        if (await this.commandExists('choco')) {
            this.log('Chocolatey already installed');
            return;
        }

        this.log('Installing Chocolatey...');

        const installScript = `
      Set-ExecutionPolicy Bypass -Scope Process -Force;
      [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;
      iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    `;

        await this.execCommand(`powershell -Command "${installScript}"`);
        this.log('Chocolatey installed');
    }

    /**
     * Install system dependencies
     */
    async installSystemDependencies() {
        this.log('Installing system dependencies...');

        const packages = [
            'python --version=3.11',
            'nodejs --version=20.10.0',
            'postgresql15',
            'redis-64',
            'git',
            'nssm'
        ];

        for (const pkg of packages) {
            try {
                await this.execCommand(`choco install ${pkg} -y`);
                this.log(`Installed: ${pkg}`);
            } catch (error) {
                this.log(`Failed to install ${pkg}: ${error.message}`, 'warn');
            }
        }

        // Refresh environment variables
        await this.execCommand('refreshenv');

        this.log('System dependencies installed');
    }

    /**
     * Create necessary directories
     */
    async createDirectories() {
        this.log('Creating directories...');

        const dirs = [
            this.installPath,
            `${this.installPath}\\logs`,
            `${this.installPath}\\data`,
            `${this.installPath}\\config`,
            `${this.installPath}\\models`,
            `${this.snortPath}\\log`,
            `${this.snortPath}\\etc`,
            `${this.snortPath}\\rules`
        ];

        for (const dir of dirs) {
            await this.createDirectory(dir);
        }
    }

    /**
     * Copy application files
     */
    async copyApplicationFiles() {
        this.log('Copying application files...');

        const appPath = this.getResourcePath('../../..');

        // Copy backend
        await this.execCommand(`xcopy /E /I /Y "${appPath}\\src" "${this.installPath}\\src"`);
        await this.execCommand(`copy /Y "${appPath}\\main.py" "${this.installPath}\\"`);
        await this.execCommand(`copy /Y "${appPath}\\requirements.txt" "${this.installPath}\\"`);

        // Copy frontend
        await this.execCommand(`xcopy /E /I /Y "${appPath}\\PAGINA WEB" "${this.installPath}\\PAGINA WEB"`);

        // Copy config
        await this.execCommand(`xcopy /E /I /Y "${appPath}\\config" "${this.installPath}\\config"`);

        this.log('Application files copied');
    }

    /**
     * Install Python dependencies
     */
    async installPythonDependencies() {
        this.log('Installing Python dependencies...');

        // Create virtual environment
        await this.execCommand(`python -m venv "${this.installPath}\\venv"`);

        // Install dependencies
        await this.execCommand(
            `"${this.installPath}\\venv\\Scripts\\pip.exe" install --upgrade pip setuptools wheel`
        );
        await this.execCommand(
            `"${this.installPath}\\venv\\Scripts\\pip.exe" install -r "${this.installPath}\\requirements.txt"`
        );

        this.log('Python dependencies installed');
    }

    /**
     * Install Snort
     */
    async installSnort() {
        this.log('Installing Snort 3...');

        const snortBinary = this.getResourcePath('binaries/windows/snort-3.1.78.0-win64.zip');

        if (await fs.pathExists(snortBinary)) {
            // Extract precompiled binary
            await this.execCommand(
                `powershell "Expand-Archive -Path '${snortBinary}' -DestinationPath '${this.snortPath}' -Force"`
            );
        } else {
            this.log('Precompiled Snort binary not found!', 'error');
            throw new Error('Snort binary not found. Please download Snort 3 for Windows.');
        }

        // Verify installation
        try {
            const { stdout } = await this.execCommand(`"${this.snortPath}\\bin\\snort.exe" --version`);
            this.log(`Snort installed: ${stdout.split('\n')[0]}`);
        } catch (error) {
            this.log('Snort verification failed', 'warn');
        }
    }

    /**
     * Setup PostgreSQL
     */
    async setupPostgreSQL(config) {
        this.log('Setting up PostgreSQL...');

        const dbPassword = this.generatePassword(16);

        // Start PostgreSQL service
        await this.execCommand('sc start postgresql-x64-15');
        await this.sleep(3000);

        // Create database and user
        const sqlScript = `
      CREATE DATABASE threatguard_db;
      CREATE USER threatguard_user WITH PASSWORD '${dbPassword}';
      GRANT ALL PRIVILEGES ON DATABASE threatguard_db TO threatguard_user;
      ALTER DATABASE threatguard_db OWNER TO threatguard_user;
    `;

        await fs.writeFile('C:\\temp_setup_db.sql', sqlScript);
        await this.execCommand(
            `"${this.postgresPath}\\bin\\psql.exe" -U postgres -f C:\\temp_setup_db.sql`
        );
        await fs.remove('C:\\temp_setup_db.sql');

        // Update .env file
        const envPath = `${this.installPath}\\.env`;
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
        await this.execCommand('sc start Redis');

        this.log('Redis configured');
    }

    /**
     * Configure Windows services
     */
    async configureServices(config) {
        this.log('Configuring Windows services...');

        const servicesScript = this.getResourcePath('services/windows/install-services.ps1');

        await this.execCommand(
            `powershell -ExecutionPolicy Bypass -File "${servicesScript}" -InstallPath "${this.installPath}"`
        );

        this.log('Services configured');
    }

    /**
     * Configure Snort
     */
    async configureSnort(config) {
        this.log('Configuring Snort...');

        const snortTemplate = this.getResourcePath('config/snort.lua.template');
        const snortConfig = `${this.snortPath}\\etc\\snort.lua`;

        await this.processTemplate(snortTemplate, snortConfig, {
            INTERFACE: config.networkInterface.index || '1'
        });

        // Copy rules
        const rulesPath = this.getResourcePath('config/local.rules');
        await this.copyFile(rulesPath, `${this.snortPath}\\rules\\local.rules`);

        this.log('Snort configured');
    }

    /**
     * Build frontend
     */
    async buildFrontend() {
        this.log('Building frontend...');

        const frontendPath = `${this.installPath}\\PAGINA WEB`;

        // Install dependencies
        await this.execCommand(`cd /d "${frontendPath}" && npm install`);

        // Build
        await this.execCommand(`cd /d "${frontendPath}" && npm run build`);

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
sys.path.append('${this.installPath.replace(/\\/g, '\\\\')}')

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

        await fs.writeFile('C:\\temp_create_admin.py', script);
        await this.execCommand(`"${this.installPath}\\venv\\Scripts\\python.exe" C:\\temp_create_admin.py`);
        await fs.remove('C:\\temp_create_admin.py');

        this.log('Admin user created');

        return { email, password };
    }

    /**
     * Start services
     */
    async startServices() {
        this.log('Starting services...');

        const services = [
            'ThreatGuardAPI',
            'ThreatGuardSnort',
            'ThreatGuardIntegration',
            'ThreatGuardFrontend'
        ];

        for (const service of services) {
            try {
                await this.execCommand(`sc start ${service}`);
                await this.sleep(2000); // Wait 2 seconds between services
                this.log(`Started service: ${service}`);
            } catch (error) {
                this.log(`Failed to start ${service}: ${error.message}`, 'warn');
            }
        }
    }

    /**
     * Configure Windows Firewall
     */
    async configureFirewall(config) {
        this.log('Configuring Windows Firewall...');

        const ports = [
            { name: 'ThreatGuard API', port: config.apiPort || 8000 },
            { name: 'ThreatGuard Frontend', port: config.frontendPort || 3000 }
        ];

        for (const { name, port } of ports) {
            try {
                await this.execCommand(
                    `netsh advfirewall firewall add rule name="${name}" dir=in action=allow protocol=TCP localport=${port}`
                );
                this.log(`Firewall rule added for ${name} (port ${port})`);
            } catch (error) {
                this.log(`Failed to add firewall rule for ${name}: ${error.message}`, 'warn');
            }
        }

        this.log('Firewall configured');
    }

    /**
     * Verify installation
     */
    async verifyInstallation() {
        this.log('Verifying installation...');

        // Check services
        const services = ['ThreatGuardAPI', 'ThreatGuardSnort', 'ThreatGuardIntegration', 'ThreatGuardFrontend'];

        for (const service of services) {
            try {
                const { stdout } = await this.execCommand(`sc query ${service}`);
                if (!stdout.includes('RUNNING')) {
                    this.log(`Service ${service} is not running`, 'warn');
                }
            } catch (error) {
                this.log(`Failed to check service ${service}: ${error.message}`, 'warn');
            }
        }

        // Check API health
        await this.sleep(5000); // Wait for API to start
        try {
            await this.execCommand('curl -f http://localhost:8000/health');
            this.log('API health check passed');
        } catch {
            this.log('API health check failed, but continuing...', 'warn');
        }

        this.log('Installation verified');
    }
}

module.exports = { WindowsInstaller };
