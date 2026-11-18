-- Shared audit log table used by the Planer task API.
CREATE TABLE IF NOT EXISTS planer.audit_logs (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    resource_name VARCHAR(255),
    workspace_id VARCHAR(255),
    espace_id VARCHAR(255),
    ip_address VARCHAR(100),
    status VARCHAR(50) DEFAULT 'SUCCESS',
    details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON planer.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON planer.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON planer.audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON planer.audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON planer.audit_logs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_espace ON planer.audit_logs (espace_id);
