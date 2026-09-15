CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: sph_object (Replaces sph_form)
CREATE TABLE IF NOT EXISTS sph_object (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    object_slug VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID REFERENCES users(uuid) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(uuid) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sph_object_created_by ON sph_object(created_by);
CREATE INDEX IF NOT EXISTS idx_sph_object_object_slug ON sph_object(object_slug);

-- Table: sph_form_wizard
CREATE TABLE IF NOT EXISTS sph_form_wizard (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_uuid UUID NOT NULL REFERENCES sph_object(uuid) ON DELETE CASCADE,
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INTERNAL', 'EXTERNAL')),
    created_by UUID REFERENCES users(uuid) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(uuid) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sph_form_wizard_created_by ON sph_form_wizard(created_by);
CREATE INDEX IF NOT EXISTS idx_sph_form_wizard_object_uuid ON sph_form_wizard(object_uuid);

-- Table: sph_form_wizard_phase
CREATE TABLE IF NOT EXISTS sph_form_wizard_phase (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wizard_uuid UUID NOT NULL REFERENCES sph_form_wizard(uuid) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sph_form_wizard_phase_wizard_uuid ON sph_form_wizard_phase(wizard_uuid);

-- Table: sph_form_wizard_step
CREATE TABLE IF NOT EXISTS sph_form_wizard_step (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_uuid UUID NOT NULL REFERENCES sph_form_wizard_phase(uuid) ON DELETE CASCADE,
    template_uuid UUID NOT NULL, -- references dynamic table sph_object_{slug}_templates(uuid), validated in backend
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sph_form_wizard_step_phase_uuid ON sph_form_wizard_step(phase_uuid);
