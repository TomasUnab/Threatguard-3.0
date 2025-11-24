let nodes = [];
let connections = [];
let selectedNode = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let connectingFrom = null;
let canvas, ctx;

const nodeTypes = {
    trigger: { color: '#FF6B6B', icon: 'bolt', label: 'Trigger' },
    condition: { color: '#FFD93D', icon: 'rule', label: 'Condition' },
    action: { color: '#6BCF7F', icon: 'play_arrow', label: 'Action' },
    notification: { color: '#4ECDC4', icon: 'notifications', label: 'Notification' },
    delay: { color: '#9B59B6', icon: 'schedule', label: 'Delay' },
    webhook: { color: '#E67E22', icon: 'webhook', label: 'Webhook' },
    script: { color: '#3498DB', icon: 'code', label: 'Script' },
    database: { color: '#1ABC9C', icon: 'storage', label: 'Database' }
};

function init() {
    canvas = document.getElementById('workflow-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    render();
}

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    render();
}

function addNode(type, x, y, config = {}) {
    nodes.push({
        id: Date.now(),
        type,
        x: x || canvas.width / 2,
        y: y || canvas.height / 2,
        width: 200,
        height: 80,
        config: config
    });
    render();
}

function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (e.button === 2) {
        const node = getNodeAt(x, y);
        if (node) {
            connectingFrom = node;
        }
        return;
    }
    
    const node = getNodeAt(x, y);
    if (node) {
        selectedNode = node;
        isDragging = true;
        dragOffset = { x: x - node.x, y: y - node.y };
    } else {
        selectedNode = null;
    }
    render();
}

function openConfigModal(node) {
    const modal = document.getElementById('config-modal');
    const form = document.getElementById('config-form');
    
    form.innerHTML = '';
    
    if (node.type === 'trigger') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Nombre del Trigger</label>
                <input type="text" id="cfg-name" value="${node.config.name || ''}" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary" placeholder="Ej: Alerta Alta Detectada">
            </div>
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Tipo de Evento</label>
                <select id="cfg-event" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                    <option value="alert" ${node.config.event === 'alert' ? 'selected' : ''}>Nueva Alerta</option>
                    <option value="vulnerability" ${node.config.event === 'vulnerability' ? 'selected' : ''}>Vulnerabilidad Detectada</option>
                    <option value="schedule" ${node.config.event === 'schedule' ? 'selected' : ''}>Programado</option>
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Condición</label>
                <input type="text" id="cfg-condition" value="${node.config.condition || ''}" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary" placeholder="Ej: prioridad == 'ALTA'">
            </div>
        `;
    } else if (node.type === 'condition') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Condición IF</label>
                <input type="text" id="cfg-if" value="${node.config.if || ''}" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary" placeholder="Ej: ip_origen == '192.168.1.100'">
            </div>
        `;
    } else if (node.type === 'action') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Tipo de Acción</label>
                <select id="cfg-action" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                    <option value="block_ip" ${node.config.action === 'block_ip' ? 'selected' : ''}>Bloquear IP</option>
                    <option value="isolate_host" ${node.config.action === 'isolate_host' ? 'selected' : ''}>Aislar Host</option>
                    <option value="run_script" ${node.config.action === 'run_script' ? 'selected' : ''}>Ejecutar Script</option>
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Parámetros</label>
                <input type="text" id="cfg-params" value="${node.config.params || ''}" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary" placeholder="Ej: timeout=30">
            </div>
        `;
    } else if (node.type === 'notification') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Canal</label>
                <select id="cfg-channel" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                    <option value="email" ${node.config.channel === 'email' ? 'selected' : ''}>Email</option>
                    <option value="telegram" ${node.config.channel === 'telegram' ? 'selected' : ''}>Telegram</option>
                    <option value="slack" ${node.config.channel === 'slack' ? 'selected' : ''}>Slack</option>
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Mensaje</label>
                <textarea id="cfg-message" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary" rows="3" placeholder="Mensaje a enviar">${node.config.message || ''}</textarea>
            </div>
        `;
    } else if (node.type === 'delay') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Tiempo de espera (segundos)</label>
                <input type="number" id="cfg-delay" value="${node.config.delay || 60}" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary" placeholder="60">
            </div>
        `;
    } else if (node.type === 'webhook') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">URL</label>
                <input type="text" id="cfg-url" value="${node.config.url || ''}" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary" placeholder="https://api.example.com/webhook">
            </div>
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Método</label>
                <select id="cfg-method" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                    <option value="POST" ${node.config.method === 'POST' ? 'selected' : ''}>POST</option>
                    <option value="GET" ${node.config.method === 'GET' ? 'selected' : ''}>GET</option>
                </select>
            </div>
        `;
    } else if (node.type === 'script') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Script</label>
                <textarea id="cfg-script" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary font-mono text-sm" rows="5" placeholder="#!/bin/bash\necho 'Hello'">${node.config.script || ''}</textarea>
            </div>
        `;
    } else if (node.type === 'database') {
        form.innerHTML = `
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Operación</label>
                <select id="cfg-operation" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary">
                    <option value="insert" ${node.config.operation === 'insert' ? 'selected' : ''}>INSERT</option>
                    <option value="update" ${node.config.operation === 'update' ? 'selected' : ''}>UPDATE</option>
                    <option value="query" ${node.config.operation === 'query' ? 'selected' : ''}>QUERY</option>
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-white text-sm font-semibold mb-2">Query</label>
                <textarea id="cfg-query" class="w-full px-3 py-2 bg-[#283039] text-white rounded-lg border border-[#3b4754] focus:outline-none focus:border-primary font-mono text-sm" rows="3" placeholder="SELECT * FROM alerts">${node.config.query || ''}</textarea>
            </div>
        `;
    }
    
    modal.classList.remove('hidden');
    
    const saveBtn = document.getElementById('btn-save-config');
    saveBtn.onclick = () => {
        if (node.type === 'trigger') {
            node.config = {
                name: document.getElementById('cfg-name').value,
                event: document.getElementById('cfg-event').value,
                condition: document.getElementById('cfg-condition').value,
                label: document.getElementById('cfg-name').value || 'Sin configurar'
            };
        } else if (node.type === 'condition') {
            node.config = {
                if: document.getElementById('cfg-if').value,
                label: document.getElementById('cfg-if').value || 'Sin configurar'
            };
        } else if (node.type === 'action') {
            node.config = {
                action: document.getElementById('cfg-action').value,
                params: document.getElementById('cfg-params').value,
                label: document.getElementById('cfg-action').value || 'Sin configurar'
            };
        } else if (node.type === 'notification') {
            node.config = {
                channel: document.getElementById('cfg-channel').value,
                message: document.getElementById('cfg-message').value,
                label: document.getElementById('cfg-channel').value || 'Sin configurar'
            };
        } else if (node.type === 'delay') {
            node.config = {
                delay: document.getElementById('cfg-delay').value,
                label: `Esperar ${document.getElementById('cfg-delay').value}s`
            };
        } else if (node.type === 'webhook') {
            node.config = {
                url: document.getElementById('cfg-url').value,
                method: document.getElementById('cfg-method').value,
                label: document.getElementById('cfg-method').value + ' Webhook'
            };
        } else if (node.type === 'script') {
            node.config = {
                script: document.getElementById('cfg-script').value,
                label: 'Ejecutar Script'
            };
        } else if (node.type === 'database') {
            node.config = {
                operation: document.getElementById('cfg-operation').value,
                query: document.getElementById('cfg-query').value,
                label: document.getElementById('cfg-operation').value.toUpperCase()
            };
        }
        modal.classList.add('hidden');
        render();
    };
    
    document.getElementById('config-modal').onclick = (e) => {
        if (e.target.id === 'config-modal') {
            modal.classList.add('hidden');
        }
    };
}

function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging && selectedNode) {
        selectedNode.x = x - dragOffset.x;
        selectedNode.y = y - dragOffset.y;
        render();
    }
    
    if (connectingFrom) {
        render();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(connectingFrom.x + connectingFrom.width / 2, connectingFrom.y + connectingFrom.height);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function onMouseUp(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (connectingFrom) {
        const targetNode = getNodeAt(x, y);
        if (targetNode && targetNode !== connectingFrom) {
            connections.push({ from: connectingFrom.id, to: targetNode.id });
        }
        connectingFrom = null;
    }
    
    isDragging = false;
    render();
}

function getNodeAt(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (x >= node.x && x <= node.x + node.width &&
            y >= node.y && y <= node.y + node.height) {
            return node;
        }
    }
    return null;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw connections
    connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (fromNode && toNode) {
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height);
            ctx.lineTo(toNode.x + toNode.width / 2, toNode.y);
            ctx.stroke();
            
            // Arrow
            const angle = Math.atan2(toNode.y - (fromNode.y + fromNode.height), toNode.x + toNode.width / 2 - (fromNode.x + fromNode.width / 2));
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(toNode.x + toNode.width / 2, toNode.y);
            ctx.lineTo(toNode.x + toNode.width / 2 - 10 * Math.cos(angle - Math.PI / 6), toNode.y - 10 * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(toNode.x + toNode.width / 2 - 10 * Math.cos(angle + Math.PI / 6), toNode.y - 10 * Math.sin(angle + Math.PI / 6));
            ctx.fill();
        }
    });
    
    // Draw nodes
    nodes.forEach(node => {
        const type = nodeTypes[node.type];
        ctx.fillStyle = node === selectedNode ? '#444' : '#1c2127';
        ctx.strokeStyle = type.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, node.width, node.height, 8);
        ctx.fill();
        ctx.stroke();
        
        // Node label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(type.label, node.x + node.width / 2, node.y + 25);
        
        // Node config
        ctx.font = '12px Inter';
        ctx.fillStyle = '#aaa';
        const configText = node.config.label || 'Click to configure';
        ctx.fillText(configText, node.x + node.width / 2, node.y + 50);
    });
}

function clearCanvas() {
    if (confirm('¿Limpiar todo el canvas?')) {
        nodes = [];
        connections = [];
        selectedNode = null;
        render();
    }
}

function deleteSelected() {
    if (selectedNode) {
        nodes = nodes.filter(n => n.id !== selectedNode.id);
        connections = connections.filter(c => c.from !== selectedNode.id && c.to !== selectedNode.id);
        selectedNode = null;
        render();
    }
}

async function saveWorkflow() {
    const workflow = { 
        id: Date.now().toString(),
        nodes, 
        connections 
    };
    
    try {
        const response = await fetch('/soar/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workflow)
        });
        const data = await response.json();
        localStorage.setItem('soar-workflow-id', data.id);
        localStorage.setItem('soar-workflow', JSON.stringify(workflow));
        alert('Workflow guardado y listo para activar');
    } catch (error) {
        console.error('Error guardando workflow:', error);
        alert('Error guardando workflow');
    }
}

async function activateWorkflow() {
    const workflowId = localStorage.getItem('soar-workflow-id');
    if (!workflowId) {
        alert('Primero guarda el workflow');
        return;
    }
    
    try {
        await fetch(`/soar/workflows/${workflowId}/activate`, {
            method: 'POST'
        });
        alert('Workflow activado! Se ejecutará automáticamente con nuevas alertas');
    } catch (error) {
        console.error('Error activando workflow:', error);
        alert('Error activando workflow');
    }
}

function loadWorkflow() {
    const saved = localStorage.getItem('soar-workflow');
    if (saved) {
        const workflow = JSON.parse(saved);
        nodes = workflow.nodes;
        connections = workflow.connections;
        render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    loadWorkflow();
    
    document.getElementById('btn-save').addEventListener('click', saveWorkflow);
    document.getElementById('btn-activate').addEventListener('click', activateWorkflow);
    document.getElementById('btn-clear').addEventListener('click', clearCanvas);
    document.getElementById('btn-delete').addEventListener('click', deleteSelected);
    document.getElementById('btn-config').addEventListener('click', () => {
        if (selectedNode) openConfigModal(selectedNode);
    });
    document.querySelectorAll('.btn-cancel-modal, #btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('config-modal').classList.add('hidden');
        });
    });
    
    document.querySelectorAll('.node-template').forEach(el => {
        el.addEventListener('click', () => {
            const type = el.dataset.type;
            addNode(type);
        });
    });
    
    canvas.addEventListener('dblclick', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const node = getNodeAt(x, y);
        if (node) openConfigModal(node);
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && selectedNode) {
            deleteSelected();
        }
    });
});
