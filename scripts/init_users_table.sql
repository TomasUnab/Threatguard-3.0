-- Script para crear la tabla de usuarios en ThreatGuard

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Usuario Regular',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    CONSTRAINT chk_role CHECK (role IN ('Admin', 'Developer', 'Usuario Regular', 'Viewer')),
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Insertar usuarios por defecto
INSERT INTO users (username, email, password_hash, role, status) VALUES
('admin', 'admin@threatguard.local', 'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd4', 'Admin', 'active'),
('analyst', 'analyst@threatguard.local', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Usuario Regular', 'active'),
('developer', 'dev@threatguard.local', 'e67af12f9b5e3cd6c7ade8f31f26268fba9c22afc2f0b1f7c2cfb0d9f0bdce42', 'Developer', 'active')
ON CONFLICT (username) DO NOTHING;

-- Comentarios sobre las columnas
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema ThreatGuard';
COMMENT ON COLUMN users.id IS 'Identificador único del usuario';
COMMENT ON COLUMN users.username IS 'Nombre de usuario único';
COMMENT ON COLUMN users.email IS 'Correo electrónico del usuario';
COMMENT ON COLUMN users.password_hash IS 'Hash SHA-256 de la contraseña';
COMMENT ON COLUMN users.role IS 'Rol del usuario: Admin, Developer, Usuario Regular, Viewer';
COMMENT ON COLUMN users.status IS 'Estado del usuario: active, inactive, suspended';
COMMENT ON COLUMN users.created_at IS 'Fecha de creación del usuario';
COMMENT ON COLUMN users.updated_at IS 'Fecha de última actualización';
COMMENT ON COLUMN users.last_login IS 'Fecha del último inicio de sesión';

-- Las contraseñas por defecto son:
-- admin: admin123
-- analyst: analyst123
-- developer: dev123
