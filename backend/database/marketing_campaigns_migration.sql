-- marketing_campaigns_migration.sql

-- 1. Add marketing_opt_in to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT TRUE;

-- 2. Alter sph_email_logs to allow NULL template_key and add type column
ALTER TABLE public.sph_email_logs ALTER COLUMN template_key DROP NOT NULL;
ALTER TABLE public.sph_email_logs ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'TRANSACTIONAL';

-- 3. Create sph_email_campaigns
CREATE TABLE IF NOT EXISTS public.sph_email_campaigns (
  uuid UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_key VARCHAR(100),
  html_body TEXT,
  status VARCHAR(50) DEFAULT 'DRAFT',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(uuid) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaign_template FOREIGN KEY (template_key) REFERENCES public.sph_email_templates(template_key) ON DELETE SET NULL
);

-- 4. Create sph_email_campaign_recipients
CREATE TABLE IF NOT EXISTS public.sph_email_campaign_recipients (
  uuid UUID PRIMARY KEY,
  campaign_uuid UUID NOT NULL REFERENCES public.sph_email_campaigns(uuid) ON DELETE CASCADE,
  user_uuid UUID REFERENCES public.users(uuid) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  provider_message_id VARCHAR(255),
  error_details TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add necessary permissions for marketing campaigns
INSERT INTO public.permissions (uuid, permission, name, description)
VALUES 
  (gen_random_uuid(), 'manage_campaigns', 'Manage Campaigns', 'Allows managing marketing email campaigns')
ON CONFLICT (permission) DO NOTHING;
