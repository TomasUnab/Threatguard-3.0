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

    // Next button
    if (currentScreen === 0) {
        btnNext.style.display = 'block';
        btnNext.textContent = 'Comenzar →';
        btnNext.disabled = false;
    } else if (currentScreen === screens.length - 2) {
        btnNext.style.display = 'none'; // Hide during installation
    } else if (currentScreen === screens.length - 1) {
        btnNext.style.display = 'block'; // Show again for finish
        btnNext.textContent = 'Finalizar';
        btnNext.disabled = false;
        btnNext.onclick = () => {
            let url = null;
            if (document.getElementById('start-on-complete').checked) {
                // Open browser to ThreatGuard
                url = `http://localhost:${config.frontendPort}`;
            }
            ipcRenderer.send('finish-installation', url);
        };
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
    const items = ['os', 'ram', 'disk', 'permissions', 'python', 'node', 'ports', 'db'];
    
    // Reset status
    items.forEach(id => {
        const el = document.getElementById(`req-${id}`);
        if (el) {
            el.querySelector('.status').textContent = '⏳';
            el.querySelector('.status').className = 'status';
            el.querySelector('.value').textContent = 'Verificando...';
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
                const statusEl = el.querySelector('.status');
                const valueEl = el.querySelector('.value');
                
                statusEl.textContent = result.valid ? '●' : '●';
                statusEl.style.color = result.valid ? '#10b981' : '#ef4444';
                statusEl.className = `status ${result.valid ? 'valid' : 'error'}`;
                valueEl.textContent = result.value;
                
                if (!result.valid) {
                    valueEl.classList.add('text-red-400');
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
    const requirements = ['os', 'ram', 'disk', 'permissions', 'python', 'node', 'ports'];

    for (const req of requirements) {
        const element = document.getElementById(`req-${req}`);
        if (!element) continue; // Skip if element doesn't exist (e.g. ports might be optional in UI)
        const status = element.querySelector('.status');

        if (status.textContent === '●' && status.style.color === 'rgb(239, 68, 68)') {
            // Allow to continue even if some requirements fail
            // They will be installed during installation
            const confirmed = confirm(
                'Algunos requisitos no se cumplen. Los componentes faltantes se instalarán automáticamente. ¿Desea continuar?'
            );
            return confirmed;
        }
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
    container.innerHTML = '';

    result.interfaces.forEach((iface, index) => {
        const div = document.createElement('div');
        div.className = 'network-interface';
        if (index === 0) {
            div.classList.add('selected');
            config.networkInterface = iface;
        }

        div.innerHTML = `
      <input type="radio" name="network-interface" value="${iface.name}" ${index === 0 ? 'checked' : ''}>
      <div>
        <div class="interface-name">${iface.name}</div>
        <div class="interface-details">
          <div>IP: ${iface.ip}</div>
          <div>MAC: ${iface.mac}</div>
          <div>Estado: ${iface.status}</div>
          <div>Máscara: ${iface.netmask}</div>
        </div>
      </div>
    `;

        div.addEventListener('click', () => {
            document.querySelectorAll('.network-interface').forEach(el => {
                el.classList.remove('selected');
            });
            div.classList.add('selected');
            div.querySelector('input').checked = true;
            config.networkInterface = iface;
        });

        container.appendChild(div);
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

    // Create progress steps
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
        const div = document.createElement('div');
        div.className = 'progress-step pending';
        div.id = `step-${step.id}`;
        div.innerHTML = `
      <div class="step-status">⏳</div>
      <div class="step-label">${step.label}</div>
    `;
        container.appendChild(div);
    });

    // Start installation
    const result = await ipcRenderer.invoke('install', config);

    if (result.success) {
        // Update completion screen
        document.getElementById('url-value').textContent =
            `http://localhost:${config.frontendPort}`;
        document.getElementById('email-value').textContent = result.credentials.email;
        document.getElementById('password-value').textContent = result.credentials.password;

        // Move to completion screen
        showScreen(screens.length - 1);
    } else {
        showError('Error durante la instalación', result.error);
    }
}

/**
 * Update installation progress
 */
function updateProgress(progress) {
    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${progress.progress}%`;

    // Update current step
    document.getElementById('current-step').textContent = progress.message;

    // Update step status
    const stepElement = document.getElementById(`step-${progress.step}`);
    if (stepElement) {
        stepElement.className = 'progress-step active';
        stepElement.querySelector('.step-status').textContent = '●';
        stepElement.querySelector('.step-status').style.color = '#fbbf24';
    }

    // Mark previous steps as complete
    const allSteps = document.querySelectorAll('.progress-step');
    allSteps.forEach(step => {
        if (step.id !== `step-${progress.step}` && step.classList.contains('active')) {
            step.className = 'progress-step complete';
            step.querySelector('.step-status').textContent = '●';
            step.querySelector('.step-status').style.color = '#10b981';
        }
    });

    // Add log entry
    const logs = document.getElementById('installation-logs');
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${progress.message}`;
    logs.appendChild(logEntry);
    logs.scrollTop = logs.scrollHeight;

    // Estimate time remaining
    const remaining = Math.round((100 - progress.progress) * 2); // Rough estimate
    document.getElementById('time-remaining').textContent =
        `Tiempo estimado: ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
}

/**
 * Show error dialog
 */
function showError(message, details) {
    alert(`Error: ${message}\n\n${details || ''}`);
}
