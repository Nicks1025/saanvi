CREATE TABLE IF NOT EXISTS sph_user_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  show_on_signup BOOLEAN DEFAULT FALSE,
  show_on_admin_create BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  options_config JSONB,
  validation_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed core protected fields
DO $$
BEGIN
  -- Email
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'email') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order)
    VALUES ('email', 'Email Address', 'email', TRUE, TRUE, TRUE, TRUE, 5);
  END IF;

  -- First Name
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'first_name') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order)
    VALUES ('first_name', 'First Name', 'shorttext', TRUE, TRUE, TRUE, TRUE, 10);
  END IF;

  -- Last Name
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'last_name') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order)
    VALUES ('last_name', 'Last Name', 'shorttext', TRUE, TRUE, TRUE, TRUE, 20);
  END IF;

  -- Display Name
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'display_name') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order)
    VALUES ('display_name', 'Display Name', 'shorttext', TRUE, TRUE, TRUE, TRUE, 30);
  END IF;

  -- Phone Number
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'phone_number') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order)
    VALUES ('phone_number', 'Phone Number', 'phonenumber', TRUE, FALSE, TRUE, TRUE, 40);
  END IF;

  -- Date of Birth
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'date_of_birth') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order)
    VALUES ('date_of_birth', 'Date of Birth', 'date', TRUE, FALSE, TRUE, TRUE, 50);
  END IF;

  -- Gender
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'gender') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order, options_config)
    VALUES ('gender', 'Gender', 'dropdown', TRUE, TRUE, TRUE, TRUE, 60, '[{"label": "Male", "value": "male"}, {"label": "Female", "value": "female"}, {"label": "Other", "value": "other"}, {"label": "Prefer not to say", "value": "prefer_not_to_say"}]'::jsonb);
  END IF;

  -- Language
  IF NOT EXISTS (SELECT 1 FROM sph_user_fields WHERE field_name = 'language') THEN
    INSERT INTO sph_user_fields (field_name, label, field_type, is_system, is_required, show_on_signup, show_on_admin_create, display_order, options_config)
    VALUES ('language', 'Language', 'dropdown', TRUE, TRUE, FALSE, TRUE, 70, '[{"label": "English", "value": "en"}, {"label": "हिंदी", "value": "hi"}]'::jsonb);
  END IF;



END $$;
