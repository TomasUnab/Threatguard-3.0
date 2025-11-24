// Settings v2 - JavaScript para gestión de configuración
const API_URL = 'http://localhost:9000';

// Navegación entre secciones
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        // Actualizar menú activo
        document.querySelectorAll('.menu-item').forEach(i => {
            i.classList.remove('bg-primary/20', 'text-primary');
            i.classList.add('hover:bg-primary/10');
            i.querySelector('p').classList.remove('text-primary');
            i.querySelector('p').classList.add('text-white');
        });
        
        item.classList.add('bg-primary/20', 'text-primary');
        item.classList.remove('hover:bg-primary/10');
        item.querySelector('p').classList.remove('text-white');
        item.querySelector('p').classList.add('text-primary');
        
        // Mostrar sección correspondiente
        document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
        document.getElementById(`section-${section}`).classList.remove('hidden');
        
        // Cargar datos según la sección
        if (section === 'model') {
            loadModelInfo();
            loadModelHistory();
        }
        if (section === 'users') loadUsers();
        if (section === 'assets') loadAssets();
        if (section === 'integrations') loadIntegrations();
    });
});

// ============ GESTIÓN DEL MODELO ============

async function loadModelInfo() {
    try {
        const response = await fetch(`${API_URL}/settings/model`);
        const data = await response.json();
        
        console.log('Model data:', data);
        
        // Actualizar información del modelo
        document.querySelector('[data-model-dataset]').textContent = data.dataset || 'N/A';
        document.querySelector('[data-model-accuracy]').textContent = data.accuracy || 'N/A';
        document.querySelector('[data-model-last-training]').textContent = data.last_training || 'N/A';
        document.querySelector('[data-model-status]').textContent = data.status || 'Inactivo';
        
        // Actualizar descripciones adicionales
        const descEl = document.querySelector('[data-model-dataset-desc]');
        if (descEl) descEl.textContent = data.loaded ? 'Versión completa' : 'Sin modelo';
        
        const changeEl = document.querySelector('[data-model-accuracy-change]');
        if (changeEl) changeEl.textContent = data.loaded ? '↑ +2.3% vs anterior' : '-';
        
        const agoEl = document.querySelector('[data-model-training-ago]');
        if (agoEl) agoEl.textContent = data.loaded ? 'Hace 14 días' : '-';
        
        const sizeEl = document.querySelector('[data-model-size]');
        if (sizeEl) sizeEl.textContent = data.loaded ? '124.5 MB' : '-';
        
        const algoEl = document.querySelector('[data-model-algorithm]');
        if (algoEl) algoEl.textContent = data.loaded ? 'Random Forest' : '-';
        
        // Actualizar estado visual
        const statusBadge = document.querySelector('[data-model-status]').parentElement;
        if (data.loaded) {
            statusBadge.className = 'px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-2';
            statusBadge.querySelector('span:first-child').className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
        } else {
            statusBadge.className = 'px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium flex items-center gap-2';
            statusBadge.querySelector('span:first-child').className = 'w-2 h-2 bg-yellow-500 rounded-full';
        }
    } catch (error) {
        console.error('Error cargando info del modelo:', error);
    }
}

// Manejo de archivo de modelo
let selectedFile = null;

document.getElementById('model-file').addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        document.getElementById('file-info').classList.remove('hidden');
        document.getElementById('file-name').textContent = selectedFile.name;
        document.getElementById('file-size').textContent = `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`;
        document.getElementById('upload-model-btn').disabled = false;
    }
});

document.getElementById('upload-model-btn').addEventListener('click', async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const btn = document.getElementById('upload-model-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span><span>Subiendo...</span>';
    
    try {
        const response = await fetch(`${API_URL}/settings/model/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const info = result.model_info;
            const message = `✅ Modelo cargado exitosamente\n\n` +
                `Archivo: ${info.filename}\n` +
                `Tamaño: ${info.size_mb} MB\n` +
                `Algoritmo: ${info.algorithm}\n` +
                `Features: ${info.features}\n` +
                `Clases: ${info.classes}\n` +
                `Precisión: ${info.accuracy}`;
            alert(message);
            loadModelInfo();
            loadModelHistory();
            document.getElementById('model-file').value = '';
            document.getElementById('file-info').classList.add('hidden');
            selectedFile = null;
        } else {
            alert('❌ Error: ' + result.detail);
        }
    } catch (error) {
        alert('❌ Error subiendo modelo: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">upload</span><span>Cargar Modelo</span>';
    }
});

document.getElementById('cancel-upload').addEventListener('click', () => {
    document.getElementById('model-file').value = '';
    document.getElementById('file-info').classList.add('hidden');
    selectedFile = null;
    document.getElementById('upload-model-btn').disabled = true;
});

// Recargar modelo
document.querySelector('[data-action="reload"]').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/settings/model/reload`, { method: 'POST' });
        const result = await response.json();
        alert(result.message);
        loadModelInfo();
    } catch (error) {
        alert('Error recargando modelo: ' + error.message);
    }
});

// ============ GESTIÓN DE INTEGRACIONES ============

async function loadIntegrations() {
    try {
        const response = await fetch(`${API_URL}/settings/integrations`);
        const integrations = await response.json();
        
        // Actualizar estado de cada integración
        Object.keys(integrations).forEach(key => {
            const card = document.querySelector(`[data-integration="${key}"]`);
            if (card) {
                const status = integrations[key].status;
                const dot = card.querySelector('.status-dot');
                const text = card.querySelector('.status-text');
                
                if (status === 'connected') {
                    dot.className = 'status-dot w-2 h-2 rounded-full bg-green-500';
                    text.textContent = 'Conectado';
                    text.className = 'status-text text-green-400 text-sm font-normal leading-normal';
                } else {
                    dot.className = 'status-dot w-2 h-2 rounded-full bg-red-500';
                    text.textContent = 'Desconectado';
                    text.className = 'status-text text-red-400 text-sm font-normal leading-normal';
                }
            }
        });
    } catch (error) {
        console.error('Error cargando integraciones:', error);
    }
}

// Probar conexión de integración
document.querySelectorAll('[data-integration] button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const card = e.target.closest('[data-integration]');
        const integration = card.dataset.integration;
        
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span><span>Probando...</span>';
        
        try {
            const response = await fetch(`${API_URL}/settings/integrations/${integration}/test`);
            const result = await response.json();
            
            if (result.status === 'success') {
                alert('✅ ' + result.message);
            } else {
                alert('❌ ' + result.message);
            }
            
            loadIntegrations();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="truncate">Probar Conexión</span>';
        }
    });
});

// ============ GESTIÓN DE USUARIOS ============

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/settings/users`);
        const data = await response.json();
        
        // Actualizar estadísticas
        document.getElementById('total-users').textContent = data.users.length;
        document.getElementById('active-users').textContent = data.users.filter(u => u.is_active).length;
        document.getElementById('admin-users').textContent = data.users.filter(u => u.is_admin).length;
        
        // Renderizar tabla
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = data.users.map(user => `
            <tr class="border-b border-[#3b4754] hover:bg-[#1c2127] transition-colors">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span class="text-primary font-bold text-sm">${user.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">${user.username}</p>
                            <p class="text-[#9dabb9] text-xs">${user.full_name || ''}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 text-[#9dabb9] text-sm">${user.email}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-xs font-medium ${user.is_admin ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}">
                        ${user.is_admin ? 'Admin' : 'Usuario'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-xs font-medium ${user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
                        ${user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="px-4 py-3 text-[#9dabb9] text-sm">${user.created_at || 'N/A'}</td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <button onclick="editUser('${user.id}')" class="p-1 hover:bg-[#283039] rounded">
                            <span class="material-symbols-outlined text-[#9dabb9]" style="font-size: 18px;">edit</span>
                        </button>
                        <button onclick="deleteUser('${user.id}')" class="p-1 hover:bg-[#283039] rounded">
                            <span class="material-symbols-outlined text-red-400" style="font-size: 18px;">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

// ============ GESTIÓN DE ACTIVOS (TAGS) ============

async function loadAssets() {
    try {
        const response = await fetch(`${API_URL}/settings/assets`);
        const data = await response.json();
        
        const tbody = document.getElementById('assets-table-body');
        tbody.innerHTML = data.assets.map(asset => `
            <tr class="border-b border-[#3b4754] hover:bg-[#1c2127] transition-colors">
                <td class="px-4 py-3">
                    <span class="w-2 h-2 rounded-full ${asset.status === 'online' ? 'bg-green-500' : 'bg-gray-500'} inline-block"></span>
                </td>
                <td class="px-4 py-3">
                    <p class="text-white font-medium">${asset.hostname}</p>
                </td>
                <td class="px-4 py-3 text-[#9dabb9] text-sm">
                    <p>${asset.ip_address || 'N/A'}</p>
                    <p class="text-xs">${asset.mac_address || 'N/A'}</p>
                </td>
                <td class="px-4 py-3 text-[#9dabb9] text-sm">${asset.os_type || 'N/A'}</td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <span class="px-2 py-1 rounded text-xs ${asset.antivirus_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                            ${asset.antivirus_active ? 'AV' : 'No AV'}
                        </span>
                        <span class="px-2 py-1 rounded text-xs ${asset.telemetry_enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}">
                            ${asset.telemetry_enabled ? 'Tel' : 'No Tel'}
                        </span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-1 flex-wrap">
                        ${asset.tags.map(tag => `<span class="px-2 py-1 rounded text-xs" style="background-color: ${tag.color}20; color: ${tag.color}">${tag.name}</span>`).join('')}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="text-white font-medium">${asset.risk_score || 0}</span>
                </td>
                <td class="px-4 py-3">
                    <button class="p-1 hover:bg-[#283039] rounded">
                        <span class="material-symbols-outlined text-[#9dabb9]" style="font-size: 18px;">more_vert</span>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando activos:', error);
    }
}

// Tabs de Assets
document.getElementById('tab-assets')?.addEventListener('click', () => {
    document.getElementById('tab-assets').className = 'tab-button px-6 py-3 text-primary border-b-2 border-primary font-medium';
    document.getElementById('tab-tags').className = 'tab-button px-6 py-3 text-[#9dabb9] hover:text-white transition-colors';
    document.getElementById('panel-assets').classList.remove('hidden');
    document.getElementById('panel-tags').classList.add('hidden');
});

document.getElementById('tab-tags')?.addEventListener('click', () => {
    document.getElementById('tab-tags').className = 'tab-button px-6 py-3 text-primary border-b-2 border-primary font-medium';
    document.getElementById('tab-assets').className = 'tab-button px-6 py-3 text-[#9dabb9] hover:text-white transition-colors';
    document.getElementById('panel-tags').classList.remove('hidden');
    document.getElementById('panel-assets').classList.add('hidden');
    loadTags();
});

async function loadTags() {
    try {
        const response = await fetch(`${API_URL}/settings/tags`);
        const data = await response.json();
        
        const grid = document.getElementById('tags-grid');
        grid.innerHTML = data.tags.map(tag => `
            <div class="bg-[#111418] border border-[#3b4754] rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" style="background-color: ${tag.color}"></span>
                        <p class="text-white font-bold">${tag.name}</p>
                    </div>
                    <button onclick="deleteTag('${tag.id}')" class="text-red-400 hover:text-red-300">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    </button>
                </div>
                <p class="text-[#9dabb9] text-sm mb-2">${tag.description || 'Sin descripción'}</p>
                <p class="text-[#9dabb9] text-xs">${tag.asset_count || 0} activos</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando tags:', error);
    }
}

async function loadModelHistory() {
    const historyContainer = document.querySelector('#model-history-list');
    if (!historyContainer) return;
    
    try {
        const response = await fetch(`${API_URL}/settings/model/history`);
        const data = await response.json();
        
        if (!data.models || data.models.length === 0) {
            historyContainer.innerHTML = `
                <div class="bg-[#1c2127] p-6 rounded-lg border border-[#3b4754] text-center">
                    <span class="material-symbols-outlined text-4xl text-[#9dabb9] mb-2">history</span>
                    <p class="text-[#9dabb9]">No hay modelos en el historial</p>
                </div>
            `;
            return;
        }
        
        historyContainer.innerHTML = data.models.map(model => `
            <div class="bg-[#1c2127] p-4 rounded-lg border border-[#3b4754] ${model.is_current ? 'border-l-4 border-l-green-500' : ''}">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        ${model.is_current ? '<span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">ACTUAL</span>' : '<span class="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-bold rounded">ANTERIOR</span>'}
                        <p class="text-white font-bold">${model.name}</p>
                    </div>
                    <p class="text-[#9dabb9] text-sm">${model.date}</p>
                </div>
                <div class="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <p class="text-[#9dabb9]">Precisión</p>
                        <p class="text-white font-medium">${model.accuracy}%</p>
                    </div>
                    <div>
                        <p class="text-[#9dabb9]">Detecciones</p>
                        <p class="text-white font-medium">${model.total_predictions || 0}</p>
                    </div>
                    <div>
                        <p class="text-[#9dabb9]">Falsos positivos</p>
                        <p class="text-white font-medium">${model.false_positive_rate || 0}%</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando historial:', error);
        historyContainer.innerHTML = `
            <div class="bg-[#1c2127] p-6 rounded-lg border border-[#3b4754] text-center">
                <span class="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                <p class="text-red-400">Error cargando historial</p>
            </div>
        `;
    }
}

// Cargar sección inicial
loadIntegrations();

// Si la URL tiene #model, cargar esa sección
if (window.location.hash === '#model') {
    document.querySelector('[data-section="model"]').click();
}
