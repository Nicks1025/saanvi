-- dynamic_variables_migration.sql

CREATE TABLE IF NOT EXISTS sph_dynamic_variables (
  uuid UUID PRIMARY KEY,
  variable_name VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  value TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Seed some initial dynamic variables
INSERT INTO sph_dynamic_variables (uuid, variable_name, label, description, value)
VALUES 
(gen_random_uuid(), '$$appName$$', 'App Name', 'The name of the application', 'Saanvi'),
(gen_random_uuid(), '$$supportEmail$$', 'Support Email', 'Email address for support inquiries', 'support@saanviworld.com'),
(gen_random_uuid(), '$$loginUrl$$', 'Login URL', 'URL to the login page', 'http://www.saanviworld.com/login'),
(gen_random_uuid(), '$$saanviLogoUrl$$', 'Saanvi Logo URL', 'URL to the Saanvi logo', 'https://mwmcvvoreqylanemnicz.supabase.co/storage/v1/object/public/public-assets/saanvi_logo.png')
ON CONFLICT (variable_name) DO NOTHING;
