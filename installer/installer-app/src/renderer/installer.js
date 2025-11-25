const { ipcRenderer } = require('electron');

// State management
let currentScreen = 0;
let config = {
    networkInterface: null,
    apiPort: 8000,
    frontendPort: 3000,
    dbPort: 5432,
    redisPort: 6379,
    dbType: 'postgresql',
    installPath: process.platform === 'win32' ? 'C:\\ThreatGuard' : '/opt/threatguard',
    components: {
        api: true,
        frontend: true,
        snort: true,
        database: true,
        redis: true,
        openvas: true,
        elasticsearch: false
    }
};

const screens = [
    'welcome',
    'database',
    'requirements',
    'network',
    'ports',
    'components',
    'installation',
    'complete'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    showScreen(0);
});

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Navigation buttons
    document.getElementById('btn-next').addEventListener('click', handleNext);
    document.getElementById('btn-back').addEventListener('click', handleBack);

    // Port inputs
    document.getElementById('port-api').addEventListener('change', (e) => {
        config.apiPort = parseInt(e.target.value);
    });
    document.getElementById('port-frontend').addEventListener('change', (e) => {
        config.frontendPort = parseInt(e.target.value);
    });
    document.getElementById('port-db').addEventListener('change', (e) => {
        config.dbPort = parseInt(e.target.value);
    });
    document.getElementById('port-redis').addEventListener('change', (e) => {
        config.redisPort = parseInt(e.target.value);
    });

    // Database selection
    const dbOptions = document.querySelectorAll('.db-option');
    dbOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all
            dbOptions.forEach(opt => opt.classList.remove('selected'));
            // Add to clicked
            option.classList.add('selected');
            // Update config
            config.dbType = option.dataset.value;
            
            // Update port default
            const portInput = document.getElementById('port-db');
            if (config.dbType === 'postgresql') {
                config.dbPort = 5432;
                portInput.value = 5432;
            } else {
                config.dbPort = 3306;
                portInput.value = 3306;
            }
        });
    });

    // DB Admin Password
    const dbAdminPassInput = document.getElementById('db-admin-password');
    if (dbAdminPassInput) {
        dbAdminPassInput.addEventListener('change', (e) => {
            config.dbAdminPassword = e.target.value;
        });
    }

    // Component checkboxes
    const compDb = document.getElementById('comp-postgres'); // Reusing ID but logic is generic
    if (compDb) {
        compDb.addEventListener('change', (e) => {
            config.components.database = e.target.checked;
        });
    }
    document.getElementById('comp-redis').addEventListener('change', (e) => {
        config.components.redis = e.target.checked;
    });
    document.getElementById('comp-openvas').addEventListener('change', (e) => {
        config.components.openvas = e.target.checked;
        updateSpaceRequired();
    });
    document.getElementById('comp-elasticsearch').addEventListener('change', (e) => {
        config.components.elasticsearch = e.target.checked;
        updateSpaceRequired();
    });
    
    // Finish button event
    const btnFinish = document.getElementById('btn-finish');
    if (btnFinish) {
        btnFinish.addEventListener('click', () => {
            let url = null;
            const startCheckbox = document.getElementById('start-on-complete');
            if (startCheckbox && startCheckbox.checked) {
                // Open browser to ThreatGuard
                url = `http://localhost:${config.frontendPort}`;
            }
            ipcRenderer.send('finish-installation', url);
        });
    }
}

/**
 * Show specific screen
 */
function showScreen(index) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show current screen
    const screenId = `screen-${screens[index]}`;
    document.getElementById(screenId).classList.add('active');

    // Update navigation
    currentScreen = index;
    updateNavigation();

    // Execute screen-specific logic
    switch (screens[index]) {
        case 'requirements':
            checkRequirements();
            break;
        case 'network':
            loadNetworkInterfaces();
            break;
        case 'installation':
            startInstallation();
            break;
    }
}

/**
 * Update navigation buttons
 */
function updateNavigation() {
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const pageIndicator = document.getElementById('page-indicator');

    // Update page indicator
    pageIndicator.textContent = `${currentScreen + 1} / ${screens.length}`;

    // Back button
    btnBack.disabled = currentScreen === 0 || currentScreen === 5 || currentScreen === 6;

    // Next button - hide on installation screen (second to last) and completion screen (last)
    if (currentScreen === 0) {
        btnNext.style.display = 'block';
        btnNext.textContent = 'Comenzar →';
        btnNext.disabled = false;
    } else if (currentScreen === screens.length - 2) {
        btnNext.style.display = 'none'; // Hide during installation
    } else if (currentScreen === screens.length - 1) {
        btnNext.style.display = 'none'; // Hide on completion - use btn-finish instead
    } else {
        btnNext.style.display = 'block';
        btnNext.textContent = 'Siguiente →';
        btnNext.disabled = false;
    }
}

/**
 * Handle next button
 */
async function handleNext() {
    const currentScreenId = screens[currentScreen];

    // Validation before proceeding
    if (currentScreenId === 'requirements') {
        const allValid = document.querySelectorAll('.requirement-item .status.valid').length === 8; // Now 8 items
        if (!allValid) {
            // Check if critical system requirements fail (not installable components)
            // DB, Python, Node, Ports can be installed/fixed automatically
            const criticalFailed = 
                document.querySelector('#req-os .status.error') ||
                document.querySelector('#req-ram .status.error') ||
                document.querySelector('#req-disk .status.error') ||
                document.querySelector('#req-permissions .status.error');
            
            if (criticalFailed) {
                alert('Por favor, solucione los requisitos del sistema antes de continuar.\n\nLos componentes faltantes (Base de Datos, Python, Node.js) serán instalados automáticamente.');
                return;
            }
            
            // Warn about missing components that will be auto-installed
            const missingComponents = [];
            if (document.querySelector('#req-db .status.error')) missingComponents.push('Base de Datos');
            if (document.querySelector('#req-python .status.error')) missingComponents.push('Python');
            if (document.querySelector('#req-node .status.error')) missingComponents.push('Node.js');
            
            if (missingComponents.length > 0) {
                const confirmed = confirm(
                    `Los siguientes componentes no están instalados:\n\n• ${missingComponents.join('\n• ')}\n\nSerán instalados automáticamente durante el proceso.\n\n¿Desea continuar?`
                );
                if (!confirmed) return;
            }
        }
    }

    if (currentScreen < screens.length - 1) {
        currentScreen++;
        showScreen(currentScreen);

        // Trigger actions based on screen
        if (screens[currentScreen] === 'requirements') {
            checkRequirements();
        } else if (screens[currentScreen] === 'network') {
            loadNetworkInterfaces();
        } else if (screens[currentScreen] === 'installation') {
            startInstallation();
        }
    }
}

/**
 * Handle back button
 */
function handleBack() {
    if (currentScreen > 0) {
        currentScreen--;
        showScreen(currentScreen);
    }
}

/**
 * Validate current screen
 */
async function validateCurrentScreen() {
    switch (screens[currentScreen]) {
        case 'requirements':
            return validateRequirements();
        case 'network':
            return validateNetworkSelection();
        case 'ports':
            return await validatePorts();
        default:
            return true;
    }
}

/**
 * Check system requirements
 */
async function checkRequirements() {
    const items = ['os', 'ram', 'disk', 'permissions', 'python', 'node', 'ports', 'dbPorts', 'db'];
    
    // Reset status - actualizado para Tailwind
    items.forEach(id => {
        const el = document.getElementById(`req-${id}`);
        if (el) {
            const statusDot = el.querySelector('.w-3.h-3.rounded-full') || el.querySelector('div[class*="rounded-full"]');
            const valueEl = el.querySelector('.value');
            
            if (statusDot) {
                statusDot.className = 'w-3 h-3 rounded-full bg-yellow-500 animate-pulse';
            }
            if (valueEl) {
                valueEl.textContent = 'Verificando...';
                valueEl.className = 'value text-gray-900 dark:text-white font-medium';
            }
        }
    });

    try {
        // Pass config to checkRequirements to know which DB to check
        const response = await ipcRenderer.invoke('check-requirements', config);
        const results = response.requirements || response;
        
        Object.keys(results).forEach(key => {
            const result = results[key];
            const el = document.getElementById(`req-${key}`);
            if (el) {
                const statusDot = el.querySelector('.w-3.h-3.rounded-full') || el.querySelector('div[class*="rounded-full"]');
                const valueEl = el.querySelector('.value');
                
                if (statusDot) {
                    if (result.valid) {
                        statusDot.className = 'w-3 h-3 rounded-full bg-green-500';
                    } else {
                        statusDot.className = 'w-3 h-3 rounded-full bg-red-500';
                    }
                }
                
                if (valueEl) {
                    valueEl.textContent = result.value;
                    if (result.valid) {
                        valueEl.className = 'value text-gray-900 dark:text-white font-medium';
                    } else {
                        valueEl.className = 'value text-red-600 dark:text-red-400 font-medium';
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error checking requirements:', error);
    }
}

/**
 * Validate requirements
 */
function validateRequirements() {
    const requirements = ['os', 'ram', 'disk', 'permissions', 'python', 'node', 'ports', 'dbPorts'];
    const portsOccupied = [];
    const componentsToInstall = [];

    for (const req of requirements) {
        const element = document.getElementById(`req-${req}`);
        if (!element) continue;
        const status = element.querySelector('.status');
        const valueEl = element.querySelector('.value');

        if (status.textContent === '●' && status.style.color === 'rgb(239, 68, 68)') {
            // Check if it's a port issue
            if (req === 'ports' || req === 'dbPorts') {
                const portInfo = valueEl.textContent;
                if (portInfo.includes('Ocupado')) {
                    portsOccupied.push(portInfo);
                }
            } else if (req !== 'os' && req !== 'ram' && req !== 'disk' && req !== 'permissions') {
                // Components that can be auto-installed
                componentsToInstall.push(element.querySelector('.label').textContent);
            } else {
                // Critical requirements
                alert(`Requisito crítico no cumplido: ${element.querySelector('.label').textContent}\n\nPor favor, solucione este problema antes de continuar.`);
                return false;
            }
        }
    }

    // Show specific warnings for occupied ports
    if (portsOccupied.length > 0) {
        const portDetails = portsOccupied.join('\n• ');
        const confirmed = confirm(
            `⚠️ PUERTOS OCUPADOS DETECTADOS:\n\n• ${portDetails}\n\nEstos puertos están siendo utilizados por otra aplicación.\n\nPor favor, cierre las aplicaciones que usan estos puertos antes de continuar.\n\n¿Desea continuar de todas formas? (No recomendado)`
        );
        if (!confirmed) return false;
    }

    // Show info about components to auto-install
    if (componentsToInstall.length > 0) {
        const confirmed = confirm(
            `Los siguientes componentes se instalarán automáticamente:\n\n• ${componentsToInstall.join('\n• ')}\n\n¿Desea continuar?`
        );
        if (!confirmed) return false;
    }

    return true;
}

/**
 * Load network interfaces
 */
async function loadNetworkInterfaces() {
    const result = await ipcRenderer.invoke('get-network-interfaces');

    if (!result.success) {
        showError('Error al obtener interfaces de red', result.error);
        return;
    }

    const container = document.getElementById('network-interfaces');
    const template = container.querySelector('.network-interface-card');
    
    // Limpiar solo las interfaces dinámicas (no el template)
    container.querySelectorAll('.network-interface-card:not(.hidden)').forEach(el => el.remove());

    result.interfaces.forEach((iface, index) => {
        const card = template.cloneNode(true);
        card.classList.remove('hidden');
        
        const radio = card.querySelector('.interface-radio');
        const label = card.querySelector('label');
        const radioId = `interface-${iface.name}`;
        
        radio.id = radioId;
        radio.value = iface.name;
        label.setAttribute('for', radioId);
        
        if (index === 0) {
            radio.checked = true;
            config.networkInterface = iface;
        }
        
        // Poblar datos de la interfaz
        card.querySelector('.interface-name').textContent = iface.name;
        card.querySelector('.interface-ip').textContent = iface.ip || 'No asignada';
        card.querySelector('.interface-mac').textContent = iface.mac || 'Desconocida';
        card.querySelector('.interface-netmask').textContent = iface.netmask || 'N/A';
        
        // Estado de conexión
        const statusDot = card.querySelector('.status-dot');
        const statusText = card.querySelector('.interface-status');
        const isConnected = iface.status === 'up' || iface.ip;
        
        if (isConnected) {
            statusDot.className = 'status-dot h-2.5 w-2.5 rounded-full bg-green-500';
            statusText.textContent = 'Conectado';
        } else {
            statusDot.className = 'status-dot h-2.5 w-2.5 rounded-full bg-gray-500';
            statusText.textContent = 'Desconectado';
        }
        
        // Event listener para selección
        radio.addEventListener('change', () => {
            config.networkInterface = iface;
        });
        
        container.appendChild(card);
    });
}

/**
 * Validate network selection
 */
function validateNetworkSelection() {
    if (!config.networkInterface) {
        alert('Por favor seleccione una interfaz de red');
        return false;
    }
    return true;
}

/**
 * Validate ports
 */
async function validatePorts() {
    const ports = [
        { name: 'API', value: config.apiPort },
        { name: 'Frontend', value: config.frontendPort },
        { name: 'PostgreSQL', value: config.postgresPort },
        { name: 'Redis', value: config.redisPort }
    ];

    for (const port of ports) {
        if (port.value < 1024 || port.value > 65535) {
            alert(`Puerto ${port.name} inválido. Debe estar entre 1024 y 65535.`);
            return false;
        }
    }

    return true;
}

/**
 * Update space required
 */
function updateSpaceRequired() {
    let space = 8.5; // Base installation

    if (config.components.openvas) {
        space += 2.5;
    }

    if (config.components.elasticsearch) {
        space += 3.0;
    }

    document.getElementById('space-required').textContent = `${space.toFixed(1)} GB`;
}

/**
 * Start installation
 */
async function startInstallation() {
    // Get install path to display
    try {
        const result = await ipcRenderer.invoke('get-install-path');
        if (result.success) {
            const pathDisplay = document.getElementById('install-path-display');
            if (pathDisplay) pathDisplay.textContent = result.path;
        }
    } catch (e) {
        console.error('Could not get install path', e);
    }

    const btnNext = document.getElementById('btn-next');
    const btnBack = document.getElementById('btn-back');
    btnNext.style.display = 'none';

    // Create progress steps - estructura Tailwind actualizada
    const steps = [
        { id: 'dependencies', label: 'Instalando dependencias' },
        { id: 'directories', label: 'Creando directorios' },
        { id: 'files', label: 'Copiando archivos' },
        { id: 'python', label: 'Configurando Python' },
        { id: 'snort', label: 'Instalando Snort' },
        { id: 'database', label: 'Configurando base de datos' },
        { id: 'services', label: 'Configurando servicios' },
        { id: 'frontend', label: 'Compilando frontend' },
        { id: 'admin', label: 'Creando usuario admin' },
        { id: 'start', label: 'Iniciando servicios' }
    ];

    const container = document.getElementById('progress-steps');
    container.innerHTML = '';

    steps.forEach(step => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-3 text-gray-500 dark:text-gray-400';
        li.id = `step-${step.id}`;
        li.innerHTML = `
            <span class="material-symbols-outlined text-gray-400 step-icon">circle</span>
            <span class="text-sm step-label">${step.label}</span>
        `;
        container.appendChild(li);
    });

    // Limpiar logs
    const logsContainer = document.getElementById('installation-logs');
    logsContainer.innerHTML = '<pre class="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">Iniciando instalación...</pre>';

    // Start installation
    const result = await ipcRenderer.invoke('install', config);

    if (result.success) {
        // Update completion screen with correct IDs
        const urlElement = document.getElementById('complete-url');
        const emailElement = document.getElementById('admin-email');
        const passwordElement = document.getElementById('admin-password');
        const credentialsBox = document.getElementById('credentials-box');
        
        if (urlElement) {
            const url = `http://localhost:${config.frontendPort}`;
            urlElement.textContent = url;
            urlElement.href = url;
        }
        
        if (result.credentials && emailElement && passwordElement) {
            emailElement.textContent = result.credentials.email || 'admin@threatguard.local';
            passwordElement.textContent = result.credentials.password || 'TG-2024-Default';
            
            // Show credentials box
            if (credentialsBox) {
                credentialsBox.classList.remove('hidden');
            }
        }

        // Move to completion screen
        showScreen(screens.length - 1);
    } else {
        showError('Error durante la instalación', result.error);
    }
}

/**
 * Update installation progress - actualizado para Tailwind
 */
function updateProgress(progress) {
    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    progressBar.style.width = `${progress.progress}%`;
    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(progress.progress)}%`;
    }

    // Update current step
    document.getElementById('current-step').textContent = progress.message;

    // Update step status
    const stepElement = document.getElementById(`step-${progress.step}`);
    if (stepElement) {
        const icon = stepElement.querySelector('.step-icon');
        if (icon) {
            icon.textContent = 'pending';
            icon.className = 'material-symbols-outlined text-yellow-500 step-icon animate-pulse';
        }
        stepElement.className = 'flex items-center gap-3 text-yellow-500 dark:text-yellow-400';
    }

    // Mark previous steps as complete
    const allSteps = document.querySelectorAll('#progress-steps li');
    let foundCurrent = false;
    allSteps.forEach(step => {
        if (step.id === `step-${progress.step}`) {
            foundCurrent = true;
        } else if (!foundCurrent) {
            // Este es un paso anterior, marcarlo como completo
            const icon = step.querySelector('.step-icon');
            if (icon) {
                icon.textContent = 'check_circle';
                icon.className = 'material-symbols-outlined text-green-500 step-icon';
            }
            step.className = 'flex items-center gap-3 text-green-600 dark:text-green-400';
        }
    });

    // Add log entry
    const logs = document.getElementById('installation-logs');
    const logEntry = document.createElement('pre');
    logEntry.className = 'text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed';
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${progress.message}`;
    logs.appendChild(logEntry);
    logs.scrollTop = logs.scrollHeight;

    // Estimate time remaining (opcional, si existe el elemento)
    const timeRemaining = document.getElementById('time-remaining');
    if (timeRemaining) {
        const remaining = Math.round((100 - progress.progress) * 2);
        timeRemaining.textContent = `Tiempo estimado: ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
    }
}

/**
 * Show error dialog
 */
function showError(message, details) {
    alert(`Error: ${message}\n\n${details || ''}`);
}
