-- alter_email_templates_builder.sql
ALTER TABLE sph_email_templates 
ADD COLUMN IF NOT EXISTS editor_mode VARCHAR(20) DEFAULT 'VISUAL',
ADD COLUMN IF NOT EXISTS design_json JSONB,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
