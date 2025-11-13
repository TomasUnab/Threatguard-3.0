-- Tabla para workflows SOAR
CREATE TABLE IF NOT EXISTS soar_workflows (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT false,
    execution_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_soar_workflows_active ON soar_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_soar_workflows_updated ON soar_workflows(updated_at DESC);

-- Tabla para logs de ejecución
CREATE TABLE IF NOT EXISTS soar_execution_logs (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(255) REFERENCES soar_workflows(id) ON DELETE CASCADE,
    event_data JSONB,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soar_logs_workflow ON soar_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_soar_logs_executed ON soar_execution_logs(executed_at DESC);
