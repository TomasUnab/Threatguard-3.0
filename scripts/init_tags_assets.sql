-- Crear tabla de activos (assets)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    os_type VARCHAR(50), -- windows, linux, macos
    os_version VARCHAR(100),
    antivirus_active BOOLEAN DEFAULT false,
    antivirus_name VARCHAR(100),
    telemetry_enabled BOOLEAN DEFAULT false,
    telemetry_last_report TIMESTAMP,
    last_seen TIMESTAMP,
    agent_version VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, offline
    risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    description TEXT,
    category VARCHAR(50), -- system, security, compliance, custom
    auto_assign BOOLEAN DEFAULT false, -- Si se asigna automáticamente
    auto_criteria JSONB, -- Criterios para auto-asignación
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de relación muchos-a-muchos entre assets y tags
CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by VARCHAR(100), -- username o 'system' para auto
    PRIMARY KEY (asset_id, tag_id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_assets_hostname ON assets(hostname);
CREATE INDEX IF NOT EXISTS idx_assets_ip ON assets(ip_address);
CREATE INDEX IF NOT EXISTS idx_assets_os_type ON assets(os_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag_id);

-- Insertar tags predefinidos del sistema
INSERT INTO tags (name, color, description, category, auto_assign, auto_criteria) VALUES
    ('Windows 10', '#0078D4', 'Sistema operativo Windows 10', 'system', true, '{"os_type": "windows", "os_version_contains": "10"}'),
    ('Windows 11', '#0067C0', 'Sistema operativo Windows 11', 'system', true, '{"os_type": "windows", "os_version_contains": "11"}'),
    ('Linux', '#FCC624', 'Sistema operativo Linux', 'system', true, '{"os_type": "linux"}'),
    ('macOS', '#000000', 'Sistema operativo macOS', 'system', true, '{"os_type": "macos"}'),
    ('Antivirus Activo', '#10B981', 'Tiene antivirus activo', 'security', true, '{"antivirus_active": true}'),
    ('Sin Antivirus', '#EF4444', 'No tiene antivirus activo', 'security', true, '{"antivirus_active": false}'),
    ('Telemetría Activa', '#06B6D4', 'Telemetría habilitada y reportando', 'security', true, '{"telemetry_enabled": true}'),
    ('Sin Telemetría', '#F97316', 'Telemetría deshabilitada', 'security', true, '{"telemetry_enabled": false}'),
    ('Crítico', '#DC2626', 'Activo crítico para la organización', 'compliance', false, null),
    ('Producción', '#F59E0B', 'Servidor de producción', 'custom', false, null),
    ('Desarrollo', '#8B5CF6', 'Entorno de desarrollo', 'custom', false, null),
    ('Servidor', '#6366F1', 'Servidor', 'custom', false, null),
    ('Workstation', '#3B82F6', 'Estación de trabajo', 'custom', false, null),
    ('Cumplimiento', '#059669', 'Cumple con políticas de seguridad', 'compliance', false, null)
ON CONFLICT (name) DO NOTHING;

-- Insertar algunos activos de ejemplo
INSERT INTO assets (hostname, ip_address, mac_address, os_type, os_version, antivirus_active, antivirus_name, telemetry_enabled, status, risk_score, last_seen) VALUES
    ('SERVER-DC01', '192.168.1.10', '00:1A:2B:3C:4D:5E', 'windows', 'Windows Server 2019', true, 'Windows Defender', true, 'active', 25, NOW()),
    ('WORKSTATION-01', '192.168.1.101', '00:1A:2B:3C:4D:5F', 'windows', 'Windows 11 Pro', true, 'McAfee', true, 'active', 15, NOW()),
    ('DEV-SERVER', '192.168.1.50', '00:1A:2B:3C:4D:60', 'linux', 'Ubuntu 22.04 LTS', false, null, false, 'active', 45, NOW()),
    ('MAC-LAPTOP', '192.168.1.102', '00:1A:2B:3C:4D:61', 'macos', 'macOS Sonoma 14.1', true, 'Sophos', true, 'active', 10, NOW())
ON CONFLICT (hostname) DO NOTHING;

-- Comentarios sobre las tablas
COMMENT ON TABLE assets IS 'Tabla de activos monitoreados por ThreatGuard';
COMMENT ON TABLE tags IS 'Etiquetas para organizar y clasificar activos';
COMMENT ON TABLE asset_tags IS 'Relación muchos-a-muchos entre activos y etiquetas';

COMMENT ON COLUMN tags.auto_assign IS 'Si true, el tag se asigna automáticamente según criterios';
COMMENT ON COLUMN tags.auto_criteria IS 'Criterios JSON para asignación automática de tags';
