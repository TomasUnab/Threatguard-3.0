const API_URL = 'http://localhost:8000';

let reports = [];

// Load reports
async function loadReports() {
    reports = [
        { id: 1, name: 'Vulnerabilidades Q4 2024', type: 'vulnerabilities', date: '2024-12-15', format: 'PDF' },
        { id: 2, name: 'Alertas Snort Diciembre', type: 'alerts', date: '2024-12-10', format: 'PDF' },
        { id: 3, name: 'Cumplimiento Parches', type: 'compliance', date: '2024-12-05', format: 'CSV' }
    ];
    
    document.getElementById('total-reports').textContent = reports.length;
    renderReports();
}

function renderReports() {
    const tbody = document.getElementById('reports-table');
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-[#9dabb9]">No hay reportes generados</td></tr>';
        return;
    }
    
    tbody.innerHTML = reports.map(r => `
        <tr class="border-b border-[#3b4754] hover:bg-[#1c2127]">
            <td class="px-6 py-4 text-white">${r.name}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-xs ${
                    r.type === 'vulnerabilities' ? 'bg-red-500/20 text-red-400' :
                    r.type === 'alerts' ? 'bg-yellow-500/20 text-yellow-400' :
                    r.type === 'compliance' ? 'bg-green-500/20 text-green-400' :
                    r.type === 'assets' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                }">${r.type.toUpperCase()}</span>
            </td>
            <td class="px-6 py-4 text-[#9dabb9]">${new Date(r.date).toLocaleDateString()}</td>
            <td class="px-6 py-4 text-white">${r.format}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="editReport(${r.id})" class="text-blue-400 hover:text-blue-300" title="Editar">
                        <span class="material-symbols-outlined" style="font-size: 20px;">edit</span>
                    </button>
                    <button onclick="downloadReport(${r.id})" class="text-green-400 hover:text-green-300" title="Descargar">
                        <span class="material-symbols-outlined" style="font-size: 20px;">download</span>
                    </button>
                    <button onclick="deleteReport(${r.id})" class="text-red-400 hover:text-red-300" title="Eliminar">
                        <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Template selection
document.querySelectorAll('.report-template').forEach(template => {
    template.addEventListener('click', () => {
        const type = template.dataset.template;
        showTemplateModal(type);
    });
});

// New report buttons
document.getElementById('new-report-template')?.addEventListener('click', () => {
    showTemplateModal('vulnerabilities');
});

document.getElementById('new-report-custom')?.addEventListener('click', () => {
    showCustomModal();
});

function showTemplateModal(type) {
    const modal = document.createElement('div');
    modal.id = 'template-modal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-[#111418] rounded-xl border border-[#3b4754] p-6 w-full max-w-2xl">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-white text-xl font-bold">Generar Reporte con Template</h3>
                <button onclick="closeModal('template-modal')" class="text-[#9dabb9] hover:text-white">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Tipo de Reporte</label>
                    <select id="template-type" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                        <option value="vulnerabilities" ${type === 'vulnerabilities' ? 'selected' : ''}>Vulnerabilidades</option>
                        <option value="alerts" ${type === 'alerts' ? 'selected' : ''}>Alertas</option>
                        <option value="compliance" ${type === 'compliance' ? 'selected' : ''}>Cumplimiento</option>
                        <option value="assets" ${type === 'assets' ? 'selected' : ''}>Activos</option>
                        <option value="executive" ${type === 'executive' ? 'selected' : ''}>Ejecutivo</option>
                    </select>
                </div>
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Nombre del Reporte</label>
                    <input id="template-name" type="text" placeholder="Ej: Reporte Mensual Diciembre" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-white text-sm font-medium mb-2 block">Fecha Inicio</label>
                        <input id="template-start" type="date" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                    </div>
                    <div>
                        <label class="text-white text-sm font-medium mb-2 block">Fecha Fin</label>
                        <input id="template-end" type="date" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                    </div>
                </div>
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Formato</label>
                    <select id="template-format" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                        <option value="pdf">PDF</option>
                        <option value="csv">CSV</option>
                        <option value="xlsx">Excel (XLSX)</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="flex items-center gap-2 text-white text-sm">
                        <input type="checkbox" id="include-summary" checked class="w-4 h-4">
                        Incluir resumen ejecutivo
                    </label>
                    <label class="flex items-center gap-2 text-white text-sm">
                        <input type="checkbox" id="include-charts" checked class="w-4 h-4">
                        Incluir gráficos
                    </label>
                    <label class="flex items-center gap-2 text-white text-sm">
                        <input type="checkbox" id="include-recommendations" checked class="w-4 h-4">
                        Incluir recomendaciones
                    </label>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="generateTemplateReport()" class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    Generar Reporte
                </button>
                <button onclick="closeModal('template-modal')" class="flex-1 px-4 py-2 bg-[#283039] text-white rounded-lg hover:bg-[#3b4754]">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    document.getElementById('template-start').value = lastMonth;
    document.getElementById('template-end').value = today;
}

function showCustomModal() {
    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-[#111418] rounded-xl border border-[#3b4754] p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-white text-xl font-bold">Crear Reporte Personalizado</h3>
                <button onclick="closeModal('custom-modal')" class="text-[#9dabb9] hover:text-white">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Título del Reporte</label>
                    <input id="custom-title" type="text" placeholder="Título del reporte" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-white text-sm font-medium mb-2 block">Autor</label>
                        <input id="custom-author" type="text" placeholder="Nombre del autor" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                    </div>
                    <div>
                        <label class="text-white text-sm font-medium mb-2 block">Formato</label>
                        <select id="custom-format" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                            <option value="pdf">PDF</option>
                            <option value="docx">Word (DOCX)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Contenido del Reporte</label>
                    <textarea id="custom-content" rows="12" placeholder="Escribe el contenido del reporte aquí..." class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary font-mono text-sm"></textarea>
                </div>
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Secciones a Incluir</label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex items-center gap-2 p-3 bg-[#1c2127] rounded-lg border border-[#3b4754] cursor-pointer">
                            <input type="checkbox" id="section-vulnerabilities" class="w-4 h-4">
                            <span class="text-white text-sm">Vulnerabilidades</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 bg-[#1c2127] rounded-lg border border-[#3b4754] cursor-pointer">
                            <input type="checkbox" id="section-alerts" class="w-4 h-4">
                            <span class="text-white text-sm">Alertas</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 bg-[#1c2127] rounded-lg border border-[#3b4754] cursor-pointer">
                            <input type="checkbox" id="section-assets" class="w-4 h-4">
                            <span class="text-white text-sm">Activos</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 bg-[#1c2127] rounded-lg border border-[#3b4754] cursor-pointer">
                            <input type="checkbox" id="section-compliance" class="w-4 h-4">
                            <span class="text-white text-sm">Cumplimiento</span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="generateCustomReport()" class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    Generar Reporte
                </button>
                <button onclick="closeModal('custom-modal')" class="flex-1 px-4 py-2 bg-[#283039] text-white rounded-lg hover:bg-[#3b4754]">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.generateTemplateReport = async () => {
    const type = document.getElementById('template-type').value;
    const name = document.getElementById('template-name').value.trim();
    const start = document.getElementById('template-start').value;
    const end = document.getElementById('template-end').value;
    const format = document.getElementById('template-format').value;
    
    if (!name) {
        showNotification('El nombre es requerido', 'error');
        return;
    }
    
    showNotification('Generando reporte...', 'info');
    
    try {
        const response = await fetch(`${API_URL}/reports/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, name, start, end, format })
        });
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/pdf')) {
                // Es un PDF, descargarlo
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${name.replace(/ /g, '_')}_${start}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showNotification(`Reporte "${name}" descargado`, 'success');
            } else {
                // Es JSON (fallback)
                const data = await response.json();
                showNotification(data.message || 'Reporte generado', 'success');
            }
            
            const newReport = {
                id: reports.length + 1,
                name,
                type,
                date: new Date().toISOString().split('T')[0],
                format: format.toUpperCase()
            };
            
            reports.push(newReport);
            document.getElementById('total-reports').textContent = reports.length;
            renderReports();
            closeModal('template-modal');
        } else {
            const error = await response.text();
            console.error('Error response:', error);
            showNotification('Error generando reporte', 'error');
        }
    } catch (error) {
        console.error('Error completo:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
};

window.generateCustomReport = async () => {
    const title = document.getElementById('custom-title').value.trim();
    const author = document.getElementById('custom-author').value.trim();
    const content = document.getElementById('custom-content').value.trim();
    const format = document.getElementById('custom-format').value;
    
    if (!title) {
        showNotification('El título es requerido', 'error');
        return;
    }
    
    const newReport = {
        id: reports.length + 1,
        name: title,
        type: 'custom',
        date: new Date().toISOString().split('T')[0],
        format: format.toUpperCase()
    };
    
    reports.push(newReport);
    renderReports();
    closeModal('custom-modal');
    showNotification(`Reporte personalizado "${title}" generado`, 'success');
};

window.editReport = (id) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    
    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-[#111418] rounded-xl border border-[#3b4754] p-6 w-full max-w-2xl">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-white text-xl font-bold">Editar Reporte</h3>
                <button onclick="closeModal('edit-modal')" class="text-[#9dabb9] hover:text-white">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Nombre</label>
                    <input id="edit-name" type="text" value="${report.name}" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                </div>
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Tipo</label>
                    <select id="edit-type" class="w-full px-4 py-2 bg-[#1c2127] text-white rounded-lg border border-[#3b4754]">
                        <option value="vulnerabilities" ${report.type === 'vulnerabilities' ? 'selected' : ''}>Vulnerabilidades</option>
                        <option value="alerts" ${report.type === 'alerts' ? 'selected' : ''}>Alertas</option>
                        <option value="compliance" ${report.type === 'compliance' ? 'selected' : ''}>Cumplimiento</option>
                        <option value="assets" ${report.type === 'assets' ? 'selected' : ''}>Activos</option>
                        <option value="executive" ${report.type === 'executive' ? 'selected' : ''}>Ejecutivo</option>
                    </select>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="saveEditReport(${id})" class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    Guardar Cambios
                </button>
                <button onclick="closeModal('edit-modal')" class="flex-1 px-4 py-2 bg-[#283039] text-white rounded-lg hover:bg-[#3b4754]">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveEditReport = (id) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    
    report.name = document.getElementById('edit-name').value.trim();
    report.type = document.getElementById('edit-type').value;
    
    renderReports();
    closeModal('edit-modal');
    showNotification('Reporte actualizado', 'success');
};

window.downloadReport = (id) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    showNotification(`Descargando "${report.name}"...`, 'info');
};

window.deleteReport = (id) => {
    if (!confirm('¿Eliminar este reporte?')) return;
    reports = reports.filter(r => r.id !== id);
    renderReports();
    showNotification('Reporte eliminado', 'success');
};

window.closeModal = (id) => {
    document.getElementById(id)?.remove();
};

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
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

loadReports();
