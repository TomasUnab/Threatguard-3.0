// ==========================================
// FUNCIONES GLOBALES PARA AGENTES
// ==========================================
const API_URL = 'http://localhost:8000';

// Variable para almacenar el agente seleccionado
let selectedAgent = null;

// Definición completa de módulos de seguridad con reglas
const securityModulesRules = {
    anti_malware: {
        name: 'Anti-Malware', icon: 'verified_user',
        rules: [
            { id: 'scan_realtime', name: 'Escaneo en tiempo real', enabled: true },
            { id: 'scan_downloads', name: 'Escanear descargas automáticamente', enabled: true },
            { id: 'scan_usb', name: 'Escanear dispositivos USB', enabled: true },
            { id: 'quarantine_auto', name: 'Cuarentena automática de amenazas', enabled: true },
            { id: 'scan_compressed', name: 'Escanear archivos comprimidos', enabled: false }
        ]
    },
    firewall: {
        name: 'Firewall', icon: 'local_fire_department',
        rules: [
            { id: 'block_inbound', name: 'Bloquear conexiones entrantes no autorizadas', enabled: true },
            { id: 'block_outbound', name: 'Bloquear conexiones salientes sospechosas', enabled: true },
            { id: 'log_blocked', name: 'Registrar conexiones bloqueadas', enabled: true },
            { id: 'stealth_mode', name: 'Modo sigiloso (no responder ping)', enabled: false }
        ]
    },
    ips: {
        name: 'Sistema de Prevención de Intrusiones', icon: 'shield',
        rules: [
            { id: 'detect_scan', name: 'Detectar escaneos de puertos', enabled: true },
            { id: 'block_exploit', name: 'Bloquear exploits conocidos', enabled: true },
            { id: 'detect_bruteforce', name: 'Detectar ataques de fuerza bruta', enabled: true },
            { id: 'block_dos', name: 'Protección contra DoS', enabled: true }
        ]
    },
    intrusion_prevention: {
        name: 'Intrusion Prevention', icon: 'block',
        rules: [
            { id: 'prevent_sql_injection', name: 'Prevenir SQL Injection', enabled: true },
            { id: 'prevent_xss', name: 'Prevenir Cross-Site Scripting', enabled: true },
            { id: 'prevent_rce', name: 'Prevenir ejecución remota de código', enabled: true },
            { id: 'prevent_lfi', name: 'Prevenir Local File Inclusion', enabled: true },
            { id: 'block_known_exploits', name: 'Bloquear exploits conocidos', enabled: true }
        ]
    },
    web_reputation: {
        name: 'Reputación Web', icon: 'language',
        rules: [
            { id: 'block_malicious', name: 'Bloquear sitios maliciosos', enabled: true },
            { id: 'block_phishing', name: 'Bloquear sitios de phishing', enabled: true },
            { id: 'warn_unknown', name: 'Advertir sobre sitios desconocidos', enabled: false },
            { id: 'block_crypto', name: 'Bloquear sitios de cryptojacking', enabled: true }
        ]
    },
    integrity_monitoring: {
        name: 'Monitoreo de Integridad', icon: 'folder_open',
        rules: [
            { id: 'monitor_system', name: 'Monitorear archivos del sistema', enabled: true },
            { id: 'monitor_registry', name: 'Monitorear registro de Windows', enabled: true },
            { id: 'monitor_config', name: 'Monitorear archivos de configuración', enabled: true },
            { id: 'alert_changes', name: 'Alertar cambios no autorizados', enabled: true }
        ]
    },
    log_inspection: {
        name: 'Inspección de Logs', icon: 'description',
        rules: [
            { id: 'inspect_security', name: 'Inspeccionar logs de seguridad', enabled: true },
            { id: 'inspect_system', name: 'Inspeccionar logs del sistema', enabled: true },
            { id: 'inspect_application', name: 'Inspeccionar logs de aplicaciones', enabled: true },
            { id: 'detect_anomalies', name: 'Detectar anomalías en logs', enabled: false }
        ]
    },
    application_control: {
        name: 'Control de Aplicaciones', icon: 'apps',
        rules: [
            { id: 'whitelist_mode', name: 'Modo lista blanca', enabled: false },
            { id: 'block_unknown', name: 'Bloquear aplicaciones desconocidas', enabled: false },
            { id: 'alert_new_apps', name: 'Alertar nuevas aplicaciones', enabled: true }
        ]
    },
    activity_monitoring: {
        name: 'Monitoreo de Actividad', icon: 'visibility',
        rules: [
            { id: 'monitor_processes', name: 'Monitorear procesos', enabled: true },
            { id: 'monitor_network', name: 'Monitorear conexiones de red', enabled: true },
            { id: 'monitor_files', name: 'Monitorear acceso a archivos', enabled: false }
        ]
    },
    device_control: {
        name: 'Control de Dispositivos', icon: 'usb',
        rules: [
            { id: 'block_usb', name: 'Bloquear dispositivos USB no autorizados', enabled: false },
            { id: 'log_usb', name: 'Registrar conexiones USB', enabled: true },
            { id: 'allow_known_devices', name: 'Permitir solo dispositivos conocidos', enabled: true }
        ]
    }
};

let currentModule = null;

// Abrir modal de reglas del módulo - CON API REAL
async function openModuleRules(moduleKey) {
    const module = securityModulesRules[moduleKey];
    if (!module) {
        showNotification('Módulo no encontrado: ' + moduleKey, 'error');
        return;
    }
    currentModule = moduleKey;
    
    const titleEl = document.getElementById('module-rules-title');
    if (titleEl) {
        titleEl.innerHTML = `<span class="material-symbols-outlined text-primary">${module.icon}</span> ${module.name} - Reglas`;
    }
    
    // Si hay agente seleccionado, cargar su configuración real
    let moduleRules = module.rules;
    if (selectedAgent) {
        try {
            const response = await fetch(`${API_URL}/agent/modules/${selectedAgent.id}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.modules && data.modules[moduleKey]) {
                    const serverRules = data.modules[moduleKey].rules || {};
                    moduleRules = module.rules.map(rule => ({
                        ...rule,
                        enabled: serverRules[rule.id] !== undefined ? serverRules[rule.id] : rule.enabled
                    }));
                }
            }
        } catch (err) {
            console.warn('Error cargando config del servidor, usando defaults:', err);
        }
    }
    
    const content = document.getElementById('module-rules-content');
    if (content) {
        content.innerHTML = moduleRules.map(rule => `
            <div class="flex items-center justify-between p-3 bg-[#1c2127] rounded-lg mb-2 hover:bg-[#283039] transition-colors">
                <div>
                    <span class="text-white">${rule.name}</span>
                    <p class="text-xs text-gray-500 mt-1">${getRuleDescription(rule.id)}</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" ${rule.enabled ? 'checked' : ''} class="sr-only peer" data-rule="${rule.id}" onchange="toggleRuleRealtime('${moduleKey}', '${rule.id}', this.checked)">
                    <div class="w-11 h-6 bg-[#3b4754] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
            </div>
        `).join('');
    }
    
    const modal = document.getElementById('module-rules-modal');
    if (modal) modal.classList.remove('hidden');
}

// Descripciones de reglas para mejor UX
function getRuleDescription(ruleId) {
    const descriptions = {
        'scan_realtime': 'Escanea archivos en tiempo real cuando se acceden o modifican',
        'scan_downloads': 'Analiza automáticamente archivos descargados de internet',
        'scan_usb': 'Escanea dispositivos USB al conectarse',
        'quarantine_auto': 'Mueve automáticamente archivos infectados a cuarentena',
        'scan_compressed': 'Escanea contenido dentro de archivos ZIP, RAR, etc.',
        'block_inbound': 'Bloquea conexiones entrantes no autorizadas',
        'block_outbound': 'Bloquea conexiones salientes a IPs sospechosas',
        'log_blocked': 'Registra todas las conexiones bloqueadas para auditoría',
        'stealth_mode': 'No responde a solicitudes ping para mayor seguridad',
        'prevent_sql_injection': 'Detecta y bloquea intentos de SQL Injection',
        'prevent_xss': 'Previene ataques Cross-Site Scripting',
        'prevent_rce': 'Bloquea intentos de ejecución remota de código',
        'prevent_lfi': 'Previene ataques de Local File Inclusion',
        'block_known_exploits': 'Bloquea exploits conocidos basados en firmas',
        'monitor_system': 'Monitorea cambios en archivos críticos del sistema',
        'monitor_registry': 'Detecta modificaciones en el registro de Windows',
        'monitor_config': 'Vigila cambios en archivos de configuración',
        'alert_changes': 'Genera alertas cuando se detectan cambios no autorizados',
        'inspect_security': 'Analiza logs de eventos de seguridad',
        'inspect_system': 'Monitorea logs del sistema operativo',
        'inspect_application': 'Revisa logs de aplicaciones instaladas',
        'detect_anomalies': 'Usa IA para detectar patrones anómalos en logs',
        'block_malicious': 'Bloquea acceso a sitios web maliciosos conocidos',
        'block_phishing': 'Previene acceso a sitios de phishing',
        'warn_unknown': 'Muestra advertencias en sitios sin reputación',
        'block_crypto': 'Bloquea sitios de minería de criptomonedas no autorizada',
        'monitor_processes': 'Rastrea todos los procesos en ejecución',
        'monitor_network': 'Monitorea conexiones de red activas',
        'monitor_files': 'Registra accesos a archivos sensibles',
        'whitelist_mode': 'Solo permite aplicaciones en lista blanca',
        'block_unknown': 'Bloquea aplicaciones no reconocidas',
        'alert_new_apps': 'Alerta cuando se instalan nuevas aplicaciones',
        'block_usb': 'Bloquea dispositivos USB no autorizados',
        'log_usb': 'Registra conexiones de dispositivos USB',
        'allow_known_devices': 'Permite solo dispositivos USB previamente autorizados'
    };
    return descriptions[ruleId] || 'Regla de seguridad';
}

// Toggle regla en tiempo real
async function toggleRuleRealtime(moduleKey, ruleId, enabled) {
    // Actualizar localmente
    const rule = securityModulesRules[moduleKey]?.rules.find(r => r.id === ruleId);
    if (rule) rule.enabled = enabled;
    
    // Enviar al servidor si hay agente seleccionado
    if (selectedAgent) {
        try {
            await fetch(`${API_URL}/agent/modules/${selectedAgent.id}/rule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module: moduleKey, rule_id: ruleId, enabled })
            });
        } catch (err) {
            console.warn('Error guardando regla en servidor:', err);
        }
    }
    
    updateModulesDisplay();
}

function closeModuleRulesModal() {
    const modal = document.getElementById('module-rules-modal');
    if (modal) modal.classList.add('hidden');
    currentModule = null;
}

async function saveModuleRules() {
    if (currentModule) {
        const rules = document.querySelectorAll('#module-rules-content input[data-rule]');
        const rulesConfig = {};
        
        rules.forEach(input => {
            const ruleId = input.dataset.rule;
            rulesConfig[ruleId] = input.checked;
            
            // Actualizar estado local
            const rule = securityModulesRules[currentModule].rules.find(r => r.id === ruleId);
            if (rule) rule.enabled = input.checked;
        });
        
        // Guardar en servidor si hay agente
        if (selectedAgent) {
            try {
                const response = await fetch(`${API_URL}/agent/modules/${selectedAgent.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        modules: { 
                            [currentModule]: { 
                                enabled: true, 
                                rules: rulesConfig 
                            } 
                        } 
                    })
                });
                
                if (response.ok) {
                    showNotification(`Reglas de ${securityModulesRules[currentModule].name} guardadas`, 'success');
                } else {
                    showNotification('Error guardando reglas en el servidor', 'error');
                }
            } catch (err) {
                showNotification('Error de conexión al guardar reglas', 'error');
            }
        } else {
            showNotification('Reglas guardadas localmente', 'success');
        }
    }
    closeModuleRulesModal();
    updateModulesDisplay();
}

// Actualizar display de módulos con conteo real de reglas
function updateModulesDisplay() {
    Object.keys(securityModulesRules).forEach(key => {
        const module = securityModulesRules[key];
        const enabledCount = module.rules.filter(r => r.enabled).length;
        const totalCount = module.rules.length;
        const statusEl = document.querySelector(`[data-module-status="${key}"]`);
        if (statusEl) {
            statusEl.textContent = `On, ${enabledCount}/${totalCount} reglas`;
            statusEl.className = enabledCount > 0 ? 'text-sm text-green-400' : 'text-sm text-gray-400';
        }
    });
}

// Toggle de módulo completo
async function toggleModule(moduleKey, enabled) {
    if (securityModulesRules[moduleKey]) {
        securityModulesRules[moduleKey].enabled = enabled;
    }
    
    if (selectedAgent) {
        try {
            await fetch(`${API_URL}/agent/modules/${selectedAgent.id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module: moduleKey, enabled })
            });
            showNotification(`${securityModulesRules[moduleKey]?.name || moduleKey} ${enabled ? 'activado' : 'desactivado'}`, enabled ? 'success' : 'warning');
        } catch (err) {
            console.error('Error toggling module:', err);
        }
    }
    
    updateModulesDisplay();
}

// Abrir configuración de agente - AHORA CON DATOS REALES
function openAgentConfig(agentId) {
    // Buscar el agente en los datos cargados
    fetch(`${API_URL}/assets`)
        .then(r => r.json())
        .then(data => {
            const agent = (data.assets || []).find(a => a.id == agentId);
            if (agent) {
                selectedAgent = agent;
                populateAgentModal(agent);
            }
            const modal = document.getElementById('agent-config-modal');
            if (modal) modal.classList.remove('hidden');
        })
        .catch(err => {
            console.error('Error:', err);
            const modal = document.getElementById('agent-config-modal');
            if (modal) modal.classList.remove('hidden');
        });
}

// Poblar el modal con datos del agente
function populateAgentModal(agent) {
    // Tab General
    const hostnameEl = document.querySelector('#agent-config-modal [data-field="hostname"]');
    const ipEl = document.querySelector('#agent-config-modal [data-field="ip"]');
    const platformEl = document.querySelector('#agent-config-modal [data-field="platform"]');
    const lastSeenEl = document.querySelector('#agent-config-modal [data-field="last_seen"]');
    
    if (hostnameEl) hostnameEl.textContent = agent.hostname || 'Unknown';
    if (ipEl) ipEl.textContent = agent.ip || 'N/A';
    if (platformEl) platformEl.textContent = agent.os || 'Unknown';
    if (lastSeenEl) lastSeenEl.textContent = agent.last_seen ? new Date(agent.last_seen).toLocaleString() : 'Never';
    
    // Actualizar pestañas
    setupAgentModalTabs();
}

// Configurar pestañas del modal de agente
function setupAgentModalTabs() {
    const tabs = document.querySelectorAll('#agent-config-modal [data-tab]');
    const contents = document.querySelectorAll('#agent-config-modal [data-tab-content]');
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('text-primary', 'border-b-2', 'border-primary'));
            tab.classList.add('text-primary', 'border-b-2', 'border-primary');
            
            const tabName = tab.dataset.tab;
            contents.forEach(c => c.classList.add('hidden'));
            const content = document.querySelector(`#agent-config-modal [data-tab-content="${tabName}"]`);
            if (content) content.classList.remove('hidden');
        };
    });
}

function closeAgentConfigModal() {
    const modal = document.getElementById('agent-config-modal');
    if (modal) modal.classList.add('hidden');
    selectedAgent = null;
}

function saveAgentConfig() {
    closeAgentConfigModal();
    showNotification('Configuración del agente guardada', 'success');
}

// Check Status - AHORA VERIFICA EL ESTADO REAL
async function checkAgentStatus() {
    if (!selectedAgent) {
        showNotification('No hay agente seleccionado', 'error');
        return;
    }
    
    showNotification('Verificando estado del agente...', 'info');
    
    try {
        const response = await fetch(`${API_URL}/assets`);
        const data = await response.json();
        const agent = (data.assets || []).find(a => a.id == selectedAgent.id);
        
        if (agent) {
            const isOnline = agent.status === 'Active';
            if (isOnline) {
                showNotification(`Agente ${agent.hostname} está ONLINE`, 'success');
            } else {
                showNotification(`Agente ${agent.hostname} está OFFLINE`, 'error');
            }
            // Actualizar datos en el modal
            populateAgentModal(agent);
        } else {
            showNotification('Agente no encontrado', 'error');
        }
    } catch (err) {
        showNotification('Error al verificar estado: ' + err.message, 'error');
    }
}

// Guardar y aplicar módulos a todos los agentes
async function saveAgentModules() {
    showNotification('Guardando configuración de módulos...', 'info');
    
    // Construir configuración completa de módulos
    const modulesConfig = {};
    Object.keys(securityModulesRules).forEach(key => {
        const module = securityModulesRules[key];
        const checkbox = document.querySelector(`input[data-module="${key}"]`);
        const enabled = checkbox ? checkbox.checked : true;
        
        modulesConfig[key] = {
            enabled: enabled,
            rules: {}
        };
        
        module.rules.forEach(rule => {
            modulesConfig[key].rules[rule.id] = rule.enabled;
        });
    });
    
    try {
        // Si hay agente seleccionado, guardar para ese agente
        if (selectedAgent) {
            const response = await fetch(`${API_URL}/agent/modules/${selectedAgent.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modules: modulesConfig })
            });
            
            if (response.ok) {
                showNotification(`Configuración guardada para ${selectedAgent.hostname}`, 'success');
            } else {
                throw new Error('Error del servidor');
            }
        } else {
            // Guardar como configuración global
            const response = await fetch(`${API_URL}/agent/modules/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modules: modulesConfig })
            });
            
            if (response.ok) {
                const data = await response.json();
                showNotification(`Configuración aplicada a ${data.synced_agents?.length || 0} agentes`, 'success');
            } else {
                throw new Error('Error del servidor');
            }
        }
    } catch (err) {
        console.error('Error guardando módulos:', err);
        showNotification('Error al guardar configuración: ' + err.message, 'error');
    }
}

// Sincronizar módulos con todos los agentes activos
async function syncAgentModules() {
    showNotification('Sincronizando con agentes activos...', 'info');
    
    // Construir configuración actual
    const modulesConfig = {};
    Object.keys(securityModulesRules).forEach(key => {
        const module = securityModulesRules[key];
        const checkbox = document.querySelector(`input[data-module="${key}"]`);
        
        modulesConfig[key] = {
            enabled: checkbox ? checkbox.checked : true,
            rules: {}
        };
        
        module.rules.forEach(rule => {
            modulesConfig[key].rules[rule.id] = rule.enabled;
        });
    });
    
    try {
        const response = await fetch(`${API_URL}/agent/modules/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modules: modulesConfig })
        });
        
        if (response.ok) {
            const data = await response.json();
            const agentCount = data.synced_agents?.length || 0;
            
            if (agentCount > 0) {
                showNotification(`✓ Sincronizado con ${agentCount} agente(s) activo(s)`, 'success');
                
                // Mostrar detalles
                if (data.synced_agents) {
                    console.log('Agentes sincronizados:', data.synced_agents.map(a => a.hostname));
                }
            } else {
                showNotification('No hay agentes activos para sincronizar', 'warning');
            }
        } else {
            throw new Error('Error del servidor');
        }
    } catch (err) {
        console.error('Error sincronizando:', err);
        showNotification('Error al sincronizar: ' + err.message, 'error');
    }
}

// Cargar eventos del agente seleccionado
async function loadAgentEvents() {
    if (!selectedAgent) return;
    
    try {
        const response = await fetch(`${API_URL}/agent/modules/events/${selectedAgent.id}`);
        if (response.ok) {
            const data = await response.json();
            displayAgentEvents(data.events || []);
        }
    } catch (err) {
        console.error('Error cargando eventos:', err);
    }
}

// Mostrar eventos en el tab de Eventos
function displayAgentEvents(events) {
    const container = document.querySelector('#agent-config-modal [data-tab-content="eventos"]');
    if (!container) return;
    
    if (events.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <span class="material-symbols-outlined text-4xl mb-2">event_busy</span>
                <p>No hay eventos recientes</p>
            </div>
        `;
        return;
    }
    
    const severityColors = {
        critical: 'bg-red-500/20 text-red-400 border-red-500/30',
        high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    
    container.innerHTML = events.map(event => `
        <div class="p-3 bg-[#1c2127] rounded-lg mb-2 border ${severityColors[event.severity] || 'border-gray-600'}">
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg ${event.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}">
                        ${event.severity === 'critical' ? 'error' : 'warning'}
                    </span>
                    <span class="text-white font-medium">${event.description}</span>
                </div>
                <span class="text-xs text-gray-500">${new Date(event.timestamp).toLocaleString()}</span>
            </div>
            <div class="mt-2 flex gap-2">
                <span class="text-xs px-2 py-1 bg-[#283039] rounded text-gray-300">${event.module}</span>
                <span class="text-xs px-2 py-1 bg-[#283039] rounded text-gray-300">${event.action || 'detected'}</span>
            </div>
        </div>
    `).join('');
}

function showNotification(message, type = 'info') {
    const colors = { 
        success: 'bg-green-500', 
        error: 'bg-red-500', 
        warning: 'bg-yellow-500', 
        info: 'bg-blue-500' 
    };
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-2`;
    notification.innerHTML = `<span class="material-symbols-outlined">info</span> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Cargar agentes desde API
async function loadAgents() {
    try {
        const response = await fetch(`${API_URL}/assets`);
        if (response.ok) {
            const data = await response.json();
            const assets = data.assets || [];
            const agents = assets.map(asset => ({
                id: asset.id,
                hostname: asset.hostname || asset.agent_name || 'Unknown',
                ip: asset.ip || 'N/A',
                os: asset.os || 'Unknown',
                online: asset.status === 'Active',
                last_seen: asset.last_seen ? new Date(asset.last_seen).toLocaleString() : 'Never'
            }));
            updateAgentsTable(agents);
            updateAgentsStats(agents);
        }
    } catch (err) {
        console.error('Error cargando agentes:', err);
    }
}

function updateAgentsTable(agents) {
    const tbody = document.getElementById('agents-table-body');
    if (!tbody) return;
    if (!agents.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-3 text-center text-[#9dabb9]">No hay agentes registrados</td></tr>';
        return;
    }
    tbody.innerHTML = agents.map(agent => `
        <tr class="border-b border-[#283039] hover:bg-[#1c2127]">
            <td class="px-4 py-3 text-white font-medium">${agent.hostname}</td>
            <td class="px-4 py-3 text-[#9dabb9]">${agent.ip}</td>
            <td class="px-4 py-3 text-[#9dabb9]">${agent.os}</td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${agent.online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                    <span class="w-2 h-2 rounded-full ${agent.online ? 'bg-green-500' : 'bg-red-500'}"></span>
                    ${agent.online ? 'Online' : 'Offline'}
                </span>
            </td>
            <td class="px-4 py-3 text-[#9dabb9]">${agent.last_seen}</td>
            <td class="px-4 py-3">
                <button onclick="openAgentConfig('${agent.id}')" class="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary/90">Configurar</button>
            </td>
        </tr>
    `).join('');
}

function updateAgentsStats(agents) {
    const online = agents.filter(a => a.online).length;
    const offline = agents.filter(a => !a.online).length;
    const el = (id) => document.getElementById(id);
    if (el('agents-online')) el('agents-online').textContent = online;
    if (el('agents-offline')) el('agents-offline').textContent = offline;
    if (el('agents-warnings')) el('agents-warnings').textContent = 0;
    if (el('agents-protected')) el('agents-protected').textContent = online;
}

// Cargar agentes cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    loadAgents();
    setInterval(loadAgents, 10000);
    updateModulesDisplay();
    setupModuleToggles();
});

// Configurar event listeners para los toggles de módulos
function setupModuleToggles() {
    const moduleCheckboxes = document.querySelectorAll('input[data-module]');
    moduleCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const moduleKey = this.dataset.module;
            const enabled = this.checked;
            toggleModule(moduleKey, enabled);
        });
    });
}

// ==========================================
// CÓDIGO ORIGINAL
// ==========================================

// Navegación entre secciones
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.menu-item').forEach(i => {
            i.classList.remove('bg-primary/20', 'text-primary');
            i.querySelector('p').classList.remove('text-primary');
            i.querySelector('p').classList.add('text-white');
        });
        item.classList.add('bg-primary/20', 'text-primary');
        item.querySelector('p').classList.add('text-primary');
        item.querySelector('p').classList.remove('text-white');
        
        const section = item.dataset.section;
        document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
        document.getElementById(`section-${section}`).classList.remove('hidden');
        
        // Cargar datos según la sección
        if (section === 'model') {
            loadCurrentModelInfo();
            loadModelHistory();
        } else if (section === 'assets') {
            loadAssets();
            loadTags();
        } else if (section === 'agents') {
            loadAgents();
        }
    });
});

// Modal agregar conector
document.getElementById('add-connector-btn').addEventListener('click', () => {
    document.getElementById('add-connector-modal').classList.remove('hidden');
});

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('add-connector-modal').classList.add('hidden');
});

document.getElementById('cancel-connector').addEventListener('click', () => {
    document.getElementById('add-connector-modal').classList.add('hidden');
});

document.getElementById('save-connector').addEventListener('click', async () => {
    const name = document.getElementById('connector-name').value;
    const url = document.getElementById('connector-url').value;
    const port = document.getElementById('connector-port').value;
    const token = document.getElementById('connector-token').value;
    
    if (!name || !url) {
        alert('Por favor complete los campos requeridos');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8000/settings/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url, port, token })
        });
        
        if (response.ok) {
            alert('Conector agregado exitosamente');
            document.getElementById('add-connector-modal').classList.add('hidden');
            location.reload();
        }
    } catch (err) {
        alert('Error al agregar conector: ' + err.message);
    }
});

// Gestión de modelos - Mejorado
document.querySelector('[data-action="reload"]').addEventListener('click', async () => {
    const button = event.target.closest('button');
    button.disabled = true;
    button.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 20px;">refresh</span><span>Recargando...</span>';
    
    try {
        const response = await fetch('http://localhost:8000/settings/model/reload', { method: 'POST' });
        if (response.ok) {
            showNotification('Modelo recargado', 'El modelo de IA se ha recargado correctamente', 'success');
            setTimeout(() => location.reload(), 2000);
        } else {
            throw new Error('Error al recargar el modelo');
        }
    } catch (err) {
        showNotification('Error', err.message, 'error');
        button.disabled = false;
        button.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">refresh</span><span>Recargar Modelo</span>';
    }
});

document.querySelector('[data-action="check"]').addEventListener('click', async () => {
    const button = event.target.closest('button');
    button.disabled = true;
    button.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 20px;">sync</span><span>Verificando...</span>';
    
    try {
        const response = await fetch('http://localhost:8000/settings/model');
        const data = await response.json();
        
        const message = `
            <div class="space-y-2">
                <p><strong>Dataset:</strong> ${data.dataset}</p>
                <p><strong>Precisión:</strong> ${data.accuracy}</p>
                <p><strong>Último entrenamiento:</strong> ${data.last_training}</p>
                <p><strong>Estado:</strong> ${data.status}</p>
            </div>
        `;
        
        showModalInfo('Estado del Modelo', message);
        
    } catch (err) {
        showNotification('Error', err.message, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">info</span><span>Revisar Estado</span>';
    }
});

// Manejo de carga de archivo de modelo
const modelFileInput = document.getElementById('model-file');
const uploadModelBtn = document.getElementById('upload-model-btn');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const cancelUpload = document.getElementById('cancel-upload');

modelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        if (file.size > 500 * 1024 * 1024) { // 500MB
            showNotification('Archivo demasiado grande', 'El archivo no debe superar los 500MB', 'error');
            modelFileInput.value = '';
            return;
        }
        
        fileName.textContent = file.name;
        fileSize.textContent = `${sizeMB} MB`;
        fileInfo.classList.remove('hidden');
        uploadModelBtn.disabled = false;
    }
});

cancelUpload.addEventListener('click', () => {
    modelFileInput.value = '';
    fileInfo.classList.add('hidden');
    uploadModelBtn.disabled = true;
});

uploadModelBtn.addEventListener('click', async () => {
    const fileInput = document.getElementById('model-file');
    if (!fileInput.files[0]) {
        showNotification('Error', 'Por favor seleccione un archivo', 'error');
        return;
    }
    
    uploadModelBtn.disabled = true;
    uploadModelBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 20px;">sync</span><span>Cargando...</span>';
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const response = await fetch('http://localhost:8000/settings/model/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showNotification('Modelo cargado', 'El modelo se ha cargado exitosamente', 'success');
            setTimeout(() => location.reload(), 2000);
        } else {
            const error = await response.json();
            console.error('Error del servidor:', error);
            throw new Error(error.detail || error.message || 'Error al cargar el modelo');
        }
    } catch (err) {
        console.error('Error completo:', err);
        showNotification('Error', err.message, 'error');
        uploadModelBtn.disabled = false;
        uploadModelBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">upload</span><span>Cargar Modelo</span>';
    }
});

// Gestión de usuarios - Mejorado
let users = [];

async function loadUsers() {
    try {
        const response = await fetch('http://localhost:8000/settings/users');
        const data = await response.json();
        users = data.users || [];
        renderUsersTable();
    } catch (err) {
        console.error('Error cargando usuarios:', err);
        // Cargar usuarios por defecto si falla la API
        users = [
            { id: '1', username: 'admin', email: 'admin@threatguard.local', full_name: 'Administrator', is_admin: true, is_active: true, created_at: '2024-01-15' },
            { id: '2', username: 'analyst', email: 'analyst@threatguard.local', full_name: 'Security Analyst', is_admin: false, is_active: true, created_at: '2024-03-20' }
        ];
        renderUsersTable();
    }
}

function renderUsersTable() {
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = users.map(user => {
        const roleDisplay = user.is_admin ? 'Admin' : 'Usuario';
        const roleColor = user.is_admin ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400';
        const statusColor = user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400';
        const statusText = user.is_active ? 'Activo' : 'Inactivo';
        
        return `
            <tr class="border-t border-[#3b4754] hover:bg-[#1c2127] transition-colors">
                <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">person</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">${user.username}</p>
                            <p class="text-[#9dabb9] text-xs">${user.full_name || user.username}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4 text-[#9dabb9]">${user.email}</td>
                <td class="px-4 py-4">
                    <span class="px-3 py-1 ${roleColor} rounded-full text-xs font-medium">${roleDisplay}</span>
                </td>
                <td class="px-4 py-4">
                    <span class="px-3 py-1 ${statusColor} rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <span class="w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-500'}"></span>
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-4 text-[#9dabb9] text-sm">${user.created_at || 'N/A'}</td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                        <button onclick="editUser('${user.id}')" class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                            <span class="material-symbols-outlined" style="font-size: 20px;">edit</span>
                        </button>
                        <button onclick="toggleUserStatus('${user.id}')" class="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors" title="Suspender/Activar">
                            <span class="material-symbols-outlined" style="font-size: 20px;">${user.is_active ? 'block' : 'check_circle'}</span>
                        </button>
                        <button onclick="deleteUser('${user.id}')" class="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Eliminar">
                            <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updateUserStats();
}

function updateUserStats() {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const adminUsers = users.filter(u => u.is_admin).length;
    
    const totalEl = document.getElementById('total-users');
    const activeEl = document.getElementById('active-users');
    const adminEl = document.getElementById('admin-users');
    
    if (totalEl) totalEl.textContent = totalUsers;
    if (activeEl) activeEl.textContent = activeUsers;
    if (adminEl) adminEl.textContent = adminUsers;
}

// Búsqueda de usuarios
const searchInput = document.getElementById('search-users');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filteredUsers = users.filter(user => 
            user.username.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        );
        
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) return;
        
        if (filteredUsers.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-[#9dabb9]">
                        <span class="material-symbols-outlined text-5xl mb-2">search_off</span>
                        <p>No se encontraron usuarios</p>
                    </td>
                </tr>
            `;
        } else {
            const tempUsers = [...users];
            users = filteredUsers;
            renderUsersTable();
            users = tempUsers;
        }
    });
}

// Agregar usuario
document.addEventListener('click', (e) => {
    if (e.target.id === 'add-user-btn' || e.target.closest('#add-user-btn')) {
        showUserModal();
    }
});

function showUserModal(user = null) {
    const isEdit = user !== null;
    const modal = document.createElement('div');
    modal.id = 'user-modal';
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-[#1c2127] rounded-xl border border-[#3b4754] p-6 w-full max-w-lg shadow-2xl">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-white text-xl font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">${isEdit ? 'edit' : 'person_add'}</span>
                    ${isEdit ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}
                </h3>
                <button onclick="document.getElementById('user-modal').remove()" class="text-[#9dabb9] hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <form id="user-form" class="space-y-4">
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Nombre de Usuario</label>
                    <input 
                        type="text" 
                        id="user-username" 
                        value="${user?.username || ''}"
                        placeholder="Ej: jdoe" 
                        class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary"
                        required
                    >
                </div>
                
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Email</label>
                    <input 
                        type="email" 
                        id="user-email" 
                        value="${user?.email || ''}"
                        placeholder="usuario@ejemplo.com" 
                        class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary"
                        required
                    >
                </div>
                
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Nombre Completo</label>
                    <input 
                        type="text" 
                        id="user-fullname" 
                        value="${user?.full_name || ''}"
                        placeholder="Ej: John Doe" 
                        class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary"
                    >
                </div>
                
                ${!isEdit ? `
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Contraseña</label>
                    <input 
                        type="password" 
                        id="user-password" 
                        placeholder="••••••••" 
                        class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary"
                        required
                    >
                </div>
                ` : ''}
                
                <div>
                    <label class="text-white text-sm font-medium mb-2 flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="user-isadmin" 
                            ${user?.is_admin ? 'checked' : ''}
                            class="w-4 h-4 text-primary bg-[#283039] border-[#3b4754] rounded focus:ring-primary"
                        >
                        <span>Es Administrador</span>
                    </label>
                </div>
                
                <div>
                    <label class="text-white text-sm font-medium mb-2 flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="user-isactive" 
                            ${user?.is_active !== false ? 'checked' : ''}
                            class="w-4 h-4 text-primary bg-[#283039] border-[#3b4754] rounded focus:ring-primary"
                        >
                        <span>Cuenta Activa</span>
                    </label>
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button 
                        type="submit" 
                        class="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <span class="material-symbols-outlined" style="font-size: 20px;">${isEdit ? 'save' : 'person_add'}</span>
                        ${isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
                    </button>
                    <button 
                        type="button"
                        onclick="document.getElementById('user-modal').remove()" 
                        class="px-4 py-3 bg-[#283039] text-white rounded-lg hover:bg-[#3b4754] transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            username: document.getElementById('user-username').value,
            email: document.getElementById('user-email').value,
            full_name: document.getElementById('user-fullname').value,
            is_admin: document.getElementById('user-isadmin').checked,
            is_active: document.getElementById('user-isactive').checked
        };
        
        if (!isEdit) {
            userData.password = document.getElementById('user-password').value;
        }
        
        try {
            const url = isEdit 
                ? `http://localhost:8000/settings/users/${user.id}` 
                : 'http://localhost:8000/settings/users';
            
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                showNotification(
                    isEdit ? 'Usuario actualizado' : 'Usuario creado',
                    `El usuario ${userData.username} ha sido ${isEdit ? 'actualizado' : 'creado'} correctamente`,
                    'success'
                );
                modal.remove();
                loadUsers();
            } else {
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Error en la operación');
            }
        } catch (err) {
            showNotification('Error', err.message, 'error');
        }
    });
}

async function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        showUserModal(user);
    }
}

async function toggleUserStatus(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = !user.is_active;
    
    try {
        const response = await fetch(`http://localhost:8000/settings/users/${userId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus })
        });
        
        if (response.ok) {
            showNotification(
                'Estado actualizado',
                `El usuario ${user.username} ha sido ${newStatus ? 'activado' : 'suspendido'}`,
                'success'
            );
            loadUsers();
        } else {
            throw new Error('Error al actualizar el estado');
        }
    } catch (err) {
        showNotification('Error', err.message, 'error');
    }
}

async function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (user.is_admin) {
        showNotification('Operación no permitida', 'No se puede eliminar un usuario Admin', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-[#1c2127] rounded-xl border border-[#3b4754] p-6 w-full max-w-md shadow-2xl">
            <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-red-400 text-4xl">warning</span>
                <h3 class="text-white text-xl font-bold">Confirmar Eliminación</h3>
            </div>
            <p class="text-[#9dabb9] mb-6">
                ¿Está seguro que desea eliminar al usuario <strong class="text-white">${user.username}</strong>? 
                Esta acción no se puede deshacer.
            </p>
            <div class="flex gap-3">
                <button id="confirm-delete" class="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
                    Eliminar
                </button>
                <button onclick="this.closest('.fixed').remove()" class="flex-1 px-4 py-3 bg-[#283039] text-white rounded-lg hover:bg-[#3b4754] transition-colors font-medium">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirm-delete').addEventListener('click', async () => {
        try {
            const response = await fetch(`http://localhost:8000/settings/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Usuario eliminado', `El usuario ${user.username} ha sido eliminado`, 'success');
                modal.remove();
                loadUsers();
            } else {
                throw new Error('Error al eliminar el usuario');
            }
        } catch (err) {
            showNotification('Error', err.message, 'error');
        }
    });
}

// Cargar usuarios al iniciar
loadUsers();

// Probar conexión de integraciones
document.querySelectorAll('[data-integration] button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        const integration = e.target.closest('[data-integration]').dataset.integration;
        const statusDot = e.target.closest('[data-integration]').querySelector('.status-dot');
        const statusText = e.target.closest('[data-integration]').querySelector('.status-text');
        
        // Mostrar estado de prueba
        button.disabled = true;
        button.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span><span class="truncate">Probando...</span>';
        statusDot.className = 'status-dot w-2 h-2 rounded-full bg-blue-500 animate-pulse';
        statusText.className = 'status-text text-blue-400 text-sm font-normal leading-normal';
        statusText.textContent = 'Probando conexión...';
        
        try {
            const response = await fetch(`http://localhost:8000/settings/integrations/${integration}/test`);
            const data = await response.json();
            
            button.innerHTML = '<span class="truncate">Probar Conexión</span>';
            button.disabled = false;
            
            if (data.status === 'success') {
                statusDot.className = 'status-dot w-2 h-2 rounded-full bg-green-500';
                statusText.className = 'status-text text-green-400 text-sm font-normal leading-normal';
                statusText.textContent = '✓ Conectado';
                
                // Mostrar mensaje de éxito
                showNotification('Conexión exitosa', data.message, 'success');
            } else {
                statusDot.className = 'status-dot w-2 h-2 rounded-full bg-red-500';
                statusText.className = 'status-text text-red-400 text-sm font-normal leading-normal';
                statusText.textContent = '✗ Error de conexión';
                
                // Mostrar mensaje de error
                showNotification('Error de conexión', data.message, 'error');
            }
        } catch (err) {
            button.innerHTML = '<span class="truncate">Probar Conexión</span>';
            button.disabled = false;
            
            statusDot.className = 'status-dot w-2 h-2 rounded-full bg-red-500';
            statusText.className = 'status-text text-red-400 text-sm font-normal leading-normal';
            statusText.textContent = '✗ Error de conexión';
            
            // Mostrar mensaje de error
            showNotification('Error de conexión', err.message || 'No se pudo conectar al servidor', 'error');
        }
    });
});

// Cargar estado inicial de integraciones
async function loadIntegrationsStatus() {
    const integrations = ['openvas', 'postgresql'];
    
    for (const integration of integrations) {
        try {
            const response = await fetch(`http://localhost:8000/settings/integrations/${integration}/test`);
            const data = await response.json();
            
            const integrationElement = document.querySelector(`[data-integration="${integration}"]`);
            if (integrationElement) {
                const statusDot = integrationElement.querySelector('.status-dot');
                const statusText = integrationElement.querySelector('.status-text');
                
                if (data.status === 'success') {
                    statusDot.className = 'status-dot w-2 h-2 rounded-full bg-green-500';
                    statusText.className = 'status-text text-green-400 text-sm font-normal leading-normal';
                    statusText.textContent = '✓ Conectado';
                } else {
                    statusDot.className = 'status-dot w-2 h-2 rounded-full bg-red-500';
                    statusText.className = 'status-text text-red-400 text-sm font-normal leading-normal';
                    statusText.textContent = '✗ Desconectado';
                }
            }
        } catch (err) {
            const integrationElement = document.querySelector(`[data-integration="${integration}"]`);
            if (integrationElement) {
                const statusDot = integrationElement.querySelector('.status-dot');
                const statusText = integrationElement.querySelector('.status-text');
                
                statusDot.className = 'status-dot w-2 h-2 rounded-full bg-gray-500';
                statusText.className = 'status-text text-gray-400 text-sm font-normal leading-normal';
                statusText.textContent = '? No verificado';
            }
        }
    }
}

// Función para mostrar notificaciones
function showNotification(title, message, type = 'info') {
    const notificationDiv = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notificationDiv.className = `fixed bottom-8 right-8 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md`;
    notificationDiv.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
            <div>
                <p class="font-bold">${title}</p>
                <p class="text-sm opacity-90">${message}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(notificationDiv);
    
    setTimeout(() => {
        notificationDiv.style.transition = 'opacity 0.3s ease-out';
        notificationDiv.style.opacity = '0';
        setTimeout(() => notificationDiv.remove(), 300);
    }, 4000);
}

// Función para mostrar modal de información
function showModalInfo(title, content) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-[#1c2127] rounded-xl border border-[#3b4754] p-6 w-full max-w-md shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-white text-xl font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">info</span>
                    ${title}
                </h3>
                <button onclick="this.closest('.fixed').remove()" class="text-[#9dabb9] hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="text-[#9dabb9]">
                ${content}
            </div>
            <button onclick="this.closest('.fixed').remove()" class="mt-6 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Cerrar
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

loadIntegrationsStatus();

// ============== GESTIÓN DE TAGS Y ACTIVOS ==============

let assets = [];
let tags = [];
let filteredAssets = [];

// Manejo de tabs
document.getElementById('tab-assets')?.addEventListener('click', () => {
    document.getElementById('tab-assets').classList.add('text-primary', 'border-primary', 'border-b-2');
    document.getElementById('tab-assets').classList.remove('text-[#9dabb9]');
    document.getElementById('tab-tags').classList.remove('text-primary', 'border-primary', 'border-b-2');
    document.getElementById('tab-tags').classList.add('text-[#9dabb9]');
    document.getElementById('panel-assets').classList.remove('hidden');
    document.getElementById('panel-tags').classList.add('hidden');
});

document.getElementById('tab-tags')?.addEventListener('click', () => {
    document.getElementById('tab-tags').classList.add('text-primary', 'border-primary', 'border-b-2');
    document.getElementById('tab-tags').classList.remove('text-[#9dabb9]');
    document.getElementById('tab-assets').classList.remove('text-primary', 'border-primary', 'border-b-2');
    document.getElementById('tab-assets').classList.add('text-[#9dabb9]');
    document.getElementById('panel-tags').classList.remove('hidden');
    document.getElementById('panel-assets').classList.add('hidden');
});

// Cargar activos
async function loadAssets() {
    try {
        const response = await fetch('http://localhost:8000/settings/assets');
        const data = await response.json();
        assets = data.assets || [];
        filteredAssets = [...assets];
        renderAssetsTable();
    } catch (err) {
        console.error('Error cargando activos:', err);
        assets = [];
        renderAssetsTable();
    }
}

// Renderizar tabla de activos
function renderAssetsTable() {
    const assetsTableBody = document.getElementById('assets-table-body');
    if (!assetsTableBody) return;
    
    if (filteredAssets.length === 0) {
        assetsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-[#9dabb9]">
                    <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-4xl">devices</span>
                        <p>No hay activos que coincidan con los filtros</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    assetsTableBody.innerHTML = filteredAssets.map(asset => {
        // Normalizar OS
        const normalizedOS = normalizeOS(asset.os_type);
        const osIcons = {
            'windows': 'computer',
            'linux': 'terminal',
            'macos': 'laptop_mac'
        };
        const osNames = {
            'windows': 'Windows',
            'linux': 'Linux',
            'macos': 'macOS'
        };
        
        const riskColors = {
            low: 'bg-green-500/20 text-green-400',
            medium: 'bg-yellow-500/20 text-yellow-400',
            high: 'bg-red-500/20 text-red-400'
        };
        
        const riskLevel = asset.risk_score < 30 ? 'low' : asset.risk_score < 60 ? 'medium' : 'high';
        const riskText = asset.risk_score < 30 ? 'Bajo' : asset.risk_score < 60 ? 'Medio' : 'Alto';
        
        // Estado online/offline
        const isOnline = asset.status === 'online';
        const statusText = isOnline ? 'Online' : 'Offline';
        
        // Formatear versión del OS
        const osDisplay = osNames[normalizedOS] || asset.os_type || 'Desconocido';
        const osVersion = asset.os_version || '';
        
        return `
            <tr class="border-t border-[#3b4754] hover:bg-[#1c2127] transition-colors">
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}"></span>
                        <span class="text-xs ${isOnline ? 'text-green-400' : 'text-gray-400'}">${statusText}</span>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">${osIcons[normalizedOS] || 'devices'}</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">${asset.hostname}</p>
                            <p class="text-[#9dabb9] text-xs">${statusText.toLowerCase()}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <p class="text-white text-sm">${asset.ip_address || 'N/A'}</p>
                    <p class="text-[#9dabb9] text-xs">${asset.mac_address || 'N/A'}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="text-white text-sm">${osDisplay}</p>
                    <p class="text-[#9dabb9] text-xs">${osVersion}</p>
                </td>
                <td class="px-4 py-4">
                    <div class="space-y-1">
                        ${asset.antivirus_active ? `
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                <span class="text-white text-xs">Antivirus Activo</span>
                            </div>
                        ` : `
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                <span class="text-[#9dabb9] text-xs">Sin Antivirus</span>
                            </div>
                        `}
                        ${asset.telemetry_enabled ? `
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
                                <span class="text-white text-xs">Telemetría Activa</span>
                            </div>
                        ` : `
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                                <span class="text-[#9dabb9] text-xs">Sin Telemetría</span>
                            </div>
                        `}
                    </div>
                </td>
                <td class="px-4 py-4">
                    <div class="flex flex-wrap gap-1">
                        ${asset.tags && asset.tags.length > 0 ? asset.tags.map(tag => `
                            <span class="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style="background-color: ${tag.color}20; color: ${tag.color}">
                                ${tag.name}
                                <button onclick="removeTagFromAsset('${asset.id}', '${tag.id}')" class="hover:opacity-70">
                                    <span class="material-symbols-outlined" style="font-size: 14px;">close</span>
                                </button>
                            </span>
                        `).join('') : '<span class="text-[#9dabb9] text-xs">Sin tags</span>'}
                        <button onclick="showAssignTagModal('${asset.id}')" class="px-2 py-1 text-primary hover:bg-primary/10 rounded-full text-xs">
                            <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
                        </button>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <span class="px-3 py-1 ${riskColors[riskLevel]} rounded-full text-xs font-medium">
                        ${riskText} (${asset.risk_score || 0})
                    </span>
                </td>
                <td class="px-4 py-4">
                    <div class="flex gap-2">
                        <button onclick="checkAssetCompliance('${asset.id}')" class="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" title="Verificar cumplimiento">
                            <span class="material-symbols-outlined" style="font-size: 20px;">verified</span>
                        </button>
                        <button onclick="showAssetDetails('${asset.id}')" class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Ver detalles">
                            <span class="material-symbols-outlined" style="font-size: 20px;">info</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Cargar tags
async function loadTags() {
    try {
        const response = await fetch('http://localhost:8000/settings/tags');
        const data = await response.json();
        tags = data.tags || [];
        renderTagsGrid();
    } catch (err) {
        console.error('Error cargando tags:', err);
        tags = [];
        renderTagsGrid();
    }
}

// Renderizar grid de tags
function renderTagsGrid() {
    const tagsGrid = document.getElementById('tags-grid');
    if (!tagsGrid) return;
    
    if (tags.length === 0) {
        tagsGrid.innerHTML = `
            <div class="col-span-3 bg-[#111418] border border-[#3b4754] rounded-xl p-12 text-center">
                <span class="material-symbols-outlined text-6xl text-[#9dabb9] mb-4">label_off</span>
                <p class="text-[#9dabb9] text-lg mb-2">No hay tags creados</p>
                <p class="text-[#9dabb9] text-sm">Cree su primer tag para organizar sus activos</p>
            </div>
        `;
        return;
    }
    
    tagsGrid.innerHTML = tags.map(tag => {
        const categoryIcons = {
            'system': 'computer',
            'security': 'shield',
            'compliance': 'verified',
            'custom': 'label'
        };
        
        return `
            <div class="bg-[#111418] border border-[#3b4754] rounded-xl p-6 hover:border-[#3b4754]/60 transition-colors">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-lg flex items-center justify-center" style="background-color: ${tag.color}20">
                            <span class="material-symbols-outlined text-2xl" style="color: ${tag.color}">${categoryIcons[tag.category] || 'label'}</span>
                        </div>
                        <div>
                            <h3 class="text-white font-semibold">${tag.name}</h3>
                            <p class="text-[#9dabb9] text-xs">${tag.category}</p>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        ${tag.auto_assign ? '<span class="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">Auto</span>' : ''}
                    </div>
                </div>
                <p class="text-[#9dabb9] text-sm mb-4">${tag.description || 'Sin descripción'}</p>
                <div class="flex items-center justify-between">
                    <span class="text-[#9dabb9] text-sm">${tag.asset_count || 0} activos</span>
                    <button onclick="deleteTag('${tag.id}')" class="p-1 text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Eliminar">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Auto-tag
document.getElementById('auto-tag-btn')?.addEventListener('click', async () => {
    const button = event.target.closest('button');
    button.disabled = true;
    button.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 20px;">refresh</span><span>Aplicando...</span>';
    
    try {
        const response = await fetch('http://localhost:8000/settings/assets/auto-tag', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Auto-tag completado', data.message, 'success');
            loadAssets();
        } else {
            throw new Error(data.detail || 'Error al aplicar auto-tag');
        }
    } catch (err) {
        showNotification('Error', err.message, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">auto_fix_high</span><span>Auto-Tag</span>';
    }
});

// Refresh assets
document.getElementById('refresh-assets-btn')?.addEventListener('click', () => {
    loadAssets();
    showNotification('Actualizado', 'Lista de activos actualizada', 'success');
});

// Filtros - Variables para mantener estado
let currentFilters = {
    os: '',
    antivirus: '',
    telemetry: ''
};

// Aplicar todos los filtros combinados
function applyFilters() {
    filteredAssets = assets.filter(asset => {
        // Filtro de Sistema Operativo
        if (currentFilters.os) {
            const assetOS = normalizeOS(asset.os_type);
            if (assetOS !== currentFilters.os) return false;
        }
        
        // Filtro de Antivirus
        if (currentFilters.antivirus !== '') {
            const hasAV = currentFilters.antivirus === 'true';
            if (asset.antivirus_active !== hasAV) return false;
        }
        
        // Filtro de Telemetría
        if (currentFilters.telemetry !== '') {
            const hasTelemetry = currentFilters.telemetry === 'true';
            if (asset.telemetry_enabled !== hasTelemetry) return false;
        }
        
        return true;
    });
    
    renderAssetsTable();
}

// Normalizar nombre de SO
function normalizeOS(osType) {
    if (!osType) return '';
    const os = osType.toLowerCase();
    if (os.includes('windows') || os === 'windows') return 'windows';
    if (os.includes('linux') || os === 'linux') return 'linux';
    if (os.includes('mac') || os.includes('darwin') || os === 'macos') return 'macos';
    return os;
}

document.getElementById('filter-os')?.addEventListener('change', (e) => {
    currentFilters.os = e.target.value;
    applyFilters();
});

document.getElementById('filter-antivirus')?.addEventListener('change', (e) => {
    currentFilters.antivirus = e.target.value;
    applyFilters();
});

document.getElementById('filter-telemetry')?.addEventListener('change', (e) => {
    currentFilters.telemetry = e.target.value;
    applyFilters();
});

// Crear tag
document.getElementById('add-tag-btn')?.addEventListener('click', () => {
    showTagModal();
});

function showTagModal(tag = null) {
    const isEdit = tag !== null;
    const modal = document.createElement('div');
    modal.id = 'tag-modal';
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-[#1c2127] rounded-xl border border-[#3b4754] p-6 w-full max-w-lg shadow-2xl">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-white text-xl font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">label</span>
                    ${isEdit ? 'Editar Tag' : 'Crear Nuevo Tag'}
                </h3>
                <button onclick="document.getElementById('tag-modal').remove()" class="text-[#9dabb9] hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <form id="tag-form" class="space-y-4">
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Nombre del Tag</label>
                    <input 
                        type="text" 
                        id="tag-name" 
                        value="${tag?.name || ''}"
                        placeholder="Ej: Servidor Crítico" 
                        class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary"
                        required
                    >
                </div>
                
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Color</label>
                    <input 
                        type="color" 
                        id="tag-color" 
                        value="${tag?.color || '#3B82F6'}"
                        class="w-full h-12 px-2 bg-[#283039] rounded-lg border border-[#3b4754] cursor-pointer"
                    >
                </div>
                
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Descripción</label>
                    <textarea 
                        id="tag-description" 
                        rows="3"
                        placeholder="Descripción del tag"
                        class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary"
                    >${tag?.description || ''}</textarea>
                </div>
                
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Categoría</label>
                    <select 
                        id="tag-category" 
                        class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary"
                    >
                        <option value="custom" ${tag?.category === 'custom' ? 'selected' : ''}>Personalizado</option>
                        <option value="system" ${tag?.category === 'system' ? 'selected' : ''}>Sistema</option>
                        <option value="security" ${tag?.category === 'security' ? 'selected' : ''}>Seguridad</option>
                        <option value="compliance" ${tag?.category === 'compliance' ? 'selected' : ''}>Cumplimiento</option>
                    </select>
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button 
                        type="submit" 
                        class="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                        ${isEdit ? 'Guardar Cambios' : 'Crear Tag'}
                    </button>
                    <button 
                        type="button"
                        onclick="document.getElementById('tag-modal').remove()" 
                        class="px-4 py-3 bg-[#283039] text-white rounded-lg hover:bg-[#3b4754] transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('tag-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tagData = {
            name: document.getElementById('tag-name').value,
            color: document.getElementById('tag-color').value,
            description: document.getElementById('tag-description').value,
            category: document.getElementById('tag-category').value
        };
        
        try {
            const response = await fetch('http://localhost:8000/settings/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tagData)
            });
            
            if (response.ok) {
                showNotification('Tag creado', `El tag "${tagData.name}" ha sido creado correctamente`, 'success');
                modal.remove();
                loadTags();
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Error al crear el tag');
            }
        } catch (err) {
            showNotification('Error', err.message, 'error');
        }
    });
}

async function deleteTag(tagId) {
    if (!confirm('¿Está seguro de eliminar este tag?')) return;
    
    try {
        const response = await fetch(`http://localhost:8000/settings/tags/${tagId}`, { method: 'DELETE' });
        
        if (response.ok) {
            showNotification('Tag eliminado', 'El tag ha sido eliminado correctamente', 'success');
            loadTags();
            loadAssets();
        } else {
            throw new Error('Error al eliminar el tag');
        }
    } catch (err) {
        showNotification('Error', err.message, 'error');
    }
}

// Asignar tag a activo
function showAssignTagModal(assetId) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    const availableTags = tags.filter(tag => !asset.tags.some(t => t.id === tag.id));
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-[#1c2127] rounded-xl border border-[#3b4754] p-6 w-full max-w-md shadow-2xl">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-white text-xl font-bold">Asignar Tag</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-[#9dabb9] hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <p class="text-[#9dabb9] mb-4">Seleccione un tag para <strong class="text-white">${asset.hostname}</strong></p>
            <div class="space-y-2 max-h-96 overflow-y-auto">
                ${availableTags.map(tag => `
                    <button onclick="assignTag('${assetId}', '${tag.id}')" class="w-full flex items-center gap-3 px-4 py-3 bg-[#283039] hover:bg-[#3b4754] rounded-lg transition-colors text-left">
                        <div class="w-8 h-8 rounded flex items-center justify-center" style="background-color: ${tag.color}20">
                            <span class="material-symbols-outlined" style="color: ${tag.color}; font-size: 20px;">label</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-white font-medium">${tag.name}</p>
                            <p class="text-[#9dabb9] text-xs">${tag.category}</p>
                        </div>
                    </button>
                `).join('')}
            </div>
            ${availableTags.length === 0 ? '<p class="text-[#9dabb9] text-center py-4">Todos los tags ya están asignados</p>' : ''}
        </div>
    `;
    document.body.appendChild(modal);
}

async function assignTag(assetId, tagId) {
    try {
        const response = await fetch(`http://localhost:8000/settings/assets/${assetId}/tags/${tagId}`, { method: 'POST' });
        
        if (response.ok) {
            showNotification('Tag asignado', 'El tag ha sido asignado correctamente', 'success');
            document.querySelector('.fixed.inset-0')?.remove();
            loadAssets();
        } else {
            throw new Error('Error al asignar el tag');
        }
    } catch (err) {
        showNotification('Error', err.message, 'error');
    }
}

async function removeTagFromAsset(assetId, tagId) {
    try {
        const response = await fetch(`http://localhost:8000/settings/assets/${assetId}/tags/${tagId}`, { method: 'DELETE' });
        
        if (response.ok) {
            showNotification('Tag removido', 'El tag ha sido removido correctamente', 'success');
            loadAssets();
        } else {
            throw new Error('Error al remover el tag');
        }
    } catch (err) {
        showNotification('Error', err.message, 'error');
    }
}

async function checkAssetCompliance(assetId) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    try {
        const response = await fetch(`http://localhost:8000/agent/check-compliance/${asset.hostname}`, { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            const statusColor = data.compliant ? 'text-green-400' : 'text-red-400';
            const statusIcon = data.compliant ? 'check_circle' : 'error';
            const statusText = data.compliant ? 'CUMPLE' : 'NO CUMPLE';
            
            const content = `
                <div class="space-y-4">
                    <div class="flex items-center gap-3 p-4 rounded-lg ${data.compliant ? 'bg-green-500/10' : 'bg-red-500/10'}">
                        <span class="material-symbols-outlined ${statusColor} text-4xl">${statusIcon}</span>
                        <div class="flex-1">
                            <p class="${statusColor} font-bold text-lg">${statusText}</p>
                            <p class="text-[#9dabb9] text-sm">${data.message}</p>
                        </div>
                    </div>
                    
                    <div class="bg-[#283039] p-4 rounded-lg">
                        <p class="text-white font-semibold mb-3">Estado del Agente:</p>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full ${data.checks.os_verified ? 'bg-green-500' : 'bg-red-500'}"></span>
                                <span class="text-white text-sm">Sistema Operativo: ${data.checks.os_verified ? 'Verificado' : 'No verificado'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full ${data.checks.antivirus_active ? 'bg-green-500' : 'bg-red-500'}"></span>
                                <span class="text-white text-sm">Antivirus: ${data.checks.antivirus_active ? 'Activo' : 'Inactivo'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full ${data.checks.telemetry_enabled ? 'bg-green-500' : 'bg-red-500'}"></span>
                                <span class="text-white text-sm">Telemetría: ${data.checks.telemetry_enabled ? 'Activa' : 'Inactiva'}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${!data.compliant && data.missing_requirements.length > 0 ? `
                        <div class="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                            <p class="text-red-400 font-semibold mb-2">⚠️ Requisitos faltantes:</p>
                            <ul class="list-disc list-inside space-y-1">
                                ${data.missing_requirements.map(req => `
                                    <li class="text-[#9dabb9] text-sm">${req}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="bg-[#283039] p-4 rounded-lg">
                        <p class="text-white font-semibold mb-2">Tags actuales:</p>
                        <div class="flex flex-wrap gap-2">
                            ${data.current_tags.map(tag => `
                                <span class="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="p-4 rounded-lg ${data.can_operate ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}">
                        <p class="${data.can_operate ? 'text-green-400' : 'text-red-400'} font-bold text-center">
                            ${data.can_operate ? '✓ Agente autorizado para operar' : '✗ Agente BLOQUEADO - No puede enviar datos'}
                        </p>
                    </div>
                </div>
            `;
            
            showModalInfo(`Verificación de Cumplimiento: ${asset.hostname}`, content);
        } else {
            throw new Error(data.detail || 'Error al verificar cumplimiento');
        }
    } catch (err) {
        showNotification('Error', err.message, 'error');
    }
}

function showAssetDetails(assetId) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    const content = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-[#9dabb9] text-sm">Hostname</p>
                    <p class="text-white font-medium">${asset.hostname}</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">IP Address</p>
                    <p class="text-white font-medium">${asset.ip_address || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">MAC Address</p>
                    <p class="text-white font-medium">${asset.mac_address || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">Sistema Operativo</p>
                    <p class="text-white font-medium">${asset.os_version || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">Antivirus</p>
                    <p class="text-white font-medium">${asset.antivirus_active ? asset.antivirus_name || 'Activo' : 'No instalado'}</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">Telemetría</p>
                    <p class="text-white font-medium">${asset.telemetry_enabled ? 'Habilitada' : 'Deshabilitada'}</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">Estado</p>
                    <p class="text-white font-medium">${asset.status}</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">Puntuación de Riesgo</p>
                    <p class="text-white font-medium">${asset.risk_score}/100</p>
                </div>
                <div>
                    <p class="text-[#9dabb9] text-sm">Última conexión</p>
                    <p class="text-white font-medium">${asset.last_seen || 'N/A'}</p>
                </div>
            </div>
            <div>
                <p class="text-[#9dabb9] text-sm mb-2">Tags asignados</p>
                <div class="flex flex-wrap gap-2">
                    ${asset.tags && asset.tags.length > 0 ? asset.tags.map(tag => `
                        <span class="px-3 py-1 rounded-full text-sm font-medium" style="background-color: ${tag.color}20; color: ${tag.color}">
                            ${tag.name}
                        </span>
                    `).join('') : '<span class="text-[#9dabb9]">Sin tags</span>'}
                </div>
            </div>
        </div>
    `;
    
    showModalInfo('Detalles del Activo', content);
}

// Cargar historial de modelos
async function loadModelHistory() {
    try {
        const response = await fetch('http://localhost:8000/settings/model/history');
        const data = await response.json();
        const models = data.models || [];
        
        const historyList = document.getElementById('model-history-list');
        if (!historyList) return;
        
        if (models.length === 0) {
            historyList.innerHTML = `
                <div class="bg-[#1c2127] p-6 rounded-lg border border-[#3b4754] text-center">
                    <p class="text-[#9dabb9]">No hay modelos en el historial</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = models.map(model => `
            <div class="bg-[#1c2127] p-4 rounded-lg border border-[#3b4754] hover:border-primary/50 transition-colors">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-primary text-2xl">model_training</span>
                        <div>
                            <p class="text-white font-semibold">${model.name}</p>
                            <p class="text-[#9dabb9] text-xs">${model.date}</p>
                        </div>
                    </div>
                    ${model.is_current ? '<span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Actual</span>' : ''}
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p class="text-[#9dabb9] text-xs">Precisión</p>
                        <p class="text-white font-medium">${model.accuracy}%</p>
                    </div>
                    <div>
                        <p class="text-[#9dabb9] text-xs">Tamaño</p>
                        <p class="text-white font-medium">${model.size_mb} MB</p>
                    </div>
                    <div>
                        <p class="text-[#9dabb9] text-xs">Clases</p>
                        <p class="text-white font-medium">${model.classes}</p>
                    </div>
                    <div>
                        <p class="text-[#9dabb9] text-xs">Predicciones</p>
                        <p class="text-white font-medium">${model.total_predictions}</p>
                    </div>
                </div>
                ${model.false_positive_rate > 0 ? `
                    <div class="mt-3 pt-3 border-t border-[#3b4754]">
                        <p class="text-[#9dabb9] text-xs">Tasa de Falsos Positivos</p>
                        <p class="text-yellow-400 font-medium">${model.false_positive_rate}%</p>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error('Error cargando historial de modelos:', err);
        const historyList = document.getElementById('model-history-list');
        if (historyList) {
            historyList.innerHTML = `
                <div class="bg-[#1c2127] p-6 rounded-lg border border-[#3b4754] text-center">
                    <p class="text-red-400">Error cargando historial</p>
                </div>
            `;
        }
    }
}

// Cargar información del modelo actual
async function loadCurrentModelInfo() {
    try {
        const response = await fetch('http://localhost:8000/settings/model');
        const data = await response.json();
        
        // Actualizar estado del modelo
        const statusEl = document.querySelector('[data-model-status]');
        if (statusEl) {
            statusEl.textContent = data.status || 'Desconocido';
        }
        
        // Actualizar dataset
        const datasetEl = document.querySelector('[data-model-dataset]');
        const datasetDescEl = document.querySelector('[data-model-dataset-desc]');
        if (datasetEl) datasetEl.textContent = data.dataset || 'N/A';
        if (datasetDescEl) datasetDescEl.textContent = `${data.classes || 0} clases, ${data.features || 0} características`;
        
        // Actualizar precisión
        const accuracyEl = document.querySelector('[data-model-accuracy]');
        const accuracyChangeEl = document.querySelector('[data-model-accuracy-change]');
        if (accuracyEl) accuracyEl.textContent = data.accuracy || 'N/A';
        if (accuracyChangeEl) accuracyChangeEl.textContent = 'Modelo entrenado';
        
        // Actualizar fecha de entrenamiento
        const trainingEl = document.querySelector('[data-model-last-training]');
        const trainingAgoEl = document.querySelector('[data-model-training-ago]');
        if (trainingEl) trainingEl.textContent = data.last_training || 'N/A';
        if (trainingAgoEl) trainingAgoEl.textContent = 'Último entrenamiento';
        
        // Actualizar tamaño y algoritmo
        const sizeEl = document.querySelector('[data-model-size]');
        const algorithmEl = document.querySelector('[data-model-algorithm]');
        if (sizeEl) sizeEl.textContent = 'Cargado';
        if (algorithmEl) algorithmEl.textContent = data.loaded ? 'En memoria' : 'No cargado';
    } catch (err) {
        console.error('Error cargando info del modelo:', err);
    }
}



