-- Agregar tags de telemetría
INSERT INTO tags (name, color, description, category, auto_assign, auto_criteria) 
VALUES 
    ('Telemetría Activa', '#06B6D4', 'Telemetría habilitada y reportando', 'security', true, '{"telemetry_enabled": true}'),
    ('Sin Telemetría', '#F97316', 'Telemetría deshabilitada', 'security', true, '{"telemetry_enabled": false}')
ON CONFLICT (name) DO NOTHING;

-- Actualizar activos con telemetría habilitada
UPDATE assets SET telemetry_enabled = true WHERE hostname IN ('SERVER-DC01', 'WORKSTATION-01', 'MAC-LAPTOP');
UPDATE assets SET telemetry_enabled = false WHERE hostname = 'DEV-SERVER';
