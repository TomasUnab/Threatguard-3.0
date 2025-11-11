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
    formData.append('model', fileInput.files[0]);
    
    try {
        const response = await fetch('http://localhost:8000/model/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showNotification('Modelo cargado', 'El modelo se ha cargado exitosamente', 'success');
            setTimeout(() => location.reload(), 2000);
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error al cargar el modelo');
        }
    } catch (err) {
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
                <td colspan="7" class="px-4 py-8 text-center text-[#9dabb9]">
                    <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-4xl">devices</span>
                        <p>No hay activos registrados</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    assetsTableBody.innerHTML = filteredAssets.map(asset => {
        const osIcons = {
            'windows': 'computer',
            'linux': 'terminal',
            'macos': 'laptop_mac'
        };
        
        const statusColors = {
            'active': 'bg-green-500/20 text-green-400',
            'inactive': 'bg-gray-500/20 text-gray-400',
            'offline': 'bg-red-500/20 text-red-400'
        };
        
        const riskColors = {
            low: 'bg-green-500/20 text-green-400',
            medium: 'bg-yellow-500/20 text-yellow-400',
            high: 'bg-red-500/20 text-red-400'
        };
        
        const riskLevel = asset.risk_score < 30 ? 'low' : asset.risk_score < 60 ? 'medium' : 'high';
        const riskText = asset.risk_score < 30 ? 'Bajo' : asset.risk_score < 60 ? 'Medio' : 'Alto';
        
        // Usar el estado calculado por el backend (que ya tiene la lógica correcta)
        console.log(`Asset ${asset.hostname}: backend status = "${asset.status}"`);
        const isOnline = asset.status === 'online';
        const agentStatus = isOnline ? 'active' : 'offline';
        const statusText = isOnline ? 'Online' : 'Offline';
        console.log(`Asset ${asset.hostname}: isOnline = ${isOnline}, statusText = ${statusText}`);
        
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
                            <span class="material-symbols-outlined text-primary">${osIcons[asset.os_type] || 'devices'}</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">${asset.hostname}</p>
                            <p class="text-[#9dabb9] text-xs">${asset.status}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <p class="text-white text-sm">${asset.ip_address || 'N/A'}</p>
                    <p class="text-[#9dabb9] text-xs">${asset.mac_address || 'N/A'}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="text-white text-sm">${asset.os_version || 'N/A'}</p>
                </td>
                <td class="px-4 py-4">
                    <div class="space-y-1">
                        ${asset.antivirus_active ? `
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                <span class="text-white text-xs">${asset.antivirus_name || 'Antivirus Activo'}</span>
                            </div>
                        ` : `
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                <span class="text-[#9dabb9] text-xs">Sin antivirus</span>
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
                                <span class="text-[#9dabb9] text-xs">Sin telemetría</span>
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
                        ${riskText} (${asset.risk_score})
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

// Filtros
document.getElementById('filter-os')?.addEventListener('change', (e) => {
    const osFilter = e.target.value;
    filteredAssets = assets.filter(asset => !osFilter || asset.os_type === osFilter);
    renderAssetsTable();
});

document.getElementById('filter-antivirus')?.addEventListener('change', (e) => {
    const avFilter = e.target.value;
    if (!avFilter) {
        filteredAssets = [...assets];
    } else {
        const hasAV = avFilter === 'true';
        filteredAssets = assets.filter(asset => asset.antivirus_active === hasAV);
    }
    renderAssetsTable();
});

document.getElementById('filter-telemetry')?.addEventListener('change', (e) => {
    const telemetryFilter = e.target.value;
    if (!telemetryFilter) {
        filteredAssets = [...assets];
    } else {
        const hasTelemetry = telemetryFilter === 'true';
        filteredAssets = assets.filter(asset => asset.telemetry_enabled === hasTelemetry);
    }
    renderAssetsTable();
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

// Cargar datos iniciales cuando se accede a la sección
document.querySelector('[data-section="assets"]')?.addEventListener('click', () => {
    loadAssets();
    loadTags();
});

