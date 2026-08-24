CREATE TABLE IF NOT EXISTS notifications (
    uuid UUID PRIMARY KEY,
    user_uuid UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    entity_type VARCHAR(50),
    entity_uuid UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_uuid_created_at ON notifications(user_uuid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_uuid_is_read ON notifications(user_uuid, is_read);

CREATE TABLE IF NOT EXISTS device_tokens (
    uuid UUID PRIMARY KEY,
    user_uuid UUID NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    push_token VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_uuid, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_uuid ON device_tokens(user_uuid);
