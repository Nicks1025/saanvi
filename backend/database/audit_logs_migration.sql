CREATE TABLE audit_logs (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    payload JSONB,
    user_agent TEXT,
    is_error BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    status_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying logs by user
CREATE INDEX idx_audit_logs_user_uuid ON audit_logs(user_uuid);
-- Index for chronological queries
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
-- Index for filtering errors
CREATE INDEX idx_audit_logs_is_error ON audit_logs(is_error);
