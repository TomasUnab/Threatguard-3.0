const { InstallerCommon } = require('./common');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const net = require('net');

class WindowsInstaller extends InstallerCommon {
    constructor() {
        super();
        // In production (NSIS), installPath is where the executable is located.
        // In development, use a fixed path.
        if (process.env.NODE_ENV === 'development') {
             this.installPath = 'C:\\ThreatGuard_Dev';
        } else {
             // process.execPath is .../ThreatGuard Installer.exe
             this.installPath = path.dirname(process.execPath);
        }

        this.snortPath = 'C:\\Snort';
        this.postgresPath = 'C:\\Program Files\\PostgreSQL\\15';
        this.redisPath = 'C:\\Redis';
    }

    /**
     * Check if a port is free
     */
    checkPort(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false)); // Port in use
            server.once('listening', () => {
                server.close();
                resolve(true); // Port free
            });
            server.listen(port);
        });
    }

    /**
     * Get installation path
     */
    getInstallPath() {
        return this.installPath;
    }

    /**
     * Check system requirements
     */
    async checkRequirements(config) {
        this.log('Checking system requirements...');

        // Check Database (verify Windows service, not just client command)
        const dbType = config && config.dbType ? config.dbType : 'postgresql';
        let dbValid = false;
        let dbValue = 'Not installed';
        let dbRequired = '';

        if (dbType === 'postgresql') {
            dbRequired = 'PostgreSQL 13+';
            try {
                // Check for PostgreSQL service
                const { stdout } = await this.execCommand('powershell "Get-Service | Where-Object {$_.Name -like \'*postgresql*\'} | Select-Object -First 1 Name,Status"');
                if (stdout && stdout.includes('postgresql')) {
                    // Service exists, get version
                    try {
                        const { stdout: version } = await this.execCommand('psql --version');
                        dbValue = version.trim() + ' (Service detected)';
                        dbValid = true;
                    } catch {
                        dbValue = 'PostgreSQL service found, version unknown';
                        dbValid = true;
                    }
                } else {
                    dbValue = 'Not installed (Will be installed automatically)';
                }
            } catch {
                dbValue = 'Not installed (Will be installed automatically)';
            }
        } else if (dbType === 'mysql') {
            dbRequired = 'MySQL 8.0+';
            try {
                // Check for MySQL service
                const { stdout } = await this.execCommand('powershell "Get-Service | Where-Object {$_.Name -like \'*mysql*\'} | Select-Object -First 1 Name,Status"');
                if (stdout && stdout.includes('mysql')) {
                    // Service exists, get version
                    try {
                        const { stdout: version } = await this.execCommand('mysql --version');
                        dbValue = version.trim() + ' (Service detected)';
                        dbValid = true;
                    } catch {
                        dbValue = 'MySQL service found, version unknown';
                        dbValid = true;
                    }
                } else {
                    dbValue = 'Not installed (Will be installed automatically)';
                }
            } catch {
                dbValue = 'Not installed (Will be installed automatically)';
            }
        }

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
            ports: {
                valid: (await this.checkPort(3000)) && (await this.checkPort(8000)),
                value: `3000: ${await this.checkPort(3000) ? 'Free' : 'Busy'}, 8000: ${await this.checkPort(8000) ? 'Free' : 'Busy'}`,
                required: 'Ports 3000 & 8000 free'
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
            },
            db: {
                valid: dbValid,
                value: dbValue,
                required: dbRequired
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
            await this.installSystemDependencies(config);

            // Step 3: Create directories (25%)
            progressCallback({
                step: 'directories',
                progress: 25,
                message: 'Creating directories...'
            });
            await this.createDirectories(config.installPath);

            // Step 4: Copy application files (35%)
            progressCallback({
                step: 'files',
                progress: 35,
                message: 'Copying application files...'
            });
            await this.copyApplicationFiles(config.installPath);

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

            // Step 7: Setup Database (65%)
            progressCallback({
                step: 'database',
                progress: 65,
                message: `Configuring ${config.dbType === 'mysql' ? 'MySQL' : 'PostgreSQL'} database...`
            });
            
            if (config.dbType === 'mysql') {
                await this.setupMySQL(config);
            } else {
                await this.setupPostgreSQL(config);
            }

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
    async installSystemDependencies(config) {
        this.log('Installing system dependencies...');

        const packages = [
            'python --version=3.11',
            'nodejs --version=20.10.0',
            'redis-64',
            'git',
            'nssm'
        ];

        // Add database package based on selection
        if (config && config.dbType === 'mysql') {
            packages.push('mysql');
        } else {
            packages.push('postgresql15');
        }

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
     * Create directories based on the selected installation path
     */
    async createDirectories(installPath) {
        this.log(`Creating directories in ${installPath}...`);

        // Ensure the base directory exists
        if (!fs.existsSync(installPath)) {
            fs.mkdirSync(installPath, { recursive: true });
        }

        // Create subdirectories
        const subdirs = ['logs', 'config', 'data'];
        for (const subdir of subdirs) {
            const fullPath = path.join(installPath, subdir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath);
            }
        }

        this.log('Directories created successfully.');
    }

    /**
     * Copy application files to the selected installation path
     */
    async copyApplicationFiles(installPath) {
        this.log(`Copying application files to ${installPath}...`);

        const sourcePath = path.join(__dirname, '../../assets');
        const destinationPath = path.join(installPath, 'app');

        // Copy files
        fs.copySync(sourcePath, destinationPath);

        this.log('Application files copied successfully.');
    }

    /**
     * Install Python dependencies
     */
    async installPythonDependencies() {
        this.log('Installing Python dependencies...');

        // Create virtual environment without pip initially (faster, more reliable)
        try {
            await this.execCommand(`python -m venv "${this.installPath}\\venv" --without-pip`);
        } catch (error) {
            // Fallback: try with pip
            this.log('Retrying venv creation with pip...', 'warn');
            await this.execCommand(`python -m venv "${this.installPath}\\venv"`);
        }

        // Wait for venv to fully initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Download and install pip manually using get-pip.py
        const getPipPath = path.join(os.tmpdir(), 'get-pip.py');
        try {
            await this.execCommand(`powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '${getPipPath}'"`);
            await this.execCommand(`"${this.installPath}\\venv\\Scripts\\python.exe" "${getPipPath}"`);
            await fs.remove(getPipPath);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            this.log('Pip installation via get-pip.py failed, continuing...', 'warn');
        }

        const pythonExe = `"${this.installPath}\\venv\\Scripts\\python.exe"`;
        
        // Create a batch file to install dependencies
        const batchScript = `
@echo off
cd /d "${this.installPath}"
echo Installing pymysql and cryptography...
"${this.installPath}\\venv\\Scripts\\python.exe" -m pip install pymysql cryptography --no-warn-script-location
timeout /t 2 /nobreak > nul
echo Installing requirements...
if exist "${this.installPath}\\requirements.txt" (
    "${this.installPath}\\venv\\Scripts\\python.exe" -m pip install -r "${this.installPath}\\requirements.txt" --no-warn-script-location
)
`;

        const batchFile = path.join(os.tmpdir(), 'install_deps.bat');
        await fs.writeFile(batchFile, batchScript);

        try {
            await this.execCommand(`cmd /c "${batchFile}"`);
            await fs.remove(batchFile);
        } catch (error) {
            this.log(`Warning installing some dependencies: ${error.message}`, 'warn');
        }

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
     * Setup MySQL
     */
    async setupMySQL(config) {
        this.log('Setting up MySQL...');

        // Install MySQL if not present
        if (!await this.commandExists('mysql')) {
            this.log('Installing MySQL Server...');
            try {
                await this.execCommand('choco install mysql -y');
                await this.execCommand('refreshenv');
            } catch (error) {
                this.log(`Failed to install MySQL: ${error.message}`, 'warn');
            }
        }

        const dbPassword = this.generatePassword(16);
        const dbPort = config.dbPort || 3306;

        // Create database and user
        const sqlScript = `
      CREATE DATABASE IF NOT EXISTS threatguard_db;
      CREATE USER IF NOT EXISTS 'threatguard_user'@'localhost' IDENTIFIED BY '${dbPassword}';
      ALTER USER 'threatguard_user'@'localhost' IDENTIFIED BY '${dbPassword}';
      GRANT ALL PRIVILEGES ON threatguard_db.* TO 'threatguard_user'@'localhost';
      FLUSH PRIVILEGES;
    `;

        await fs.writeFile('C:\\temp_setup_mysql.sql', sqlScript);
        
        try {
            // Try to execute with mysql client
            // Assuming root has no password or we can access it. 
            // In a real scenario, we might need to ask for root password if it's already installed.
            // For fresh choco install, it usually has empty root password or logs it.
            
            let mysqlCmd = `mysql -u root`;
            if (config.dbAdminPassword) {
                mysqlCmd += ` -p"${config.dbAdminPassword}"`;
            }
            mysqlCmd += ` -e "source C:\\temp_setup_mysql.sql"`;

            await this.execCommand(
                mysqlCmd,
                { timeout: 15000 }
            );
        } catch (error) {
             this.log(`Warning: Failed to configure MySQL users automatically. You may need to configure the DB manually. Error: ${error.message}`, 'warn');
        } finally {
            try { await fs.remove('C:\\temp_setup_mysql.sql'); } catch (e) {}
        }

        // Update .env file
        const envPath = `${this.installPath}\\.env`;
        
        // Create .env content for MySQL
        // SQLAlchemy format: mysql+pymysql://user:password@host:port/dbname
        const envContent = `DATABASE_URL=mysql+pymysql://threatguard_user:${dbPassword}@localhost:${dbPort}/threatguard_db
API_PORT=${config.apiPort || 8000}
SECRET_KEY=${this.generateSecretKey()}
JWT_SECRET=${this.generateSecretKey()}
INTERFACE=${config.networkInterface ? (config.networkInterface.index || '1') : '1'}
`;
        
        // We overwrite .env or append if not exists. 
        // Since we are in setup, we can probably just write it.
        // But let's respect the template logic if we can, but template is PG specific usually.
        // So we just write the file here for MySQL case.
        await fs.writeFile(envPath, envContent);

        this.log('MySQL configured');
        return dbPassword;
    }

    /**
     * Setup PostgreSQL
     */
    async setupPostgreSQL(config) {
        this.log('Setting up PostgreSQL...');

        // Install PostgreSQL if not present
        if (!await this.commandExists('psql')) {
            this.log('Installing PostgreSQL 15...');
            try {
                await this.execCommand('choco install postgresql15 -y');
                await this.execCommand('refreshenv');
            } catch (error) {
                this.log(`Failed to install PostgreSQL: ${error.message}`, 'warn');
            }
        }

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

        // Create database and user (Robust Script)
        const sqlScript = `
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'threatguard_user') THEN
      CREATE USER threatguard_user WITH PASSWORD '${dbPassword}';
   ELSE
      ALTER USER threatguard_user WITH PASSWORD '${dbPassword}';
   END IF;
END
$do$;

SELECT 'CREATE DATABASE threatguard_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'threatguard_db')\\gexec

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
            const pgPassword = config.dbAdminPassword || 'postgres';
            
            await this.execCommand(
                `"${psqlPath}" -U postgres -f C:\\temp_setup_db.sql`,
                { 
                    timeout: 15000, // 15 seconds timeout
                    env: { ...process.env, PGPASSWORD: pgPassword }
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
                API_PORT: config.apiPort || 9000,
                FRONTEND_PORT: config.frontendPort || 3000,
                SECRET_KEY: this.generateSecretKey(),
                JWT_SECRET: this.generateSecretKey(),
                INTERFACE: config.networkInterface ? (config.networkInterface.index || '1') : '1'
            });
            this.log('Configuration file .env created.');
        } else {
            this.log(`Warning: .env.template not found at ${envTemplate}. Creating default .env file.`, 'warn');
            // Create a basic .env file if template is missing
            const basicEnv = `DATABASE_URL=postgresql://threatguard_user:${dbPassword}@127.0.0.1:5432/threatguard_db
API_HOST=127.0.0.1
API_PORT=${config.apiPort || 9000}
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
        db.add(admin);
        db.commit();
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
