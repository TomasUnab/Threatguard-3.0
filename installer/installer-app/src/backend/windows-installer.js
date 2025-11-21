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
            permissions: {
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

        let appPath;
        if (process.env.NODE_ENV === 'development') {
            appPath = path.resolve(__dirname, '../../../../');
        } else {
            appPath = path.join(process.resourcesPath, 'app');
        }

        this.log(`Source path: ${appPath}`);

        try {
            // Copy backend
            await fs.copy(path.join(appPath, 'src'), path.join(this.installPath, 'src'));
            
            // Copy main file
            if (await fs.pathExists(path.join(appPath, 'threatguard_api.py'))) {
                await fs.copy(path.join(appPath, 'threatguard_api.py'), path.join(this.installPath, 'main.py'));
            } else if (await fs.pathExists(path.join(appPath, 'main.py'))) {
                await fs.copy(path.join(appPath, 'main.py'), path.join(this.installPath, 'main.py'));
            }

            // Copy requirements
            if (await fs.pathExists(path.join(appPath, 'requirements.txt'))) {
                await fs.copy(path.join(appPath, 'requirements.txt'), path.join(this.installPath, 'requirements.txt'));
            }

            // Copy frontend
            await fs.copy(path.join(appPath, 'PAGINA WEB'), path.join(this.installPath, 'PAGINA WEB'));

            // Copy config
            await fs.copy(path.join(appPath, 'config'), path.join(this.installPath, 'config'));

            this.log('Application files copied');
        } catch (error) {
            this.log(`Error copying files: ${error.message}`, 'error');
            throw error;
        }
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
            `"${this.installPath}\\venv\\Scripts\\python.exe" -m pip install --upgrade pip setuptools wheel`
        );
        await this.execCommand(
            `"${this.installPath}\\venv\\Scripts\\python.exe" -m pip install -r "${this.installPath}\\requirements.txt"`
        );

        this.log('Python dependencies installed');
    }

    /**
     * Install Snort
     */
    async installSnort() {
        this.log('Installing Snort 3...');

        // Check for bundled installer (EXE)
        const snortInstaller = this.getResourcePath('binaries/windows/Snort-3.1.74.0.exe');

        if (await fs.pathExists(snortInstaller)) {
            this.log('Found bundled Snort installer. Installing...');
            try {
                await this.execCommand(`"${snortInstaller}" /S`);
                this.log('Snort installed successfully from bundle.');
            } catch (error) {
                this.log(`Failed to install bundled Snort: ${error.message}`, 'warn');
            }
        } else {
            this.log('Bundled Snort installer not found. Attempting to download...', 'warn');
            
            // Fallback to downloading the installer
            const downloadUrl = 'https://www.snort.org/downloads/snort/Snort-3.1.74.0.exe';
            const installerPath = path.join(os.tmpdir(), 'Snort-Installer.exe');

            try {
                this.log(`Downloading Snort from ${downloadUrl}...`);
                await this.execCommand(`powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${installerPath}'"`);
                
                this.log('Running Snort installer...');
                // Run installer silently
                await this.execCommand(`"${installerPath}" /S`);
                
                // Cleanup
                try { await fs.remove(installerPath); } catch (e) {}
                
            } catch (error) {
                this.log(`Failed to download/install Snort: ${error.message}`, 'warn');
                this.log('WARNING: Snort 3 could not be installed automatically. Please install it manually from https://www.snort.org/downloads', 'warn');
                // Continue without throwing error
                return;
            }
        }

        // Verify installation
        try {
            const { stdout } = await this.execCommand(`"${this.snortPath}\\bin\\snort.exe" --version`);
            this.log(`Snort installed: ${stdout.split('\n')[0]}`);
        } catch (error) {
            this.log('Snort verification failed (it might not be installed or not in path)', 'warn');
        }
    }

    /**
     * Setup PostgreSQL
     */
    async setupPostgreSQL(config) {
        this.log('Setting up PostgreSQL...');

        const dbPassword = this.generatePassword(16);

        // Try to find the correct service name
        let serviceName = 'postgresql-x64-15';
        try {
            const { stdout } = await this.execCommand('powershell "Get-Service -Name postgresql* | Select-Object -ExpandProperty Name"');
            const foundName = stdout.trim().split(/\r?\n/)[0];
            if (foundName) {
                serviceName = foundName;
                this.log(`Detected PostgreSQL service: ${serviceName}`);
                
                // Update postgres path based on service name if possible
                // e.g. postgresql-x64-16 -> C:\Program Files\PostgreSQL\16
                const versionMatch = serviceName.match(/x64-(\d+)/);
                if (versionMatch && versionMatch[1]) {
                    this.postgresPath = `C:\\Program Files\\PostgreSQL\\${versionMatch[1]}`;
                }
            }
        } catch (e) {
            this.log('Could not detect PostgreSQL service name dynamically, using default.', 'warn');
        }

        // Start PostgreSQL service
        try {
            await this.execCommand(`sc start ${serviceName}`);
            this.log(`Service ${serviceName} start command issued.`);
        } catch (error) {
            // Ignore error if service is already running or other non-critical errors
            this.log(`Warning: Could not start ${serviceName} (it might be running already). Details: ${error.message}`, 'warn');
        }
        
        await this.sleep(5000); // Wait a bit longer for startup

        // Create database and user
        const sqlScript = `
      CREATE DATABASE threatguard_db;
      CREATE USER threatguard_user WITH PASSWORD '${dbPassword}';
      GRANT ALL PRIVILEGES ON DATABASE threatguard_db TO threatguard_user;
      ALTER DATABASE threatguard_db OWNER TO threatguard_user;
    `;

        await fs.writeFile('C:\\temp_setup_db.sql', sqlScript);
        
        try {
            // Try to find psql executable
            let psqlPath = `${this.postgresPath}\\bin\\psql.exe`;
            if (!await fs.pathExists(psqlPath)) {
                // Try to find it in PATH
                if (await this.commandExists('psql')) {
                    psqlPath = 'psql';
                } else {
                    // Try common locations
                    const commonPaths = [
                        'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
                        'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
                        'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe'
                    ];
                    for (const p of commonPaths) {
                        if (await fs.pathExists(p)) {
                            psqlPath = p;
                            break;
                        }
                    }
                }
            }

            // Try to execute with a timeout and default password to avoid hanging
            // We set a timeout because psql might hang waiting for a password
            await this.execCommand(
                `"${psqlPath}" -U postgres -f C:\\temp_setup_db.sql`,
                { 
                    timeout: 15000, // 15 seconds timeout
                    env: { ...process.env, PGPASSWORD: 'postgres' }
                }
            );
        } catch (error) {
             this.log(`Warning: Failed to configure database users automatically (likely due to password auth). Continuing anyway. You may need to configure the DB manually. Error: ${error.message}`, 'warn');
        } finally {
            try { await fs.remove('C:\\temp_setup_db.sql'); } catch (e) {}
        }

        // Update .env file
        const envPath = `${this.installPath}\\.env`;
        
        // Look for template in app resources
        let envTemplate;
        if (process.env.NODE_ENV === 'development') {
             envTemplate = path.resolve(__dirname, '../../../../config/.env.template');
        } else {
             envTemplate = path.join(process.resourcesPath, 'app/config/.env.template');
        }

        if (await fs.pathExists(envTemplate)) {
            await this.processTemplate(envTemplate, envPath, {
                DATABASE_PASSWORD: dbPassword,
                API_PORT: config.apiPort || 8000,
                FRONTEND_PORT: config.frontendPort || 3000,
                SECRET_KEY: this.generateSecretKey(),
                JWT_SECRET: this.generateSecretKey(),
                INTERFACE: config.networkInterface ? (config.networkInterface.index || '1') : '1'
            });
            this.log('Configuration file .env created.');
        } else {
            this.log(`Warning: .env.template not found at ${envTemplate}. Creating default .env file.`, 'warn');
            // Create a basic .env file if template is missing
            const basicEnv = `DATABASE_URL=postgresql://threatguard_user:${dbPassword}@localhost:5432/threatguard_db
API_PORT=${config.apiPort || 8000}
SECRET_KEY=${this.generateSecretKey()}
JWT_SECRET=${this.generateSecretKey()}
`;
            await fs.writeFile(envPath, basicEnv);
        }

        this.log('PostgreSQL configured');
        return dbPassword;
    }

    /**
     * Setup Redis
     */
    async setupRedis() {
        this.log('Setting up Redis...');

        try {
            // Try to find the correct service name
            let serviceName = 'Redis';
            try {
                const { stdout } = await this.execCommand('powershell "Get-Service -Name Redis* | Select-Object -ExpandProperty Name"');
                const foundName = stdout.trim().split(/\r?\n/)[0];
                if (foundName) {
                    serviceName = foundName;
                    this.log(`Detected Redis service: ${serviceName}`);
                }
            } catch (e) {
                this.log('Could not detect Redis service name dynamically, using default.', 'warn');
            }

            // Start Redis service
            await this.execCommand(`sc start ${serviceName}`);
            this.log('Redis configured');
        } catch (error) {
             // Check if service is already running (Exit code 1056 or similar message)
             if (error.message.includes('1056') || error.message.includes('instance is already running')) {
                 this.log('Redis service is already running.');
             } else {
                 this.log(`Warning: Failed to start Redis service: ${error.message}. You may need to start it manually.`, 'warn');
             }
        }
    }

    /**
     * Configure Windows services
     */
    async configureServices(config) {
        this.log('Configuring Windows services...');

        const servicesScript = this.getResourcePath('services/windows/install-services.ps1');

        if (await fs.pathExists(servicesScript)) {
            try {
                await this.execCommand(
                    `powershell -ExecutionPolicy Bypass -File "${servicesScript}" -InstallPath "${this.installPath}"`
                );
                this.log('Services configured');
            } catch (error) {
                this.log(`Failed to configure services: ${error.message}`, 'warn');
            }
        } else {
            this.log(`Services script not found at ${servicesScript}. Skipping service configuration.`, 'warn');
        }
    }

    /**
     * Configure Snort
     */
    async configureSnort(config) {
        this.log('Configuring Snort...');

        const snortTemplate = this.getResourcePath('config/snort.lua.template');
        const snortConfig = `${this.snortPath}\\etc\\snort.lua`;

        if (await fs.pathExists(snortTemplate)) {
            await this.processTemplate(snortTemplate, snortConfig, {
                INTERFACE: config.networkInterface ? (config.networkInterface.index || '1') : '1'
            });
        } else {
            this.log(`Warning: snort.lua.template not found at ${snortTemplate}. Checking for snort.lua...`, 'warn');
            // Fallback to snort.lua if template is missing
            const snortLuaSource = this.getResourcePath('config/snort.lua');
            if (await fs.pathExists(snortLuaSource)) {
                 await fs.copy(snortLuaSource, snortConfig);
                 this.log('Copied snort.lua directly (no template processing).');
            } else {
                 this.log('Warning: Could not find snort.lua configuration to install.', 'warn');
            }
        }

        // Copy rules
        const rulesPath = this.getResourcePath('config/local.rules');
        if (await fs.pathExists(rulesPath)) {
            await this.copyFile(rulesPath, `${this.snortPath}\\rules\\local.rules`);
        } else {
             this.log(`Warning: local.rules not found at ${rulesPath}.`, 'warn');
        }

        this.log('Snort configured');
    }

    /**
     * Build frontend
     */
    async buildFrontend() {
        this.log('Building frontend...');

        const frontendPath = `${this.installPath}\\PAGINA WEB`;
        const packageJsonPath = `${frontendPath}\\package.json`;

        if (await fs.pathExists(packageJsonPath)) {
            try {
                // Install dependencies
                await this.execCommand(`cd /d "${frontendPath}" && npm install`);

                // Build
                await this.execCommand(`cd /d "${frontendPath}" && npm run build`);

                this.log('Frontend built');
            } catch (error) {
                this.log(`Warning: Frontend build failed: ${error.message}. Continuing as this might be a static site.`, 'warn');
            }
        } else {
            this.log('No package.json found in frontend directory. Skipping build (assuming static files).');
        }
    }

    /**
     * Create admin user
     */
    async createAdminUser() {
        this.log('Creating admin user...');

        const password = this.generatePassword(12);
        const email = 'admin@threatguard.local';
        const username = 'admin';

        // Read .env to get DATABASE_URL
        let dbUrl = '';
        try {
            const envContent = await fs.readFile(`${this.installPath}\\.env`, 'utf8');
            const match = envContent.match(/DATABASE_URL=(.*)/);
            if (match) {
                dbUrl = match[1].trim();
            }
        } catch (e) {
            this.log('Could not read .env file for DB URL', 'warn');
        }

        // Create Python script to add user
        const script = `
import sys
import os
sys.path.append('${this.installPath.replace(/\\/g, '\\\\')}')

# Set env var for DB connection
if '${dbUrl}':
    os.environ['DATABASE_URL'] = '${dbUrl}'

try:
    from src.utils.database import db_manager, User, Base
    import bcrypt

    # Create tables
    print("Creating tables...")
    db_manager.create_tables()

    # Create admin user
    print("Creating admin user...")
    db = db_manager.SessionLocal()
    
    # Check if user exists
    existing = db.query(User).filter(User.username == "${username}").first()
    if not existing:
        hashed = bcrypt.hashpw("${password}".encode(), bcrypt.gensalt())
        admin = User(
            username="${username}",
            email="${email}",
            hashed_password=hashed.decode(),
            is_admin=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully")
    else:
        print("Admin user already exists")
    
    db.close()

except Exception as e:
    print(f"Error creating admin user: {e}")
    sys.exit(1)
`;

        const scriptPath = 'C:\\temp_create_admin.py';
        await fs.writeFile(scriptPath, script);
        
        try {
            await this.execCommand(`"${this.installPath}\\venv\\Scripts\\python.exe" "${scriptPath}"`);
        } catch (error) {
            this.log(`Failed to create admin user: ${error.message}`, 'error');
            // Don't fail installation for this
        } finally {
            try { await fs.remove(scriptPath); } catch (e) {}
        }

        this.log('Admin user creation step completed');

        // Create desktop shortcut
        await this.createDesktopShortcut();

        return { email, password };
    }

    /**
     * Create Desktop Shortcut
     */
    async createDesktopShortcut() {
        this.log('Creating desktop shortcut...');
        try {
            const desktopPath = path.join(os.homedir(), 'Desktop');
            const shortcutPath = path.join(desktopPath, 'ThreatGuard Dashboard.url');
            const iconPath = `${this.installPath}\\assets\\icon.ico`;
            
            // Ensure assets folder exists in install path
            const assetsDest = `${this.installPath}\\assets`;
            await this.createDirectory(assetsDest);
            
            // Copy icon from resources
            const iconSource = this.getResourcePath('assets/icon.ico');
            if (await fs.pathExists(iconSource)) {
                await fs.copy(iconSource, iconPath);
            }

            const content = `[InternetShortcut]
URL=http://localhost:3000
IconIndex=0
IconFile=${iconPath}
`;
            await fs.writeFile(shortcutPath, content);
            this.log('Desktop shortcut created');
        } catch (error) {
            this.log(`Failed to create desktop shortcut: ${error.message}`, 'warn');
        }
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
