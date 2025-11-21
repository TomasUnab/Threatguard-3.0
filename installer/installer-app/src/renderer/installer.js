const { ipcRenderer } = require('electron');

// State management
let currentScreen = 0;
let config = {
    networkInterface: null,
    apiPort: 8000,
    frontendPort: 3000,
    postgresPort: 5432,
    redisPort: 6379,
    installPath: process.platform === 'win32' ? 'C:\\ThreatGuard' : '/opt/threatguard',
    components: {
        api: true,
        frontend: true,
        snort: true,
        postgres: true,
        redis: true,
        openvas: true,
        elasticsearch: false
    }
};

const screens = [
    'welcome',
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
    document.getElementById('port-postgres').addEventListener('change', (e) => {
        config.postgresPort = parseInt(e.target.value);
    });
    document.getElementById('port-redis').addEventListener('change', (e) => {
        config.redisPort = parseInt(e.target.value);
    });

    // Component checkboxes
    document.getElementById('comp-postgres').addEventListener('change', (e) => {
        config.components.postgres = e.target.checked;
    });
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

    // Log toggle
    document.getElementById('toggle-logs').addEventListener('click', () => {
        const logs = document.getElementById('installation-logs');
        logs.classList.toggle('hidden');
    });

    // Copy password button
    document.getElementById('copy-password').addEventListener('click', () => {
        const password = document.getElementById('password-value').textContent;
        navigator.clipboard.writeText(password);
        alert('Contraseña copiada al portapapeles');
    });

    // IPC listeners
    ipcRenderer.on('install-progress', (event, progress) => {
        updateProgress(progress);
    });

    ipcRenderer.on('error', (event, error) => {
        showError(error.message, error.details);
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
        btnNext.textContent = 'Comenzar →';
        btnNext.disabled = false;
    } else if (currentScreen === screens.length - 2) {
        btnNext.style.display = 'none'; // Hide during installation
    } else if (currentScreen === screens.length - 1) {
        btnNext.textContent = 'Finalizar';
        btnNext.disabled = false;
        btnNext.onclick = () => {
            if (document.getElementById('start-on-complete').checked) {
                // Open browser to ThreatGuard
                const url = `http://localhost:${config.frontendPort}`;
                require('electron').shell.openExternal(url);
            }
            window.close();
        };
    } else {
        btnNext.textContent = 'Siguiente →';
        btnNext.disabled = false;
    }
}

/**
 * Handle next button
 */
async function handleNext() {
    // Validate current screen
    if (!await validateCurrentScreen()) {
        return;
    }

    // Move to next screen
    if (currentScreen < screens.length - 1) {
        showScreen(currentScreen + 1);
    }
}

/**
 * Handle back button
 */
function handleBack() {
    if (currentScreen > 0 && currentScreen !== 5 && currentScreen !== 6) {
        showScreen(currentScreen - 1);
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
    const result = await ipcRenderer.invoke('check-requirements');

    if (!result.success) {
        showError('Error al verificar requisitos', result.error);
        return;
    }

    const requirements = result.requirements;

    // Update UI
    for (const [key, req] of Object.entries(requirements)) {
        const element = document.getElementById(`req-${key}`);
        if (element) {
            const status = element.querySelector('.status');
            const value = element.querySelector('.value');

            status.textContent = req.valid ? '✅' : '❌';
            value.textContent = req.value;

            if (!req.valid) {
                element.style.color = '#e53e3e';
            }
        }
    }
}

/**
 * Validate requirements
 */
function validateRequirements() {
    const requirements = ['os', 'ram', 'disk', 'sudo', 'python', 'node'];

    for (const req of requirements) {
        const element = document.getElementById(`req-${req}`);
        const status = element.querySelector('.status');

        if (status.textContent === '❌') {
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
    const btnNext = document.getElementById('btn-next');
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
        stepElement.querySelector('.step-status').textContent = '⏳';
    }

    // Mark previous steps as complete
    const allSteps = document.querySelectorAll('.progress-step');
    allSteps.forEach(step => {
        if (step.id !== `step-${progress.step}` && step.classList.contains('active')) {
            step.className = 'progress-step complete';
            step.querySelector('.step-status').textContent = '✅';
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
