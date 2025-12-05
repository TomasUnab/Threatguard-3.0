const { InstallerCommon } = require('./common');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const net = require('net');

class WindowsInstaller extends InstallerCommon {
    /**
     * Register ThreatGuard parent service (Windows)
     */
    async registerThreatGuardService() {
        this.log('Registering ThreatGuard parent service...');
        // Ruta al ejecutable Node.js y script de bandeja
        const nodeExe = process.execPath;
        const controlScript = path.join(__dirname, 'threatguard-control.js');
        // Crear el servicio con NSSM (recomendado) o sc.exe
        // NSSM: nssm install ThreatGuard "C:\path\to\node.exe" "C:\path\to\threatguard-tray.js"
        // Si NSSM no está disponible, usar sc.exe para crear un servicio que ejecute Node.js
        try {
            await this.execCommand(`nssm install ThreatGuard "${nodeExe}" "${controlScript}"`);
            await this.execCommand('nssm set ThreatGuard Start SERVICE_AUTO_START');
            this.log('ThreatGuard service registered with NSSM.');
        } catch (error) {
            this.log('NSSM not found, falling back to sc.exe', 'warn');
            // sc.exe create ThreatGuard binPath= "C:\path\to\node.exe C:\path\to\threatguard-tray.js" start= auto
            try {
                await this.execCommand(`sc create ThreatGuard binPath= "${nodeExe} ${controlScript}" start= auto`);
                this.log('ThreatGuard service registered with sc.exe.');
            } catch (err) {
                this.log(`Failed to register ThreatGuard service: ${err.message}`, 'error');
            }
        }
    }
    constructor() {
        super();
        // In production (NSIS), installPath is where the executable is located.
        // In development, use a fixed path.
        if (process.env.NODE_ENV === 'development') {
            // In development use a directory inside the user's profile to avoid permission issues
            this.installPath = path.join(os.homedir(), 'ThreatGuard_Dev');
        } else {
            // process.execPath is .../ThreatGuard Installer.exe
            this.installPath = path.dirname(process.execPath);
        }

        this.snortPath = 'C:\\Snort';
        this.postgresPath = 'C:\\Program Files\\PostgreSQL\\15';
        this.redisPath = 'C:\\Redis';
        // Cancellation flag for in-progress installation
        this._cancelRequested = false;
    }

    /**
     * Best-effort cancel/rollback of an in-progress installation.
     * Stops known services, attempts to uninstall packages installed by choco,
     * and removes the installation directory. Returns an object with results.
     */
    async cancelInstall(progressCallback) {
        this.log('Cancel requested: attempting rollback (best-effort)...');
        this._cancelRequested = true;

        const results = { stoppedServices: [], removedServices: [], removedPaths: [], chocoUninstalled: [], errors: [] };

        // Prepare a logfile in the system temp directory
        const logPath = path.join(os.tmpdir(), 'threatguard_cancel.log');
        const writeLog = async (msg) => {
            try {
                await fs.appendFile(logPath, `${new Date().toISOString()} - ${msg}\n`);
            } catch (e) {
                // ignore logging errors
            }
        };

        // Helper to emit progress to callback and also write to log
        const emit = (p) => {
            try {
                if (progressCallback) progressCallback(p);
            } catch (e) { }
            try {
                if (p && p.message) writeLog(`${p.step || 'info'} - ${p.message}`);
            } catch (e) { }
        };

        try {
            // Attempt to stop known ThreatGuard services
            const services = ['ThreatGuardAPI', 'ThreatGuardSnort', 'ThreatGuardIntegration', 'ThreatGuardFrontend', 'ThreatGuard'];
            for (const s of services) {
                try {
                    progressCallback && progressCallback({ step: 'stop-service', message: `Stopping service ${s}...` });
                    await this.execCommand(`sc stop ${s}`);
                    results.stoppedServices.push(s);
                    progressCallback && progressCallback({ step: 'stop-service', message: `Stopped ${s}` });
                } catch (err) {
                    // Continue even if stop fails
                    results.errors.push(`stop ${s}: ${err.message}`);
                    progressCallback && progressCallback({ step: 'stop-service', message: `Failed to stop ${s}: ${err.message}` });
                }
            }

            // Attempt to remove services created via nssm / sc
            try {
                progressCallback && progressCallback({ step: 'remove-service', message: 'Removing ThreatGuard service (nssm/sc)...' });
                await this.execCommand('nssm remove ThreatGuard confirm');
                results.removedServices.push('ThreatGuard (nssm)');
                progressCallback && progressCallback({ step: 'remove-service', message: 'Removed ThreatGuard via nssm' });
            } catch (err) {
                // Ignore if nssm not present or removal fails
                try {
                    await this.execCommand('sc delete ThreatGuard');
                    results.removedServices.push('ThreatGuard (sc)');
                    progressCallback && progressCallback({ step: 'remove-service', message: 'Removed ThreatGuard via sc' });
                } catch (e) {
                    results.errors.push(`remove ThreatGuard: ${e.message}`);
                    progressCallback && progressCallback({ step: 'remove-service', message: `Failed to remove service: ${e.message}` });
                }
            }

            // Attempt to uninstall database packages if choco exists
            if (await this.commandExists('choco')) {
                try {
                    progressCallback && progressCallback({ step: 'choco-uninstall', message: 'Attempting to uninstall database components via Chocolatey...' });
                    // If psql exists, try uninstalling postgresql15
                    if (await this.commandExists('psql')) {
                        try { await this.execCommand('choco uninstall postgresql15 -y'); results.chocoUninstalled.push('postgresql15'); progressCallback && progressCallback({ step: 'choco-uninstall', message: 'Uninstalled postgresql15' }); } catch (e) { results.errors.push(`choco uninstall postgresql15: ${e.message}`); progressCallback && progressCallback({ step: 'choco-uninstall', message: `Failed uninstall postgresql15: ${e.message}` }); }
                    }
                    if (await this.commandExists('mysql')) {
                        try { await this.execCommand('choco uninstall mysql -y'); results.chocoUninstalled.push('mysql'); progressCallback && progressCallback({ step: 'choco-uninstall', message: 'Uninstalled mysql' }); } catch (e) { results.errors.push(`choco uninstall mysql: ${e.message}`); progressCallback && progressCallback({ step: 'choco-uninstall', message: `Failed uninstall mysql: ${e.message}` }); }
                    }
                    // Redis
                    if (await this.commandExists('redis-server') || await this.commandExists('redis-cli')) {
                        try { await this.execCommand('choco uninstall redis-64 -y'); results.chocoUninstalled.push('redis-64'); progressCallback && progressCallback({ step: 'choco-uninstall', message: 'Uninstalled redis-64' }); } catch (e) { results.errors.push(`choco uninstall redis-64: ${e.message}`); progressCallback && progressCallback({ step: 'choco-uninstall', message: `Failed uninstall redis-64: ${e.message}` }); }
                    }
                } catch (err) {
                    results.errors.push(`choco uninstall sequence failed: ${err.message}`);
                    progressCallback && progressCallback({ step: 'choco-uninstall', message: `Chocolatey uninstall sequence failed: ${err.message}` });
                }
            } else {
                progressCallback && progressCallback({ step: 'choco-uninstall', message: 'Chocolatey not found; skipping package uninstall.' });
            }

            // Remove installation directory (best-effort) — safety: don't remove root paths
            try {
                progressCallback && progressCallback({ step: 'remove-path', message: `Removing installation directory ${this.installPath}...` });
                if (this.installPath && this.installPath.length > 3 && this.installPath !== 'C:') {
                    await fs.remove(this.installPath);
                    results.removedPaths.push(this.installPath);
                    progressCallback && progressCallback({ step: 'remove-path', message: `Removed ${this.installPath}` });
                } else {
                    results.errors.push(`Refusing to remove unsafe installPath: ${this.installPath}`);
                    progressCallback && progressCallback({ step: 'remove-path', message: `Refusing to remove unsafe installPath: ${this.installPath}` });
                }
            } catch (err) {
                results.errors.push(`remove installPath: ${err.message}`);
                progressCallback && progressCallback({ step: 'remove-path', message: `Failed to remove installPath: ${err.message}` });
            }

            // Remove desktop shortcut (both .lnk and .url)
            try {
                const shortcuts = [
                    path.join(os.homedir(), 'Desktop', 'ThreatGuard Dashboard.url'),
                    path.join(os.homedir(), 'Desktop', 'ThreatGuard.lnk')
                ];
                progressCallback && progressCallback({ step: 'remove-shortcut', message: `Removing desktop shortcuts if present...` });
                for (const shortcut of shortcuts) {
                    if (await fs.pathExists(shortcut)) {
                        await fs.remove(shortcut);
                        results.removedPaths.push(shortcut);
                        progressCallback && progressCallback({ step: 'remove-shortcut', message: `Removed desktop shortcut: ${path.basename(shortcut)}` });
                    }
                }
            } catch (err) {
                results.errors.push(`remove shortcut: ${err.message}`);
                progressCallback && progressCallback({ step: 'remove-shortcut', message: `Failed to remove shortcut: ${err.message}` });
            }
            // Attempt to remove installed marker if present
            try {
                const markerPath = path.join(this.installPath, '.threatguard_installed');
                if (await fs.pathExists(markerPath)) {
                    await fs.remove(markerPath);
                    results.removedPaths.push(markerPath);
                    progressCallback && progressCallback({ step: 'remove-marker', message: `Removed installed marker ${markerPath}` });
                }
            } catch (e) {
                results.errors.push(`remove marker: ${e.message}`);
                progressCallback && progressCallback({ step: 'remove-marker', message: `Failed to remove installed marker: ${e.message}` });
            }

            this.log('Rollback attempts completed', 'warn');
            progressCallback && progressCallback({ step: 'complete', message: 'Rollback attempts completed' });
            return results;
        } catch (error) {
            this.log(`Cancel/rollback encountered error: ${error.message}`, 'error');
            results.errors.push(error.message);
            progressCallback && progressCallback({ step: 'error', message: `Rollback encountered error: ${error.message}` });
            return results;
        }
    }

    /**
     * Ensure Chocolatey is installed on the system.
     * Installs Chocolatey using the official install script when missing.
     */
    async ensureChocolatey() {
        if (await this.commandExists('choco')) {
            this.log('Chocolatey already installed.');
            return true;
        }

        this.log('Chocolatey not found. Installing Chocolatey...');
        try {
            // Use the official installation script via PowerShell
            const installCmd = `powershell -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"`;
            await this.execCommand(installCmd);
            // refreshenv may not be available immediately; attempt to refresh environment
            try { await this.execCommand('refreshenv'); } catch { }
            this.log('Chocolatey installed.');
            return true;
        } catch (error) {
            this.log(`Failed to install Chocolatey: ${error.message}`, 'error');
            return false;
        }
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
     * Get process using a specific port (Windows only)
     */
    async getPortProcess(port) {
        try {
            const { stdout } = await this.execCommand(`netstat -ano | findstr :${port}`);
            if (stdout) {
                // Parse netstat output to get PID
                const lines = stdout.trim().split('\n');
                for (const line of lines) {
                    if (line.includes('LISTENING')) {
                        const parts = line.trim().split(/\s+/);
                        const pid = parts[parts.length - 1];
                        if (pid && pid !== '0') {
                            // Get process name from PID
                            try {
                                const { stdout: processInfo } = await this.execCommand(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
                                if (processInfo) {
                                    const processName = processInfo.split(',')[0].replace(/"/g, '');
                                    return `${processName} (PID: ${pid})`;
                                }
                            } catch {
                                return `PID: ${pid}`;
                            }
                        }
                    }
                }
            }
            return 'Desconocido';
        } catch {
            return 'No disponible';
        }
    }

    /**
     * Get status for multiple ports with process information
     */
    async getPortsStatus(ports) {
        const statuses = [];
        const portNames = {
            3000: 'Frontend',
            9000: 'API',
            5432: 'PostgreSQL',
            3306: 'MySQL'
        };

        for (const port of ports) {
            const isFree = await this.checkPort(port);
            const portName = portNames[port] || port.toString();

            if (isFree) {
                statuses.push(`${portName} (${port}): Libre ✓`);
            } else {
                const process = await this.getPortProcess(port);
                statuses.push(`${portName} (${port}): Ocupado por ${process}`);
            }
        }

        return statuses.join(' | ');
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

        const dbType = config && config.dbType ? config.dbType : 'postgresql';
        let dbValid = false;
        let dbValue = 'Not installed';
        let dbRequired = '';

        if (dbType === 'postgresql') {
            dbRequired = 'PostgreSQL 13+';
            try {
                const { stdout } = await this.execCommand('powershell "Get-Service | Where-Object {$_.Name -like \"*postgresql*\"} | Select-Object -First 1 Name,Status"');
                if (stdout && stdout.toLowerCase().includes('postgresql')) {
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
                const { stdout } = await this.execCommand('powershell "Get-Service | Where-Object {$_.Name -like \"*mysql*\"} | Select-Object -First 1 Name,Status"');
                if (stdout && stdout.toLowerCase().includes('mysql')) {
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
                valid: (await this.checkPort(3000)) && (await this.checkPort(9000)),
                value: await this.getPortsStatus([3000, 9000]),
                required: 'Puertos 3000 y 9000 libres'
            },
            dbPorts: {
                valid: (await this.checkPort(5432)) && (await this.checkPort(3306)),
                value: await this.getPortsStatus([5432, 3306]),
                required: 'Puertos de base de datos disponibles'
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

        // Update install path from config (user selection)
        if (config.installPath) {
            this.installPath = config.installPath;
            this.log(`Target installation path set to: ${this.installPath}`);
        }

        const startTime = Date.now();

        try {
            // Step 1: Install Chocolatey (5%)
            progressCallback({
                step: 'chocolatey',
                progress: 5,
                message: 'Installing Chocolatey package manager...'
            });
            await this.installChocolatey();
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 2: Install system dependencies (15%)
            progressCallback({
                step: 'dependencies',
                progress: 15,
                message: 'Installing system dependencies...'
            });
            await this.installSystemDependencies(config);
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 3: Create directories (25%)
            progressCallback({
                step: 'directories',
                progress: 25,
                message: 'Creating directories...'
            });
            await this.createDirectories(config.installPath);
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 4: Copy application files (35%)
            progressCallback({
                step: 'files',
                progress: 35,
                message: 'Copying web application files...'
            });
            await this.copyApplicationFiles(config.installPath);
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 5: Install Python dependencies (45%)
            progressCallback({
                step: 'python',
                progress: 45,
                message: 'Installing Python dependencies...'
            });
            await this.installPythonDependencies();
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 6: Install Snort (55%)
            progressCallback({
                step: 'snort',
                progress: 55,
                message: 'Installing Snort 3...'
            });
            await this.installSnort();
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

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
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 8: Setup Redis (70%)
            progressCallback({
                step: 'redis',
                progress: 70,
                message: 'Configuring Redis...'
            });
            await this.setupRedis();
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 9: Register ThreatGuard parent service (tray + control)
            progressCallback({
                step: 'services',
                progress: 80,
                message: 'Registering ThreatGuard parent service...'
            });
            await this.registerThreatGuardService();
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 9: Configure services (75%)
            progressCallback({
                step: 'services',
                progress: 75,
                message: 'Configuring Windows services...'
            });
            await this.configureServices(config);
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 10: Configure Snort (82%)
            progressCallback({
                step: 'snort-config',
                progress: 82,
                message: 'Configuring Snort IDS...'
            });
            await this.configureSnort(config);
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 11: Build frontend (88%)
            progressCallback({
                step: 'frontend',
                progress: 88,
                message: 'Building frontend...'
            });
            await this.buildFrontend();
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

            // Step 12: Create admin user (93%)
            progressCallback({
                step: 'admin',
                progress: 93,
                message: 'Creating admin user...'
            });
            const credentials = await this.createAdminUser();
            if (this._cancelRequested) { this.log('Installation cancelled by user', 'warn'); throw new Error('Installation cancelled by user'); }

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

            // Write an installed marker file so future runs can reliably detect a full install
            try {
                const markerPath = path.join(this.installPath, '.threatguard_installed');
                const markerData = {
                    installedAt: new Date().toISOString(),
                    installer: 'ThreatGuard Installer'
                };
                await fs.outputFile(markerPath, JSON.stringify(markerData, null, 2));
                this.log(`Wrote installed marker at ${markerPath}`);
            } catch (e) {
                this.log(`Failed to write installed marker: ${e && e.message}`, 'warn');
            }

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

        // Ensure the base directory exists (use fs-extra to simplify)
        try {
            await fs.ensureDir(installPath);
        } catch (e) {
            this.log(`Failed to create install directory ${installPath}: ${e && e.message}`, 'error');
            throw e;
        }

        // Create subdirectories
        const subdirs = ['logs', 'config', 'data'];
        for (const subdir of subdirs) {
            const fullPath = path.join(installPath, subdir);
            try {
                await fs.ensureDir(fullPath);
            } catch (e) {
                this.log(`Failed to create subdir ${fullPath}: ${e && e.message}`, 'warn');
            }
        }

        this.log('Directories created successfully.');
    }

    /**
     * Copy application files to the selected installation path
     */
    async copyApplicationFiles(installPath) {
        this.log(`Copying application files to ${installPath}...`);

        // Get the path to the 'app' directory in resources
        // In dev: .../installer-app/src
        // In prod: resources/app/src (mapped from extraResources)

        // We need to copy:
        // 1. src/ -> installPath/src
        // 2. PAGINA WEB/ -> installPath/PAGINA WEB
        // 3. config/ -> installPath/config
        // 4. threatguard_api.py -> installPath/threatguard_api.py
        // 5. requirements.txt -> installPath/requirements.txt

        try {
            // Locate the source 'app' directory
            // In package.json extraResources, we map everything to "app/"
            const appSource = this.getResourcePath('app');

            if (!appSource || !await fs.pathExists(appSource)) {
                throw new Error(`Application source files not found at ${appSource}`);
            }

            this.log(`Source files located at: ${appSource}`);

            // Copy everything from appSource to installPath
            await fs.copy(appSource, installPath, {
                overwrite: true,
                dereference: true,
                filter: (src) => {
                    // Avoid copying venv or node_modules if they somehow exist in source
                    return !src.includes('venv') && !src.includes('node_modules');
                }
            });

            this.log('Application files copied successfully.');

            // Explicitly copy uninstaller script
            const uninstallerPs1 = this.getResourcePath('uninstall.ps1');

            if (await fs.pathExists(uninstallerPs1)) {
                await fs.copy(uninstallerPs1, path.join(installPath, 'uninstall.ps1'));
                this.log('Copied uninstall.ps1');
            }

        } catch (error) {
            this.log(`Failed to copy application files: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Install Python dependencies
     */
    async installPythonDependencies() {
        this.log('Installing Python dependencies...');

        // Ensure installPath exists and is writable
        try {
            await fs.ensureDir(this.installPath);
        } catch (e) {
            this.log(`Failed to ensure install path ${this.installPath}: ${e && e.message}`, 'error');
            throw e;
        }

        try {
            await fs.access(this.installPath, fs.constants.W_OK);
        } catch (e) {
            const msg = `No write access to install path ${this.installPath}. Run installer with sufficient permissions or choose a different install path.`;
            this.log(msg, 'error');
            throw new Error(msg);
        }

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

        if (snortInstaller && await fs.pathExists(snortInstaller)) {
            this.log('Found bundled Snort installer. Installing...');
            try {
                await this.execCommand(`"${snortInstaller}" /S`);
                this.log('Snort installed successfully from bundle.');
            } catch (error) {
                this.log(`Failed to install bundled Snort: ${error.message}`, 'warn');
            }
        }

        // (Duplicate block removed — keep the disabled copyApplicationFiles above)

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
                const ok = await this.ensureChocolatey();
                if (!ok) throw new Error('Chocolatey installation failed');
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

        // Use system temp directory for temporary SQL script to avoid permission issues on C:\
        const mysqlTemp = path.join(os.tmpdir(), 'threatguard_setup_mysql.sql');
        await fs.writeFile(mysqlTemp, sqlScript, 'utf8');

        try {
            // Try to execute with mysql client using input redirection (avoids quoting issues)
            let mysqlCmd = `mysql -u root`;
            if (config.dbAdminPassword) {
                mysqlCmd += ` -p"${config.dbAdminPassword}"`;
            }
            mysqlCmd += ` < "${mysqlTemp}"`;

            await this.execCommand(mysqlCmd, { timeout: 15000 });
        } catch (error) {
            this.log(`Warning: Failed to configure MySQL users automatically. You may need to configure the DB manually. Error: ${error.message}`, 'warn');
        } finally {
            try { await fs.remove(mysqlTemp); } catch (e) { }
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
                const ok = await this.ensureChocolatey();
                if (!ok) throw new Error('Chocolatey installation failed');
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

        // Use system temp directory for temporary SQL script to avoid permission issues on C:\
        const pgTemp = path.join(os.tmpdir(), 'threatguard_setup_db.sql');
        await fs.writeFile(pgTemp, sqlScript, 'utf8');

        try {
            // Try to find psql executable
            let psqlPath = `${this.postgresPath}\\bin\\psql.exe`;
            if (!await fs.pathExists(psqlPath)) {
                if (await this.commandExists('psql')) {
                    psqlPath = 'psql';
                } else {
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
            const pgPassword = config.dbAdminPassword || 'postgres';

            await this.execCommand(`"${psqlPath}" -U postgres -f "${pgTemp}"`, {
                timeout: 15000,
                env: { ...process.env, PGPASSWORD: pgPassword }
            });
        } catch (error) {
            this.log(`Warning: Failed to configure database users automatically (likely due to password auth). Continuing anyway. You may need to configure the DB manually. Error: ${error.message}`, 'warn');
        } finally {
            try { await fs.remove(pgTemp); } catch (e) { }
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
                DATABASE_PORT: config.dbPort || 5432,
                API_PORT: config.apiPort || 9000,
                FRONTEND_PORT: config.frontendPort || 3000,
                REDIS_PORT: config.redisPort || 6379,
                SECRET_KEY: this.generateSecretKey(),
                JWT_SECRET: this.generateSecretKey(),
                INTERFACE: config.networkInterface ? (config.networkInterface.index || '1') : '1'
            });
            this.log('Configuration file .env created.');
        } else {
            this.log(`Warning: .env.template not found at ${envTemplate}. Creating default .env file.`, 'warn');
            // Create a basic .env file if template is missing
            const dbPort = config.dbPort || 5432;
            const basicEnv = `DATABASE_URL=postgresql://threatguard_user:${dbPassword}@127.0.0.1:${dbPort}/threatguard_db
DATABASE_PASSWORD=${dbPassword}
DATABASE_PORT=${dbPort}
DATABASE_HOST=127.0.0.1
DATABASE_NAME=threatguard_db
DATABASE_USER=threatguard_user
API_HOST=127.0.0.1
API_PORT=${config.apiPort || 9000}
FRONTEND_PORT=${config.frontendPort || 3000}
REDIS_HOST=localhost
REDIS_PORT=${config.redisPort || 6379}
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

        if (servicesScript && await fs.pathExists(servicesScript)) {
            try {
                await this.execCommand(
                    `powershell -ExecutionPolicy Bypass -File "${servicesScript}" -InstallPath "${this.installPath}"`
                );
                this.log('Services configured');
            } catch (error) {
                this.log(`Failed to configure services: ${error.message}`, 'warn');
            }
        } else {
            this.log('Services script not found. Skipping service configuration.', 'warn');
        }
    }

    /**
     * Configure Snort
     */
    async configureSnort(config) {
        this.log('Configuring Snort...');

        const snortTemplate = this.getResourcePath('config/snort.lua.template');
        const snortConfig = `${this.snortPath}\\etc\\snort.lua`;

        // Ensure target directories exist
        try {
            await fs.ensureDir(path.join(this.snortPath, 'etc'));
            await fs.ensureDir(path.join(this.snortPath, 'rules'));
        } catch (e) {
            this.log(`Failed to create Snort directories under ${this.snortPath}: ${e && e.message}`, 'warn');
        }

        if (snortTemplate && await fs.pathExists(snortTemplate)) {
            try {
                await this.processTemplate(snortTemplate, snortConfig, {
                    INTERFACE: config.networkInterface ? (config.networkInterface.index || '1') : '1'
                });
            } catch (e) {
                this.log(`Failed to process snort template: ${e && e.message}`, 'warn');
            }
        } else {
            this.log(`Warning: snort.lua.template not found. Checking for snort.lua...`, 'warn');
            // Fallback to snort.lua if template is missing
            const snortLuaSource = this.getResourcePath('config/snort.lua');
            if (snortLuaSource && await fs.pathExists(snortLuaSource)) {
                try {
                    await fs.copy(snortLuaSource, snortConfig);
                    this.log('Copied snort.lua directly (no template processing).');
                } catch (e) {
                    this.log(`Failed to copy snort.lua: ${e && e.message}`, 'warn');
                }
            } else {
                this.log('Warning: Could not find snort.lua configuration to install.', 'warn');
            }
        }

        // Copy rules
        const rulesPath = this.getResourcePath('config/local.rules');
        if (rulesPath && await fs.pathExists(rulesPath)) {
            try {
                await fs.ensureDir(path.join(this.snortPath, 'rules'));
                await this.copyFile(rulesPath, `${this.snortPath}\\rules\\local.rules`);
            } catch (e) {
                this.log(`Failed to copy local.rules: ${e && e.message}`, 'warn');
            }
        } else {
            this.log('Warning: local.rules not found.', 'warn');
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

        // Install http-server globally for serving static files
        this.log('Installing http-server for static file serving...');
        try {
            await this.execCommand('npm install -g http-server');
            this.log('http-server installed globally');
        } catch (error) {
            this.log(`Warning: Failed to install http-server: ${error.message}`, 'warn');
        }

        if (await fs.pathExists(packageJsonPath)) {
            try {
                // Install dependencies (for tailwind CSS build)
                await this.execCommand(`cd /d "${frontendPath}" && npm install`);

                // Build CSS with Tailwind if script exists
                try {
                    await this.execCommand(`cd /d "${frontendPath}" && npm run build:css`);
                    this.log('Tailwind CSS built');
                } catch (cssError) {
                    this.log(`Tailwind CSS build skipped: ${cssError.message}`, 'warn');
                }

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

        // Use OS temp dir to avoid writing to root 'C:\' which may be blocked
        const tmpDir = os.tmpdir();
        const scriptPath = path.join(tmpDir, `temp_create_admin_${Date.now()}.py`);
        await fs.writeFile(scriptPath, script);

        try {
            const pythonExe = path.join(this.installPath, 'venv', 'Scripts', 'python.exe');
            if (!await fs.pathExists(pythonExe)) {
                this.log(`Python executable not found at ${pythonExe}; skipping admin creation step`, 'warn');
            } else {
                // Use execFile semantics via execCommand wrapper which handles quoting
                await this.execCommand(`"${pythonExe}" "${scriptPath}"`);
            }
        } catch (error) {
            this.log(`Failed to create admin user: ${error.message}`, 'error');
            // Don't fail installation for this
        } finally {
            try { await fs.remove(scriptPath); } catch (e) { this.log(`Failed to remove temp script: ${e && e.message}`, 'warn'); }
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
            
            // First, try to copy the ThreatGuard Desktop app
            const desktopAppSource = path.join(__dirname, '..', '..', '..', '..', 'ThreatGuard-Desktop');
            const desktopAppDest = path.join(this.installPath, 'ThreatGuard-Desktop');
            
            // Check if desktop app exists and copy it
            if (await fs.pathExists(desktopAppSource)) {
                this.log('Copying ThreatGuard Desktop app...');
                await fs.copy(desktopAppSource, desktopAppDest, { overwrite: true });
                
                // Install npm dependencies if node_modules doesn't exist
                const nodeModulesPath = path.join(desktopAppDest, 'node_modules');
                if (!await fs.pathExists(nodeModulesPath)) {
                    this.log('Installing ThreatGuard Desktop dependencies...');
                    try {
                        await this.execCommand(`cd "${desktopAppDest}" && npm install --production`);
                    } catch (e) {
                        this.log(`Failed to install desktop app dependencies: ${e.message}`, 'warn');
                    }
                }
                
                // Create a batch launcher
                const launcherPath = path.join(this.installPath, 'ThreatGuard.bat');
                const launcherContent = `@echo off
cd /d "${desktopAppDest}"
start "" npx electron .
`;
                await fs.writeFile(launcherPath, launcherContent);
                
                // Create .lnk shortcut using PowerShell
                const shortcutPath = path.join(desktopPath, 'ThreatGuard.lnk');
                const iconPath = path.join(this.installPath, 'assets', 'icon.ico');
                
                const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${launcherPath.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "${this.installPath.replace(/\\/g, '\\\\')}"
$Shortcut.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"
$Shortcut.Description = "ThreatGuard - Security Operations Center"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
`;
                await this.execCommand(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
                this.log('Desktop shortcut created with ThreatGuard Desktop app');
            } else {
                // Fallback to URL shortcut if desktop app not found
                this.log('ThreatGuard Desktop app not found, creating URL shortcut as fallback...');
                const shortcutPath = path.join(desktopPath, 'ThreatGuard Dashboard.url');
                const content = `[InternetShortcut]
URL=http://localhost:3000
IconIndex=0
`;
                try { await fs.ensureDir(path.dirname(shortcutPath)); } catch (e) { this.log(`Failed to ensure Desktop directory: ${e && e.message}`, 'warn'); }
                await fs.writeFile(shortcutPath, content);
                this.log('Desktop shortcut (URL) created');
            }
        } catch (error) {
            this.log(`Failed to create desktop shortcut: ${error.message}`, 'warn');
        }
    }

    /**
     * Start services
     */
    async startServices() {
        this.log('Starting services...');

        if (!this.isAdmin()) {
            this.log('Not running as administrator; skipping service start. Re-run installer as admin to start services.', 'warn');
            return;
        }

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

        if (!this.isAdmin()) {
            this.log('Not running as administrator; skipping firewall configuration. Re-run installer as admin to add firewall rules.', 'warn');
            return;
        }

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

    /**
     * Repair installation: attempt to reconfigure services, rebuild frontend,
     * recreate shortcuts and restart services. This is intended to be idempotent
     * and safe to run on an existing installation.
     */
    async repair(progressCallback) {
        this.log('Starting repair procedure...');
        try {
            progressCallback && progressCallback({ step: 'repair-start', progress: 5, message: 'Starting repair...' });

            // Ensure services scripts are present and re-run configuration
            progressCallback && progressCallback({ step: 'services', progress: 25, message: 'Reconfiguring services...' });
            await this.configureServices({});

            // Rebuild frontend if needed
            progressCallback && progressCallback({ step: 'frontend', progress: 50, message: 'Rebuilding frontend...' });
            await this.buildFrontend();

            // Recreate desktop shortcut
            progressCallback && progressCallback({ step: 'shortcut', progress: 70, message: 'Recreating desktop shortcut...' });
            await this.createDesktopShortcut();

            // Restart services
            progressCallback && progressCallback({ step: 'start', progress: 85, message: 'Starting services...' });
            await this.startServices();

            // Configure firewall again
            progressCallback && progressCallback({ step: 'firewall', progress: 95, message: 'Configuring firewall...' });
            await this.configureFirewall({});

            progressCallback && progressCallback({ step: 'complete', progress: 100, message: 'Repair completed successfully' });

            this.log('Repair completed successfully');
            return { success: true };
        } catch (error) {
            this.log(`Repair failed: ${error.message}`, 'error');
            return { success: false, error: error.message, logs: this.getLogs() };
        }
    }
}

module.exports = { WindowsInstaller };
