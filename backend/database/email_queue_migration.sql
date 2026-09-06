-- email_queue_migration.sql
-- Postgres-backed email queue to replace BullMQ/Redis

CREATE TABLE IF NOT EXISTS sph_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email payload
  recipient TEXT NOT NULL,
  template_key TEXT,
  subject TEXT,
  variables JSONB DEFAULT '{}',
  encrypted_variables JSONB DEFAULT '{}',
  html_body TEXT,
  plain_text TEXT,
  type VARCHAR(50) DEFAULT 'TRANSACTIONAL',
  campaign_uuid UUID,

  -- Queue management
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED, DEAD
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_details TEXT,

  -- Reference to sph_email_logs row created at enqueue time
  email_log_uuid UUID,

  -- Timestamps
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for worker polling: only PENDING rows, ordered by oldest first
CREATE INDEX IF NOT EXISTS idx_email_queue_pending
  ON sph_email_queue (scheduled_at ASC)
  WHERE status = 'PENDING';
