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

// Sample rules data
const sampleRules = [
    { sid: 1000001, category: 'network', message: 'ICMP Ping Detected', protocol: 'icmp', enabled: true },
    { sid: 1000002, category: 'network', message: 'TCP SYN Flood', protocol: 'tcp', enabled: true },
    { sid: 1000003, category: 'web', message: 'SQL Injection Attempt', protocol: 'tcp', enabled: true },
    { sid: 1000004, category: 'web', message: 'XSS Attack Detected', protocol: 'tcp', enabled: false },
    { sid: 1000005, category: 'malware', message: 'Malware Download Attempt', protocol: 'tcp', enabled: true },
    { sid: 1000006, category: 'dos', message: 'UDP Flood Detected', protocol: 'udp', enabled: true },
    { sid: 1000007, category: 'scan', message: 'Port Scan Detected', protocol: 'tcp', enabled: true },
    { sid: 1000008, category: 'network', message: 'DNS Query Anomaly', protocol: 'udp', enabled: false },
    { sid: 1000009, category: 'web', message: 'Directory Traversal', protocol: 'http', enabled: true },
    { sid: 1000010, category: 'malware', message: 'Suspicious Executable', protocol: 'tcp', enabled: true }
];

let rulesData = JSON.parse(JSON.stringify(sampleRules));

// Load Snort rules
async function loadSnortRules() {
    const tbody = document.getElementById('rules-table-body');
    
    if (rulesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-[#9dabb9]">No hay reglas configuradas</td></tr>';
        return;
    }
    
    tbody.innerHTML = rulesData.map((rule, index) => `
        <tr class="border-b border-[#3b4754] hover:bg-[#1c2127]">
            <td class="px-4 py-3">
                <input type="checkbox" class="rule-checkbox w-4 h-4 bg-[#283039] border-[#3b4754] rounded" data-index="${index}">
            </td>
            <td class="px-4 py-3 text-white text-sm font-mono">${rule.sid}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 rounded text-xs ${
                    rule.category === 'network' ? 'bg-blue-500/20 text-blue-400' :
                    rule.category === 'web' ? 'bg-purple-500/20 text-purple-400' :
                    rule.category === 'malware' ? 'bg-red-500/20 text-red-400' :
                    rule.category === 'dos' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                }">
                    ${rule.category.toUpperCase()}
                </span>
            </td>
            <td class="px-4 py-3 text-white text-sm">${rule.message}</td>
            <td class="px-4 py-3 text-white text-sm">${rule.protocol.toUpperCase()}</td>
            <td class="px-4 py-3">
                <button onclick="toggleRule(${index})" class="px-3 py-1 rounded text-xs font-medium ${
                    rule.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }">
                    ${rule.enabled ? 'Activa' : 'Inactiva'}
                </button>
            </td>
            <td class="px-4 py-3">
                <div class="flex gap-2">
                    <button onclick="editRule(${index})" class="text-blue-400 hover:text-blue-300">
                        <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                    </button>
                    <button onclick="deleteRule(${index})" class="text-red-400 hover:text-red-300">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    const countElement = document.getElementById('snort-rules-count');
    if (countElement) {
        countElement.textContent = rulesData.filter(r => r.enabled).length;
    }
}

window.toggleRule = async (index) => {
    if (rulesData[index]) {
        const rule = rulesData[index];
        try {
            const response = await fetch(`${API_URL}/snort/rules/${rule.sid}/toggle`, {
                method: 'PATCH'
            });
            
            if (response.ok) {
                rule.enabled = !rule.enabled;
                loadSnortRules();
                showNotification(`Regla ${rule.enabled ? 'activada' : 'desactivada'} en Snort`, 'success');
            } else {
                showNotification('Error al actualizar regla', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión', 'error');
        }
    }
};

// editRule function is now in snort-policies.js

window.deleteRule = async (index) => {
    if (confirm('¿Eliminar esta regla de Snort?')) {
        const rule = rulesData[index];
        try {
            const response = await fetch(`${API_URL}/snort/rules/${rule.sid}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Remove from both arrays
                rulesData.splice(index, 1);
                const sampleIndex = sampleRules.findIndex(r => r.sid === rule.sid);
                if (sampleIndex !== -1) {
                    sampleRules.splice(sampleIndex, 1);
                }
                loadSnortRules();
                showNotification('Regla eliminada de Snort', 'success');
            } else {
                showNotification('Error al eliminar regla', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión', 'error');
        }
    }
};

// Search and filter rules
document.getElementById('search-rules')?.addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const categoryFilter = document.getElementById('filter-category');
    const category = categoryFilter ? categoryFilter.value : '';
    
    const filtered = [...sampleRules].filter(rule => {
        const matchSearch = rule.message.toLowerCase().includes(search) || rule.sid.toString().includes(search);
        const matchCategory = !category || rule.category === category;
        return matchSearch && matchCategory;
    });
    
    rulesData = filtered;
    loadSnortRules();
});

document.getElementById('filter-category')?.addEventListener('change', () => {
    const searchInput = document.getElementById('search-rules');
    if (searchInput) {
        searchInput.dispatchEvent(new Event('input'));
    }
});

// Close modal on outside click
document.getElementById('add-rule-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-rule-modal') {
        document.getElementById('add-rule-modal').classList.add('hidden');
    }
});

// Select all rules
setTimeout(() => {
    const selectAll = document.getElementById('select-all-rules');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.rule-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }
}, 500);

// Bulk actions
document.getElementById('enable-selected-btn')?.addEventListener('click', async () => {
    const selected = Array.from(document.querySelectorAll('.rule-checkbox:checked')).map(cb => parseInt(cb.dataset.index));
    if (selected.length === 0) {
        showNotification('Seleccione al menos una regla', 'error');
        return;
    }
    
    let updated = 0;
    for (const index of selected) {
        if (rulesData[index] && !rulesData[index].enabled) {
            try {
                const response = await fetch(`${API_URL}/snort/rules/${rulesData[index].sid}/toggle`, { method: 'PATCH' });
                if (response.ok) {
                    rulesData[index].enabled = true;
                    updated++;
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }
    loadSnortRules();
    showNotification(`${updated} reglas activadas en Snort`, 'success');
});

document.getElementById('disable-selected-btn')?.addEventListener('click', async () => {
    const selected = Array.from(document.querySelectorAll('.rule-checkbox:checked')).map(cb => parseInt(cb.dataset.index));
    if (selected.length === 0) {
        showNotification('Seleccione al menos una regla', 'error');
        return;
    }
    
    let updated = 0;
    for (const index of selected) {
        if (rulesData[index] && rulesData[index].enabled) {
            try {
                const response = await fetch(`${API_URL}/snort/rules/${rulesData[index].sid}/toggle`, { method: 'PATCH' });
                if (response.ok) {
                    rulesData[index].enabled = false;
                    updated++;
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }
    loadSnortRules();
    showNotification(`${updated} reglas desactivadas en Snort`, 'success');
});

document.getElementById('delete-selected-btn')?.addEventListener('click', async () => {
    const selected = Array.from(document.querySelectorAll('.rule-checkbox:checked')).map(cb => parseInt(cb.dataset.index));
    if (selected.length === 0) {
        showNotification('Seleccione al menos una regla', 'error');
        return;
    }
    if (!confirm(`¿Eliminar ${selected.length} reglas de Snort?`)) return;
    
    // Get SIDs to delete
    const sidsToDelete = selected.map(index => rulesData[index].sid);
    
    // Delete from backend
    let deleted = 0;
    for (const sid of sidsToDelete) {
        try {
            const response = await fetch(`${API_URL}/snort/rules/${sid}`, { method: 'DELETE' });
            if (response.ok) deleted++;
        } catch (error) {
            console.error(`Error deleting SID ${sid}:`, error);
        }
    }
    
    // Remove from both arrays
    const selectedSet = new Set(selected);
    rulesData = rulesData.filter((_, index) => !selectedSet.has(index));
    sampleRules = sampleRules.filter(r => !sidsToDelete.includes(r.sid));
    
    loadSnortRules();
    showNotification(`${deleted} reglas eliminadas de Snort`, 'success');
});

document.getElementById('export-rules-btn')?.addEventListener('click', () => {
    if (rulesData.length === 0) {
        showNotification('No hay reglas para exportar', 'error');
        return;
    }
    const csv = [
        'SID,Category,Message,Protocol,Enabled',
        ...rulesData.map(r => `${r.sid},${r.category},"${r.message}",${r.protocol},${r.enabled}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snort-rules-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Reglas exportadas', 'success');
});

// Add rule modal
document.getElementById('add-rule-btn')?.addEventListener('click', () => {
    document.getElementById('add-rule-modal').classList.remove('hidden');
    // Generate next SID
    const maxSid = Math.max(...sampleRules.map(r => r.sid), 1000000);
    document.getElementById('rule-sid').value = maxSid + 1;
});

document.getElementById('close-rule-modal')?.addEventListener('click', () => {
    document.getElementById('add-rule-modal').classList.add('hidden');
});

document.getElementById('cancel-new-rule')?.addEventListener('click', () => {
    document.getElementById('add-rule-modal').classList.add('hidden');
});

document.getElementById('save-new-rule')?.addEventListener('click', async () => {
    const sid = parseInt(document.getElementById('rule-sid').value);
    const category = document.getElementById('rule-category').value;
    const message = document.getElementById('rule-message').value.trim();
    const protocol = document.getElementById('rule-protocol').value;
    const enabled = document.getElementById('rule-enabled').checked;
    
    // Validations
    if (!sid || sid < 1000000) {
        showNotification('SID debe ser mayor o igual a 1000000', 'error');
        return;
    }
    
    if (sampleRules.some(r => r.sid === sid)) {
        showNotification('El SID ya existe', 'error');
        return;
    }
    
    if (!message) {
        showNotification('El mensaje es requerido', 'error');
        return;
    }
    
    const btn = document.getElementById('save-new-rule');
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;
    
    try {
        // Guardar en backend
        const response = await fetch(`${API_URL}/snort/rules/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid, category, message, protocol, enabled })
        });
        
        if (response.ok) {
            // Add to local array
            const newRule = { sid, category, message, protocol, enabled };
            sampleRules.push(newRule);
            rulesData = [...sampleRules];
            
            // Reset form
            document.getElementById('rule-message').value = '';
            document.getElementById('rule-enabled').checked = true;
            
            // Close modal and reload
            document.getElementById('add-rule-modal').classList.add('hidden');
            loadSnortRules();
            showNotification('Regla agregada y aplicada a Snort', 'success');
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Error al agregar regla', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Load Snort alerts
async function loadSnortAlerts() {
    try {
        const response = await fetch(`${API_URL}/api/snort/alerts?limit=50`);
        if (response.ok) {
            const data = await response.json();
            const tbody = document.getElementById('snort-alerts-table');
            if (!tbody) return;
            
            if (data.alerts && data.alerts.length > 0) {
                tbody.innerHTML = data.alerts.map(alert => `
                    <tr class="border-b border-[#3b4754] hover:bg-[#1c2127]">
                        <td class="px-4 py-3 text-white text-sm">${new Date(alert.timestamp).toISOString().slice(0, 19).replace('T', ' ')}</td>
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
    if (!confirm('¿Reiniciar Snort para aplicar cambios?')) return;
    
    const btn = document.getElementById('restart-snort-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span><span>Reiniciando...</span>';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/snort/restart`, { method: 'POST' });
        if (response.ok) {
            showNotification('Snort reiniciado - reglas aplicadas', 'success');
            setTimeout(() => {
                loadSnortAlerts();
                loadSnortRules();
            }, 3000);
        } else {
            showNotification('Error al reiniciar Snort', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    } finally {
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 3000);
    }
});

// Initialize Snort section when selected
const snortMenuItem = document.querySelector('[data-section="snort"]');
if (snortMenuItem) {
    snortMenuItem.addEventListener('click', () => {
        setTimeout(() => {
            loadSnortRules();
            loadSnortAlerts();
        }, 100);
    });
}

// Load rules when rules tab is clicked
document.getElementById('tab-snort-rules')?.addEventListener('click', () => {
    setTimeout(() => loadSnortRules(), 100);
});

// Load policies when policies tab is clicked
document.getElementById('tab-snort-policies')?.addEventListener('click', () => {
    setTimeout(() => {
        if (typeof updatePolicyCounts === 'function') {
            updatePolicyCounts();
        }
    }, 100);
});

// Auto-refresh alerts every 30 seconds
setInterval(() => {
    const section = document.getElementById('section-snort');
    if (section && !section.classList.contains('hidden')) {
        const alertsPanel = document.getElementById('panel-snort-alerts');
        if (alertsPanel && !alertsPanel.classList.contains('hidden')) {
            loadSnortAlerts();
        }
    }
}, 30000);

// Initialize when alerts tab is clicked
document.getElementById('tab-snort-alerts')?.addEventListener('click', () => {
    setTimeout(() => loadSnortAlerts(), 100);
});

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
    a.download = `snort-lists-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Listas exportadas', 'success');
});

// Load lists when tab is clicked
document.getElementById('tab-snort-lists')?.addEventListener('click', () => {
    setTimeout(() => loadLists(), 100);
});

function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
