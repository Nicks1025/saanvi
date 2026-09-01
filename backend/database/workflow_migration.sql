-- 1. System Events Registry
CREATE TABLE IF NOT EXISTS sph_system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  payload_schema JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Transactional Outbox
CREATE TABLE IF NOT EXISTS sph_event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key VARCHAR(100) NOT NULL REFERENCES sph_system_events(event_key),
  aggregate_type VARCHAR(50),
  aggregate_id UUID,
  payload JSONB NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  publish_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workflows
CREATE TABLE IF NOT EXISTS sph_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event_key VARCHAR(100) NOT NULL REFERENCES sph_system_events(event_key),
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Workflow Conditions
CREATE TABLE IF NOT EXISTS sph_workflow_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES sph_workflows(id) ON DELETE CASCADE,
  field_path VARCHAR(255),
  operator VARCHAR(50) NOT NULL, -- ALWAYS, EXISTS, EQUALS, NOT_EQUALS
  expected_value VARCHAR(255),
  execution_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workflow Actions
CREATE TABLE IF NOT EXISTS sph_workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES sph_workflows(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- SEND_EMAIL, etc.
  configuration JSONB NOT NULL, -- { "template_key": "USER_ACCOUNT_CREATED", "recipient_field": "event.data.email", "variables": { "userName": "event.data.userName" } }
  execution_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Workflow Executions (for Idempotency and Audit)
CREATE TABLE IF NOT EXISTS sph_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES sph_event_outbox(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES sph_workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
  error_details TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (event_id, workflow_id) -- Core idempotency guarantee
);

-- Seed USER_CREATED
INSERT INTO sph_system_events (event_key, name, description, payload_schema)
VALUES (
  'USER_CREATED', 
  'User Created', 
  'Triggered when an admin creates a new user.',
  '{"type": "object", "properties": {"userId": {"type": "string"}, "email": {"type": "string"}, "firstName": {"type": "string"}, "encryptedPassword": {"type": "string"}}}'
) ON CONFLICT (event_key) DO NOTHING;

-- Seed default workflow mapping (this replaces the hardcoded code)
DO $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- Insert workflow only if it doesn't exist to prevent duplicates on rerun
  IF NOT EXISTS (SELECT 1 FROM sph_workflows WHERE name = 'Welcome New User') THEN
    INSERT INTO sph_workflows (id, trigger_event_key, name, description, active)
    VALUES (gen_random_uuid(), 'USER_CREATED', 'Welcome New User', 'Sends a welcome email to the newly created user.', true)
    RETURNING id INTO v_workflow_id;

    INSERT INTO sph_workflow_conditions (workflow_id, operator)
    VALUES (v_workflow_id, 'ALWAYS');

    INSERT INTO sph_workflow_actions (workflow_id, action_type, configuration)
    VALUES (
      v_workflow_id, 
      'SEND_EMAIL', 
      '{
        "template_key": "USER_ACCOUNT_CREATED",
        "recipient_field": "event.data.email",
        "variables": {
          "userName": "event.data.firstName",
          "loginIdentifier": "event.data.email",
          "password": "event.data.encryptedPassword",
          "loginUrl": "event.data.loginUrl",
          "saanviLogoUrl": "event.data.saanviLogoUrl"
        }
      }'::jsonb
    );
  END IF;
END $$;
