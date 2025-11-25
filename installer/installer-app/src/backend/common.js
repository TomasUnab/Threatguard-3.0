const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

/**
 * Common utilities for both Linux and Windows installers
 */
class InstallerCommon {
    constructor() {
        this.logs = [];
    }

    /**
     * Execute a command and return output
     */
    async execCommand(cmd, options = {}) {
        return new Promise((resolve, reject) => {
            this.log(`Executing: ${cmd}`);

            exec(cmd, options, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Error: ${error.message}`, 'error');
                    if (stderr) this.log(`stderr: ${stderr}`, 'error');
                    reject(error);
                } else {
                    if (stdout) this.log(`stdout: ${stdout}`, 'debug');
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    /**
     * Check if a command exists
     */
    async commandExists(cmd) {
        try {
            const checkCmd = process.platform === 'win32'
                ? `where ${cmd}`
                : `which ${cmd}`;
            await this.execCommand(checkCmd);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Generate a secure random password
     */
    generatePassword(length = 12) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        let password = 'TG-2024-';

        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, chars.length);
            password += chars[randomIndex];
        }

        return password;
    }

    /**
     * Generate a secure secret key
     */
    generateSecretKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Replace placeholders in a template file
     */
    async processTemplate(templatePath, outputPath, replacements) {
        this.log(`Processing template: ${templatePath}`);

        let content = await fs.readFile(templatePath, 'utf8');

        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(`\\$\\{${key}\\}|${key}`, 'g');
            content = content.replace(regex, value);
        }

        await fs.writeFile(outputPath, content);
        this.log(`Template processed: ${outputPath}`);
    }

    /**
     * Check available disk space (in GB)
     */
    async checkDiskSpace(path = '/') {
        try {
            if (process.platform === 'win32') {
                const drive = path.charAt(0);
                const { stdout } = await this.execCommand(
                    `powershell "Get-PSDrive ${drive} | Select-Object -ExpandProperty Free"`
                );
                const bytes = parseInt(stdout.trim());
                return Math.floor(bytes / (1024 * 1024 * 1024)); // Convert to GB
            } else {
                const { stdout } = await this.execCommand(`df -BG ${path} | tail -1 | awk '{print $4}'`);
                return parseInt(stdout.replace('G', ''));
            }
        } catch (error) {
            this.log(`Error checking disk space: ${error.message}`, 'error');
            return 0;
        }
    }

    /**
     * Get total system RAM (in GB)
     */
    getTotalRAM() {
        const os = require('os');
        const totalMem = os.totalmem();
        return Math.floor(totalMem / (1024 * 1024 * 1024)); // Convert to GB
    }

    /**
     * Check if running with admin/root privileges
     */
    isAdmin() {
        if (process.platform === 'win32') {
            // Windows: check if running as admin
            try {
                require('child_process').execSync('net session', { stdio: 'ignore' });
                return true;
            } catch {
                return false;
            }
        } else {
            // Linux: check if running as root
            return process.getuid() === 0;
        }
    }

    /**
     * Validate port number
     */
    validatePort(port) {
        const portNum = parseInt(port);
        return portNum >= 1024 && portNum <= 65535;
    }

    /**
     * Check if port is available
     */
    async isPortAvailable(port) {
        try {
            if (process.platform === 'win32') {
                const { stdout } = await this.execCommand(`netstat -ano | findstr :${port}`);
                return stdout.trim() === '';
            } else {
                const { stdout } = await this.execCommand(`netstat -tlnp | grep :${port}`);
                return stdout.trim() === '';
            }
        } catch {
            return true; // If command fails, assume port is available
        }
    }

    /**
     * Create directory with proper permissions
     */
    async createDirectory(dirPath, mode = 0o755) {
        await fs.ensureDir(dirPath);
        if (process.platform !== 'win32') {
            await fs.chmod(dirPath, mode);
        }
        this.log(`Created directory: ${dirPath}`);
    }

    /**
     * Copy file with permissions
     */
    async copyFile(src, dest, mode = 0o644) {
        await fs.copy(src, dest);
        if (process.platform !== 'win32') {
            await fs.chmod(dest, mode);
        }
        this.log(`Copied file: ${src} -> ${dest}`);
    }

    /**
     * Write file with permissions
     */
    async writeFile(filePath, content, mode = 0o644) {
        await fs.writeFile(filePath, content);
        if (process.platform !== 'win32') {
            await fs.chmod(filePath, mode);
        }
        this.log(`Wrote file: ${filePath}`);
    }

    /**
     * Log a message
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message
        };

        this.logs.push(logEntry);
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }

    /**
     * Get all logs
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry a function with exponential backoff
     */
    async retry(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;

                const waitTime = delay * Math.pow(2, i);
                this.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`, 'warn');
                await this.sleep(waitTime);
            }
        }
    }

    /**
     * Validate email address
     */
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
    }

    /**
     * Get resource path (for Electron app resources)
     * Returns null if resource is not found instead of throwing
     */
    getResourcePath(relativePath, throwOnError = false) {
        if (process.env.NODE_ENV === 'development') {
            const devPath = path.join(__dirname, '../../..', relativePath);
            if (fs.existsSync(devPath)) {
                return devPath;
            }
            if (throwOnError) {
                throw new Error(`Resource not found in development: ${relativePath}`);
            }
            return null;
        } else {
            // In production, resources are in process.resourcesPath
            // Try multiple possible locations
            const { app } = require('electron');
            
            // 1. Try app.asar.unpacked (for files that need to be unpacked like assets)
            const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', relativePath);
            if (fs.existsSync(unpackedPath)) {
                return unpackedPath;
            }
            
            // 2. Try extraResources/app/ path (where we package them)
            const extraResourcesPath = path.join(process.resourcesPath, 'app', relativePath);
            if (fs.existsSync(extraResourcesPath)) {
                return extraResourcesPath;
            }
            
            // 3. Try direct extraResources path
            const directResourcePath = path.join(process.resourcesPath, relativePath);
            if (fs.existsSync(directResourcePath)) {
                return directResourcePath;
            }
            
            // 4. Try asar path (for files inside asar)
            const asarPath = path.join(process.resourcesPath, 'app.asar', relativePath);
            if (fs.existsSync(asarPath)) {
                return asarPath;
            }
            
            // Log available paths for debugging
            console.warn(`Resource not found: ${relativePath}`);
            console.warn(`Tried paths:`);
            console.warn(`  - ${unpackedPath}`);
            console.warn(`  - ${extraResourcesPath}`);
            console.warn(`  - ${directResourcePath}`);
            console.warn(`  - ${asarPath}`);
            console.warn(`process.resourcesPath: ${process.resourcesPath}`);
            
            if (throwOnError) {
                throw new Error(`Resource not found: ${relativePath}`);
            }
            return null;
        }
    }

    /**
     * Validate configuration object
     */
    validateConfig(config) {
        const errors = [];

        // Validate network interface
        if (!config.networkInterface) {
            errors.push('Network interface is required');
        }

        // Validate ports
        const ports = ['apiPort', 'frontendPort', 'postgresPort', 'redisPort'];
        for (const portKey of ports) {
            if (!this.validatePort(config[portKey])) {
                errors.push(`Invalid ${portKey}: must be between 1024 and 65535`);
            }
        }

        // Validate install path
        if (!config.installPath || config.installPath.trim() === '') {
            errors.push('Installation path is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = { InstallerCommon };
