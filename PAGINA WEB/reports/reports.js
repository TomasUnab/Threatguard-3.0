// Modal para generar reportes
const reportTemplates = document.querySelectorAll('.report-template');
const modal = createReportModal();

reportTemplates.forEach(template => {
    template.addEventListener('click', () => {
        const title = template.querySelector('p.text-white').textContent;
        showReportModal(title);
    });
});

function createReportModal() {
    const modal = document.createElement('div');
    modal.id = 'report-modal';
    modal.className = 'hidden fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-[#1c2127] rounded-lg max-w-2xl w-full border border-[#3b4754] p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-white">Generar Reporte</h2>
                <button onclick="closeReportModal()" class="text-[#9dabb9] hover:text-white">
                    <span class="material-symbols-outlined text-3xl">close</span>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Tipo de Reporte</label>
                    <input id="report-type" type="text" readonly class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754]">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-white text-sm font-medium mb-2 block">Fecha Inicio</label>
                        <input id="report-start" type="date" class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                    </div>
                    <div>
                        <label class="text-white text-sm font-medium mb-2 block">Fecha Fin</label>
                        <input id="report-end" type="date" class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                    </div>
                </div>
                <div>
                    <label class="text-white text-sm font-medium mb-2 block">Formato</label>
                    <select id="report-format" class="w-full px-4 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                        <option value="pdf">PDF</option>
                        <option value="csv">CSV</option>
                    </select>
                </div>
                <div>
                    <label class="flex items-center gap-2 text-white text-sm">
                        <input id="include-summary" type="checkbox" checked class="rounded bg-[#283039] border-[#3b4754] text-primary focus:ring-primary">
                        <span>Incluir sumario ejecutivo</span>
                    </label>
                </div>
                <div>
                    <label class="flex items-center gap-2 text-white text-sm">
                        <input id="include-compliance" type="checkbox" checked class="rounded bg-[#283039] border-[#3b4754] text-primary focus:ring-primary">
                        <span>Incluir patch compliance</span>
                    </label>
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="generateReport()" class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                        Generar Reporte
                    </button>
                    <button onclick="closeReportModal()" class="flex-1 px-4 py-2 bg-[#283039] text-white rounded-lg hover:bg-[#3b4754] transition-colors">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function showReportModal(title) {
    document.getElementById('report-type').value = title;
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    document.getElementById('report-start').value = lastMonth;
    document.getElementById('report-end').value = today;
    document.getElementById('report-modal').classList.remove('hidden');
}

function closeReportModal() {
    document.getElementById('report-modal').classList.add('hidden');
}

async function generateReport() {
    const type = document.getElementById('report-type').value;
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    const format = document.getElementById('report-format').value;
    const summary = document.getElementById('include-summary').checked;
    const compliance = document.getElementById('include-compliance').checked;

    try {
        const response = await fetch('http://192.168.1.24:8000/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, start, end, format, summary, compliance })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${start}_${end}.${format}`;
            a.click();
            closeReportModal();
        }
    } catch (err) {
        alert('Error generando reporte: ' + err.message);
    }
}

// Botones de descarga existentes
document.querySelectorAll('.btn-pdf, .btn-csv').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const type = e.target.closest('button').dataset.type;
        const format = e.target.closest('button').classList.contains('btn-pdf') ? 'pdf' : 'csv';
        
        try {
            const response = await fetch(`http://192.168.1.24:8000/reports/${type}/${format}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}_report.${format}`;
                a.click();
            }
        } catch (err) {
            console.error('Error descargando reporte:', err);
        }
    });
});
