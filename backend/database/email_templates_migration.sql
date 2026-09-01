-- email_templates_migration.sql

-- 1. Create sph_email_templates table
CREATE TABLE IF NOT EXISTS sph_email_templates (
  uuid UUID PRIMARY KEY,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  plain_text_body TEXT,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  available_variables JSONB,
  linked_table VARCHAR(100) DEFAULT NULL,
  linked_table_key VARCHAR(100) DEFAULT 'email',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create sph_email_logs table
CREATE TABLE IF NOT EXISTS sph_email_logs (
  uuid UUID PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  job_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'PENDING',
  attempts INTEGER DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_template_key FOREIGN KEY (template_key) REFERENCES sph_email_templates (template_key) ON DELETE SET NULL
);

-- 3. Pre-seed basic templates (Inactive by default so admin can review)
INSERT INTO sph_email_templates (
  uuid, template_key, name, description, subject, html_body, plain_text_body, status, available_variables, linked_table, linked_table_key
) VALUES (
  gen_random_uuid(),
  'USER_ACCOUNT_CREATED',
  'User Account Created',
  'Sent when a new user is created by an admin',
  'Welcome to {{$$appName$$}}, {{first_name}}!',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;"><h2>Welcome to {{$$appName$$}}!</h2><p>Hello {{first_name}},</p><p>Your {{$$appName$$}} account has been successfully created.</p><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Email:</strong> {{email}}</p><p style="margin: 8px 0 0 0;"><strong>Password:</strong> {{password}}</p></div><p>You can log in using the credentials above.</p><p style="color: #ef4444; font-weight: bold;">For security, please change your password after your first login.</p><div style="margin: 30px 0;"><a href="{{$$loginUrl$$}}" style="background-color: #aa3bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to {{$$appName$$}}</a></div><p>Best regards,<br>The {{$$appName$$}} Team</p></div>',
  'Hello {{first_name}},

Welcome to {{$$appName$$}}.

Your account has been successfully created.

Email: {{email}}
Password: {{password}}

Login at: {{$$loginUrl$$}}

For security, please change your password after your first login.

Best regards,
The {{$$appName$$}} Team',
  'ACTIVE',
  '["first_name", "email", "password"]',
  'user_details',
  'email'
) ON CONFLICT (template_key) DO NOTHING;
