const { InstallerCommon } = require('./common');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');

class UnixInstaller extends InstallerCommon {
    constructor() {
        super();
        this.installPath = '/opt/threatguard';
    }

    /**
     * Check system requirements
     */
    async checkRequirements() {
        this.log('Checking system requirements...');

        const requirements = {
            os: {
                valid: os.platform() === 'linux' || os.platform() === 'darwin',
                value: os.platform(),
                required: 'Linux or macOS'
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
            permissions: {
                valid: this.isRoot(),
                value: this.isRoot() ? 'Yes' : 'No',
                required: 'Root access required'
            }
        };

        return requirements;
    }

    /**
     * Create directories based on the selected installation path
     */
    async createDirectories(installPath) {
        this.log(`Creating directories in ${installPath}...`);

        if (!fs.existsSync(installPath)) {
            fs.mkdirSync(installPath, { recursive: true });
        }

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

        fs.copySync(sourcePath, destinationPath);

        this.log('Application files copied successfully.');
    }

    /**
     * Install system dependencies
     */
    async installSystemDependencies() {
        this.log('Installing system dependencies...');

        const dependencies = ['python3', 'nodejs', 'npm'];
        for (const dep of dependencies) {
            await this.execCommand(`sudo apt-get install -y ${dep}`);
        }

        this.log('System dependencies installed successfully.');
    }

    /**
     * Main installation function
     */
    async install(config, progressCallback) {
        this.log('Starting ThreatGuard installation...');

        try {
            // Step 1: Install system dependencies (15%)
            progressCallback({
                step: 'dependencies',
                progress: 15,
                message: 'Installing system dependencies...'
            });
            await this.installSystemDependencies();

            // Step 2: Create directories (25%)
            progressCallback({
                step: 'directories',
                progress: 25,
                message: 'Creating directories...'
            });
            await this.createDirectories(config.installPath);

            // Step 3: Copy application files (35%)
            progressCallback({
                step: 'files',
                progress: 35,
                message: 'Copying application files...'
            });
            await this.copyApplicationFiles(config.installPath);

            return { success: true, message: 'Installation completed successfully.' };
        } catch (error) {
            this.log(`Installation failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

module.exports = { UnixInstaller };