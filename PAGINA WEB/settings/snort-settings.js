// Snort IDS Settings Management
const API_URL = 'http://localhost:8000';

// Tab switching for Snort section
document.querySelectorAll('.snort-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.id.replace('tab-', 'panel-');
        
        // Update tabs
        document.querySelectorAll('.snort-tab').forEach(t => {
            t.classList.remove('text-primary', 'border-b-2', 'border-primary');
            t.classList.add('text-[#9dabb9]');
        });
        tab.classList.add('text-primary', 'border-b-2', 'border-primary');
        tab.classList.remove('text-[#9dabb9]');
        
        // Update panels
        document.querySelectorAll('.snort-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');
    });
});

// Load Snort rules
async function loadSnortRules() {
    try {
        const response = await fetch(`${API_URL}/snort/rules`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('snort-rules-editor').value = data.rules || '';
            document.getElementById('snort-rules-count').textContent = data.count || 0;
        }
    } catch (error) {
        console.error('Error loading Snort rules:', error);
    }
}

// Save Snort rules
document.getElementById('save-rules-btn')?.addEventListener('click', async () => {
    const rules = document.getElementById('snort-rules-editor').value;
    const btn = document.getElementById('save-rules-btn');
    const originalText = btn.textContent;
    
    btn.textContent = 'Guardando...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/snort/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules })
        });
        
        if (response.ok) {
            showNotification('Reglas guardadas correctamente', 'success');
            await loadSnortRules();
        } else {
            showNotification('Error al guardar reglas', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Validate rules
document.getElementById('validate-rules-btn')?.addEventListener('click', () => {
    const rules = document.getElementById('snort-rules-editor').value;
    const lines = rules.split('\n');
    let errors = [];
    
    lines.forEach((line, index) => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            if (!line.match(/^(alert|log|pass|drop|reject|sdrop)/)) {
                errors.push(`Línea ${index + 1}: Debe comenzar con una acción válida`);
            }
            if (!line.includes('sid:')) {
                errors.push(`Línea ${index + 1}: Falta el identificador 'sid:'`);
            }
        }
    });
    
    if (errors.length === 0) {
        showNotification('Sintaxis válida ✓', 'success');
    } else {
        showNotification(`Errores encontrados:\n${errors.slice(0, 3).join('\n')}`, 'error');
    }
});

// Reload rules from server
document.getElementById('reload-rules-btn')?.addEventListener('click', async () => {
    if (confirm('¿Recargar reglas desde el servidor? Los cambios no guardados se perderán.')) {
        await loadSnortRules();
        showNotification('Reglas recargadas', 'success');
    }
});

// Load Snort alerts
async function loadSnortAlerts() {
    try {
        const response = await fetch(`${API_URL}/api/snort/alerts?limit=50`);
        if (response.ok) {
            const data = await response.json();
            const tbody = document.getElementById('snort-alerts-table');
            
            if (data.alerts && data.alerts.length > 0) {
                tbody.innerHTML = data.alerts.map(alert => `
                    <tr class="border-b border-[#3b4754] hover:bg-[#1c2127]">
                        <td class="px-4 py-3 text-white text-sm">${new Date(alert.timestamp).toLocaleString()}</td>
                        <td class="px-4 py-3 text-white text-sm">${alert.message || alert.msg || '-'}</td>
                        <td class="px-4 py-3 text-white text-sm">${alert.src_ip || '-'}</td>
                        <td class="px-4 py-3 text-white text-sm">${alert.dst_ip || '-'}</td>
                        <td class="px-4 py-3 text-white text-sm">${alert.protocol || '-'}</td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-1 rounded text-xs ${
                                alert.priority === 1 ? 'bg-red-500/20 text-red-400' :
                                alert.priority === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                            }">
                                ${alert.priority === 1 ? 'Alta' : alert.priority === 2 ? 'Media' : 'Baja'}
                            </span>
                        </td>
                    </tr>
                `).join('');
                
                // Update today's count
                const today = new Date().toDateString();
                const todayCount = data.alerts.filter(a => 
                    new Date(a.timestamp).toDateString() === today
                ).length;
                document.getElementById('snort-alerts-today').textContent = todayCount;
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-[#9dabb9]">No hay alertas recientes</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading Snort alerts:', error);
    }
}

// Restart Snort
document.getElementById('restart-snort-btn')?.addEventListener('click', async () => {
    if (!confirm('¿Reiniciar el servicio de Snort IDS?')) return;
    
    const btn = document.getElementById('restart-snort-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span><span>Reiniciando...</span>';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/snort/restart`, { method: 'POST' });
        if (response.ok) {
            showNotification('Snort reiniciado correctamente', 'success');
            setTimeout(() => loadSnortAlerts(), 2000);
        } else {
            showNotification('Error al reiniciar Snort', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
});

// Initialize Snort section when selected
const snortMenuItem = document.querySelector('[data-section="snort"]');
if (snortMenuItem) {
    snortMenuItem.addEventListener('click', () => {
        loadSnortRules();
        loadSnortAlerts();
    });
}

// Auto-refresh alerts every 30 seconds
setInterval(() => {
    if (!document.getElementById('section-snort').classList.contains('hidden')) {
        loadSnortAlerts();
    }
}, 30000);

// Whitelist/Blocklist Management
let whitelist = [];
let blocklist = [];

async function loadLists() {
    try {
        const response = await fetch(`${API_URL}/snort/lists`);
        if (response.ok) {
            const data = await response.json();
            whitelist = data.whitelist || [];
            blocklist = data.blocklist || [];
            renderLists();
        }
    } catch (error) {
        console.error('Error loading lists:', error);
    }
}

function renderLists() {
    // Render whitelist
    const whitelistContainer = document.getElementById('whitelist-items');
    document.getElementById('whitelist-count').textContent = whitelist.length;
    
    if (whitelist.length === 0) {
        whitelistContainer.innerHTML = `
            <div class="text-center text-[#9dabb9] py-8">
                <span class="material-symbols-outlined text-4xl mb-2">shield_with_heart</span>
                <p>No hay entradas en la whitelist</p>
            </div>
        `;
    } else {
        whitelistContainer.innerHTML = whitelist.map((item, index) => `
            <div class="flex items-center justify-between p-3 bg-[#1c2127] rounded-lg border border-[#3b4754] hover:border-green-400 transition-colors">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-green-400" style="font-size: 20px;">check_circle</span>
                    <span class="text-white text-sm font-mono">${item}</span>
                </div>
                <button onclick="removeFromWhitelist(${index})" class="text-[#9dabb9] hover:text-red-400 transition-colors">
                    <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                </button>
            </div>
        `).join('');
    }
    
    // Render blocklist
    const blocklistContainer = document.getElementById('blocklist-items');
    document.getElementById('blocklist-count').textContent = blocklist.length;
    
    if (blocklist.length === 0) {
        blocklistContainer.innerHTML = `
            <div class="text-center text-[#9dabb9] py-8">
                <span class="material-symbols-outlined text-4xl mb-2">security</span>
                <p>No hay entradas en la blocklist</p>
            </div>
        `;
    } else {
        blocklistContainer.innerHTML = blocklist.map((item, index) => `
            <div class="flex items-center justify-between p-3 bg-[#1c2127] rounded-lg border border-[#3b4754] hover:border-red-400 transition-colors">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-red-400" style="font-size: 20px;">block</span>
                    <span class="text-white text-sm font-mono">${item}</span>
                </div>
                <button onclick="removeFromBlocklist(${index})" class="text-[#9dabb9] hover:text-red-400 transition-colors">
                    <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                </button>
            </div>
        `).join('');
    }
}

function validateIPOrDomain(value) {
    // Validate IP (IPv4 or IPv6) or domain
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
    
    return ipv4Regex.test(value) || ipv6Regex.test(value) || domainRegex.test(value);
}

document.getElementById('add-whitelist-btn')?.addEventListener('click', () => {
    const input = document.getElementById('whitelist-input');
    const value = input.value.trim();
    
    if (!value) {
        showNotification('Ingrese una IP o dominio', 'error');
        return;
    }
    
    if (!validateIPOrDomain(value)) {
        showNotification('IP o dominio inválido', 'error');
        return;
    }
    
    if (whitelist.includes(value)) {
        showNotification('Ya existe en la whitelist', 'error');
        return;
    }
    
    if (blocklist.includes(value)) {
        showNotification('Esta entrada está en la blocklist', 'error');
        return;
    }
    
    whitelist.push(value);
    renderLists();
    input.value = '';
    showNotification('Agregado a whitelist', 'success');
});

document.getElementById('add-blocklist-btn')?.addEventListener('click', () => {
    const input = document.getElementById('blocklist-input');
    const value = input.value.trim();
    
    if (!value) {
        showNotification('Ingrese una IP o dominio', 'error');
        return;
    }
    
    if (!validateIPOrDomain(value)) {
        showNotification('IP o dominio inválido', 'error');
        return;
    }
    
    if (blocklist.includes(value)) {
        showNotification('Ya existe en la blocklist', 'error');
        return;
    }
    
    if (whitelist.includes(value)) {
        showNotification('Esta entrada está en la whitelist', 'error');
        return;
    }
    
    blocklist.push(value);
    renderLists();
    input.value = '';
    showNotification('Agregado a blocklist', 'success');
});

window.removeFromWhitelist = (index) => {
    whitelist.splice(index, 1);
    renderLists();
    showNotification('Eliminado de whitelist', 'success');
};

window.removeFromBlocklist = (index) => {
    blocklist.splice(index, 1);
    renderLists();
    showNotification('Eliminado de blocklist', 'success');
};

document.getElementById('save-lists-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-lists-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/snort/lists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whitelist, blocklist })
        });
        
        if (response.ok) {
            showNotification('Listas guardadas correctamente', 'success');
        } else {
            showNotification('Error al guardar listas', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

document.getElementById('export-lists-btn')?.addEventListener('click', () => {
    const csv = [
        'Type,Value',
        ...whitelist.map(ip => `whitelist,${ip}`),
        ...blocklist.map(ip => `blocklist,${ip}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snort-lists-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Listas exportadas', 'success');
});

// Load lists when tab is clicked
document.getElementById('tab-snort-lists')?.addEventListener('click', loadLists);

function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}
