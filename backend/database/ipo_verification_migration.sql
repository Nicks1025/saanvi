-- Migration: IPO Verification capabilities
-- Description: Dynamic capability discovery and verification tables

CREATE TABLE IF NOT EXISTS ipo_registrars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registrar_id UUID REFERENCES ipo_registrars(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ipo_applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE, -- Ties the applicant to a Saanvi user (owner)
    name VARCHAR(255) NOT NULL,
    identifiers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ipo_verification_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registrar_id UUID NOT NULL REFERENCES ipo_registrars(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    adapter_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    discovery_status VARCHAR(50),
    discovery_error TEXT,
    last_discovery_attempt_at TIMESTAMP WITH TIME ZONE,
    last_successful_discovery_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ipo_verification_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES ipo_verification_sources(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    captcha_required BOOLEAN DEFAULT FALSE,
    captcha_type VARCHAR(50),
    captcha_scope VARCHAR(50),
    supports_automated BOOLEAN DEFAULT FALSE,
    supports_batch BOOLEAN DEFAULT FALSE,
    supports_session BOOLEAN DEFAULT FALSE,
    rate_limit_per_min INTEGER,
    concurrency_limit INTEGER,
    last_discovered_at TIMESTAMP WITH TIME ZONE,
    last_successful_verification_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ipo_verification_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id UUID NOT NULL REFERENCES ipo_verification_capabilities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ipo_verification_method_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method_id UUID NOT NULL REFERENCES ipo_verification_methods(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    is_optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ipo_verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    source_id UUID REFERENCES ipo_verification_sources(id) ON DELETE SET NULL,
    method_id UUID REFERENCES ipo_verification_methods(id) ON DELETE SET NULL,
    capability_version INTEGER NOT NULL,
    identifier_fingerprint VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    applied_quantity INTEGER,
    allotted_quantity INTEGER,
    error_category VARCHAR(100),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for frequent queries and cache lookups
CREATE INDEX IF NOT EXISTS idx_ipo_verif_results_cache ON ipo_verification_results(ipo_id, source_id, method_id, capability_version, identifier_fingerprint);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_verif_caps_active ON ipo_verification_capabilities(source_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ipo_verif_methods_cap ON ipo_verification_methods(capability_id);
CREATE INDEX IF NOT EXISTS idx_ipo_verif_method_fields ON ipo_verification_method_fields(method_id);
CREATE INDEX IF NOT EXISTS idx_ipo_verif_sources_active ON ipo_verification_sources(registrar_id, is_active);

-- Safety Constraints
ALTER TABLE ipo_verification_capabilities DROP CONSTRAINT IF EXISTS unique_source_version;
ALTER TABLE ipo_verification_capabilities ADD CONSTRAINT unique_source_version UNIQUE(source_id, version);

ALTER TABLE ipo_verification_methods DROP CONSTRAINT IF EXISTS unique_cap_method;
ALTER TABLE ipo_verification_methods ADD CONSTRAINT unique_cap_method UNIQUE(capability_id, name);

ALTER TABLE ipo_verification_method_fields DROP CONSTRAINT IF EXISTS unique_method_field;
ALTER TABLE ipo_verification_method_fields ADD CONSTRAINT unique_method_field UNIQUE(method_id, field_name);
