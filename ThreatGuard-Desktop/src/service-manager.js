/**
 * ThreatGuard Service Manager
 * 
 * Este script actúa como proceso padre que encapsula todos los servicios
 * de ThreatGuard bajo un solo árbol de procesos (como Discord).
 * 
 * Servicios gestionados:
 * - Frontend (http-server)
 * - API Backend (uvicorn/Python)
 * - Snort Integration
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

class ThreatGuardServiceManager {
    constructor(installPath = 'C:\\ThreatGuard') {
        this.installPath = installPath;
        this.services = {};
        this.config = this.loadConfig();
        this.isShuttingDown = false;
        
        // Configuración de servicios
        this.serviceConfigs = {
            frontend: {
                name: 'ThreatGuard Frontend',
                command: 'npx',
                args: ['http-server', '.', '-p', String(this.config.frontendPort || 3000), '-c-1', '--cors', '-s'],
                cwd: path.join(this.installPath, 'PAGINA WEB'),
                healthCheck: `http://localhost:${this.config.frontendPort || 3000}`,
                priority: 1
            },
            api: {
                name: 'ThreatGuard API',
                command: 'python',
                args: ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(this.config.apiPort || 8000)],
                cwd: this.installPath,
                healthCheck: `http://localhost:${this.config.apiPort || 8000}/health`,
                priority: 2,
                env: {
                    DATABASE_URL: this.config.databaseUrl || '',
                    REDIS_HOST: this.config.redisHost || 'localhost',
                    REDIS_PORT: String(this.config.redisPort || 6379)
                }
            },
            integration: {
                name: 'ThreatGuard Snort Integration',
                command: 'python',
                args: ['-m', 'src.data_collection.snort_integration'],
                cwd: this.installPath,
                priority: 3,
                env: {
                    THREATGUARD_API_URL: `http://localhost:${this.config.apiPort || 8000}`,
                    SNORT_ALERT_FILE: 'C:\\Snort\\log\\alert'
                }
            }
        };
    }

    loadConfig() {
        const config = {
            frontendPort: 3000,
            apiPort: 8000,
            redisHost: 'localhost',
            redisPort: 6379,
            databaseUrl: ''
        };

        const envPath = path.join(this.installPath, '.env');
        if (fs.existsSync(envPath)) {
            try {
                const content = fs.readFileSync(envPath, 'utf8');
                const lines = content.split('\n');
                
                for (const line of lines) {
                    const match = line.match(/^([^=]+)=(.*)$/);
                    if (match) {
                        const [, key, value] = match;
                        const trimmedKey = key.trim();
                        const trimmedValue = value.trim();
                        
                        switch (trimmedKey) {
                            case 'FRONTEND_PORT':
                                config.frontendPort = parseInt(trimmedValue) || 3000;
                                break;
                            case 'API_PORT':
                                config.apiPort = parseInt(trimmedValue) || 8000;
                                break;
                            case 'REDIS_HOST':
                                config.redisHost = trimmedValue || 'localhost';
                                break;
                            case 'REDIS_PORT':
                                config.redisPort = parseInt(trimmedValue) || 6379;
                                break;
                            case 'DATABASE_URL':
                                config.databaseUrl = trimmedValue;
                                break;
                        }
                    }
                }
                console.log('[ServiceManager] Config loaded from .env');
            } catch (e) {
                console.error('[ServiceManager] Error loading .env:', e.message);
            }
        }

        return config;
    }

    // Set callback for progress updates (used by splash screen)
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    // Emit progress update
    emitProgress(progress, message) {
        if (this.progressCallback) {
            this.progressCallback({ progress, message });
        }
        this.log(null, `[${progress}%] ${message}`);
    }

    log(service, message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = service ? `[${service}]` : '[ServiceManager]';
        const logMessage = `${timestamp} ${prefix} ${message}`;
        
        if (level === 'error') {
            console.error(logMessage);
        } else {
            console.log(logMessage);
        }
    }

    async startService(id) {
        const config = this.serviceConfigs[id];
        if (!config) {
            this.log(null, `Unknown service: ${id}`, 'error');
            return false;
        }

        if (this.services[id] && this.services[id].process) {
            this.log(config.name, 'Already running');
            return true;
        }

        this.log(config.name, 'Starting...');

        try {
            const env = { ...process.env, ...config.env };
            
            const proc = spawn(config.command, config.args, {
                cwd: config.cwd,
                env: env,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
                windowsHide: true
            });

            this.services[id] = {
                process: proc,
                config: config,
                startTime: Date.now(),
                restartCount: 0
            };

            proc.stdout.on('data', (data) => {
                const lines = data.toString().trim().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.log(config.name, line.trim());
                    }
                });
            });

            proc.stderr.on('data', (data) => {
                const lines = data.toString().trim().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.log(config.name, `[stderr] ${line.trim()}`);
                    }
                });
            });

            proc.on('error', (error) => {
                this.log(config.name, `Error: ${error.message}`, 'error');
            });

            proc.on('exit', (code, signal) => {
                this.log(config.name, `Exited with code ${code}, signal ${signal}`);
                
                // Auto-restart if not shutting down
                if (!this.isShuttingDown && this.services[id]) {
                    this.services[id].restartCount++;
                    
                    if (this.services[id].restartCount < 5) {
                        this.log(config.name, `Restarting in 5 seconds... (attempt ${this.services[id].restartCount})`);
                        setTimeout(() => {
                            if (!this.isShuttingDown) {
                                this.services[id].process = null;
                                this.startService(id);
                            }
                        }, 5000);
                    } else {
                        this.log(config.name, 'Max restart attempts reached', 'error');
                    }
                }
            });

            // Wait a moment to check if process started successfully
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (proc.exitCode === null) {
                this.log(config.name, `Started (PID: ${proc.pid})`);
                return true;
            } else {
                this.log(config.name, 'Failed to start', 'error');
                return false;
            }

        } catch (error) {
            this.log(config.name, `Failed to start: ${error.message}`, 'error');
            return false;
        }
    }

    async stopService(id) {
        const service = this.services[id];
        if (!service || !service.process) {
            return true;
        }

        this.log(service.config.name, 'Stopping...');

        return new Promise((resolve) => {
            const proc = service.process;
            
            // Set a timeout to force kill
            const timeout = setTimeout(() => {
                try {
                    proc.kill('SIGKILL');
                } catch (e) {}
                resolve(true);
            }, 10000);

            proc.on('exit', () => {
                clearTimeout(timeout);
                this.log(service.config.name, 'Stopped');
                resolve(true);
            });

            try {
                // On Windows, use taskkill to kill the process tree
                if (process.platform === 'win32') {
                    exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
                } else {
                    proc.kill('SIGTERM');
                }
            } catch (e) {
                clearTimeout(timeout);
                resolve(true);
            }
        });
    }

    async startAll() {
        this.log(null, '=== Starting ThreatGuard Services ===');
        this.isShuttingDown = false;
        
        this.emitProgress(10, 'Iniciando servicios...');

        // Sort by priority
        const serviceIds = Object.keys(this.serviceConfigs).sort(
            (a, b) => this.serviceConfigs[a].priority - this.serviceConfigs[b].priority
        );

        let progressStep = 15;
        for (const id of serviceIds) {
            const config = this.serviceConfigs[id];
            this.emitProgress(progressStep, `Iniciando ${config.name}...`);
            await this.startService(id);
            progressStep += 20;
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.emitProgress(80, 'Verificando servicios...');
        await new Promise(resolve => setTimeout(resolve, 500));

        this.log(null, '=== All services started ===');
    }

    async stopAll() {
        this.log(null, '=== Stopping ThreatGuard Services ===');
        this.isShuttingDown = true;

        const stopPromises = Object.keys(this.services).map(id => this.stopService(id));
        await Promise.all(stopPromises);

        this.log(null, '=== All services stopped ===');
    }

    async checkHealth(id) {
        const config = this.serviceConfigs[id];
        if (!config || !config.healthCheck) {
            return null;
        }

        return new Promise((resolve) => {
            const req = http.get(config.healthCheck, { timeout: 3000 }, (res) => {
                resolve(res.statusCode >= 200 && res.statusCode < 500);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async getStatus() {
        const status = {};
        
        for (const id of Object.keys(this.serviceConfigs)) {
            const service = this.services[id];
            const config = this.serviceConfigs[id];
            
            status[id] = {
                name: config.name,
                running: service && service.process && service.process.exitCode === null,
                pid: service?.process?.pid || null,
                uptime: service?.startTime ? Date.now() - service.startTime : 0,
                restartCount: service?.restartCount || 0,
                healthy: await this.checkHealth(id)
            };
        }

        return status;
    }

    setupSignalHandlers() {
        const shutdown = async () => {
            this.log(null, 'Shutdown signal received');
            await this.stopAll();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        process.on('SIGHUP', shutdown);
        
        // Windows-specific
        if (process.platform === 'win32') {
            process.on('message', (msg) => {
                if (msg === 'shutdown') {
                    shutdown();
                }
            });
        }
    }
}

// Si se ejecuta directamente como script
if (require.main === module) {
    const installPath = process.argv[2] || 'C:\\ThreatGuard';
    const manager = new ThreatGuardServiceManager(installPath);
    
    manager.setupSignalHandlers();
    manager.startAll().catch(console.error);
    
    // Exponer estado via HTTP en puerto 9999
    const statusServer = http.createServer(async (req, res) => {
        if (req.url === '/status') {
            const status = await manager.getStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status, null, 2));
        } else if (req.url === '/stop') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Stopping...');
            await manager.stopAll();
            process.exit(0);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    
    statusServer.listen(9999, () => {
        console.log('[ServiceManager] Status server listening on http://localhost:9999/status');
    });
}

module.exports = { ThreatGuardServiceManager };
