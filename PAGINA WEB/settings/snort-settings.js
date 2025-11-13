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
