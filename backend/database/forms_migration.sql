CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: sph_form
CREATE TABLE IF NOT EXISTS sph_form (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    form_slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INTERNAL', 'EXTERNAL')),
    created_by UUID REFERENCES users(uuid) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(uuid) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sph_form_created_by ON sph_form(created_by);
CREATE INDEX IF NOT EXISTS idx_sph_form_form_slug ON sph_form(form_slug);

DROP TABLE IF EXISTS form_template_fields CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TABLE IF EXISTS form_record_values CASCADE;
DROP TABLE IF EXISTS form_records CASCADE;
DROP TABLE IF EXISTS form_fields CASCADE;

-- Note: Form fields, templates, and records are now stored dynamically in tables named 
-- sph_form_{form_slug}_fields, sph_form_{form_slug}_templates, sph_form_{form_slug}_template_fields, sph_form_{form_slug}_record
