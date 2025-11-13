// ============== POLÍTICAS POR CATEGORÍA ==============

function updatePolicyCounts() {
    const counts = { network: 0, web: 0, malware: 0, dos: 0, scan: 0 };
    sampleRules.forEach(rule => {
        if (counts[rule.category] !== undefined) counts[rule.category]++;
    });
    
    document.getElementById('network-count').textContent = `${counts.network} reglas`;
    document.getElementById('web-count').textContent = `${counts.web} reglas`;
    document.getElementById('malware-count').textContent = `${counts.malware} reglas`;
    document.getElementById('dos-count').textContent = `${counts.dos} reglas`;
    document.getElementById('scan-count').textContent = `${counts.scan} reglas`;
}

document.getElementById('apply-policies-btn')?.addEventListener('click', async () => {
    const policies = {
        network: document.getElementById('policy-network').checked,
        web: document.getElementById('policy-web').checked,
        malware: document.getElementById('policy-malware').checked,
        dos: document.getElementById('policy-dos').checked,
        scan: document.getElementById('policy-scan').checked
    };
    
    let updated = 0;
    for (const rule of sampleRules) {
        const shouldBeEnabled = policies[rule.category];
        if (rule.enabled !== shouldBeEnabled) {
            try {
                await fetch(`${API_URL}/snort/rules/${rule.sid}/toggle`, { method: 'PATCH' });
                rule.enabled = shouldBeEnabled;
                updated++;
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }
    
    rulesData = [...sampleRules];
    loadSnortRules();
    showNotification(`${updated} reglas actualizadas según políticas`, 'success');
});

document.getElementById('enable-all-policies-btn')?.addEventListener('click', () => {
    ['network', 'web', 'malware', 'dos', 'scan'].forEach(cat => {
        document.getElementById(`policy-${cat}`).checked = true;
    });
});

document.getElementById('disable-all-policies-btn')?.addEventListener('click', () => {
    ['network', 'web', 'malware', 'dos', 'scan'].forEach(cat => {
        document.getElementById(`policy-${cat}`).checked = false;
    });
});

// ============== CREAR POLÍTICA ==============

document.getElementById('create-policy-btn')?.addEventListener('click', () => {
    document.getElementById('create-policy-modal').classList.remove('hidden');
});

document.getElementById('close-policy-modal')?.addEventListener('click', () => {
    document.getElementById('create-policy-modal').classList.add('hidden');
});

document.getElementById('cancel-policy')?.addEventListener('click', () => {
    document.getElementById('create-policy-modal').classList.add('hidden');
});

document.getElementById('save-policy')?.addEventListener('click', async () => {
    const name = document.getElementById('policy-name').value.trim();
    const description = document.getElementById('policy-description').value.trim();
    const autoApply = document.getElementById('policy-auto-apply').checked;
    
    const categories = [];
    ['network', 'web', 'malware', 'dos', 'scan'].forEach(cat => {
        if (document.getElementById(`policy-cat-${cat}`).checked) {
            categories.push(cat);
        }
    });
    
    if (!name) {
        showNotification('El nombre es requerido', 'error');
        return;
    }
    
    if (categories.length === 0) {
        showNotification('Seleccione al menos una categoría', 'error');
        return;
    }
    
    const btn = document.getElementById('save-policy');
    const originalText = btn.textContent;
    btn.textContent = 'Creando...';
    btn.disabled = true;
    
    try {
        if (autoApply) {
            let updated = 0;
            for (const rule of sampleRules) {
                if (categories.includes(rule.category) && !rule.enabled) {
                    const response = await fetch(`${API_URL}/snort/rules/${rule.sid}/toggle`, { method: 'PATCH' });
                    if (response.ok) {
                        rule.enabled = true;
                        updated++;
                    }
                }
            }
            rulesData = [...sampleRules];
            loadSnortRules();
            updatePolicyCounts();
            showNotification(`Política "${name}" creada y aplicada (${updated} reglas activadas)`, 'success');
        } else {
            showNotification(`Política "${name}" creada`, 'success');
        }
        
        document.getElementById('policy-name').value = '';
        document.getElementById('policy-description').value = '';
        ['network', 'web', 'malware', 'dos', 'scan'].forEach(cat => {
            document.getElementById(`policy-cat-${cat}`).checked = false;
        });
        document.getElementById('create-policy-modal').classList.add('hidden');
    } catch (error) {
        showNotification('Error al crear política', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

document.getElementById('create-policy-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'create-policy-modal') {
        document.getElementById('create-policy-modal').classList.add('hidden');
    }
});

// ============== EDITAR REGLAS ==============

window.editRule = (index) => {
    const rule = rulesData[index];
    if (!rule) return;
    
    document.getElementById('edit-rule-index').value = index;
    document.getElementById('edit-rule-sid').value = rule.sid;
    document.getElementById('edit-rule-category').value = rule.category;
    document.getElementById('edit-rule-message').value = rule.message;
    document.getElementById('edit-rule-protocol').value = rule.protocol;
    document.getElementById('edit-rule-enabled').checked = rule.enabled;
    
    document.getElementById('edit-rule-modal').classList.remove('hidden');
};

document.getElementById('close-edit-modal')?.addEventListener('click', () => {
    document.getElementById('edit-rule-modal').classList.add('hidden');
});

document.getElementById('cancel-edit-rule')?.addEventListener('click', () => {
    document.getElementById('edit-rule-modal').classList.add('hidden');
});

document.getElementById('save-edit-rule')?.addEventListener('click', async () => {
    const index = parseInt(document.getElementById('edit-rule-index').value);
    const rule = rulesData[index];
    if (!rule) return;
    
    const newCategory = document.getElementById('edit-rule-category').value;
    const newMessage = document.getElementById('edit-rule-message').value.trim();
    const newProtocol = document.getElementById('edit-rule-protocol').value;
    const newEnabled = document.getElementById('edit-rule-enabled').checked;
    
    if (!newMessage) {
        showNotification('El mensaje es requerido', 'error');
        return;
    }
    
    const btn = document.getElementById('save-edit-rule');
    const originalText = btn.textContent;
    btn.textContent = 'Guardando...';
    btn.disabled = true;
    
    try {
        await fetch(`${API_URL}/snort/rules/${rule.sid}`, { method: 'DELETE' });
        
        const response = await fetch(`${API_URL}/snort/rules/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sid: rule.sid,
                category: newCategory,
                message: newMessage,
                protocol: newProtocol,
                enabled: newEnabled
            })
        });
        
        if (response.ok) {
            rule.category = newCategory;
            rule.message = newMessage;
            rule.protocol = newProtocol;
            rule.enabled = newEnabled;
            
            const sampleIndex = sampleRules.findIndex(r => r.sid === rule.sid);
            if (sampleIndex !== -1) {
                sampleRules[sampleIndex] = {...rule};
            }
            
            document.getElementById('edit-rule-modal').classList.add('hidden');
            loadSnortRules();
            showNotification('Regla actualizada en Snort', 'success');
        } else {
            showNotification('Error al actualizar regla', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

document.getElementById('edit-rule-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-rule-modal') {
        document.getElementById('edit-rule-modal').classList.add('hidden');
    }
});
