-- public.users schema
create table public.users (
  uuid uuid not null,
  email public.citext not null,
  password_hash text not null,
  is_mfa_enabled boolean not null default false,
  is_email_verified boolean not null default false,
  status character varying(20) not null default 'active'::character varying,
  failed_login_attempts integer not null default 0,
  locked_until timestamp with time zone null,
  last_login_at timestamp with time zone null,
  password_changed_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone null,
  constraint users_pkey primary key (uuid),
  constraint users_email_key unique (email),
  constraint users_failed_login_attempts_check check ((failed_login_attempts >= 0)),
  constraint users_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'locked'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_status on public.users using btree (status) TABLESPACE pg_default;

create index IF not exists idx_users_archived_at on public.users using btree (archived_at) TABLESPACE pg_default;

-- public.user_details schema
create table public.user_details (
  uuid uuid not null,
  user_uuid uuid not null,
  first_name character varying(100) null,
  last_name character varying(100) null,
  display_name character varying(200) null,
  phone_number character varying(30) null,
  date_of_birth date null,
  gender character varying(50) null,
  profile_image_url text null,
  country character varying(10) null,
  timezone character varying(100) null,
  language character varying(20) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone null,
  constraint user_details_pkey primary key (uuid),
  constraint user_details_user_uuid_key unique (user_uuid),
  constraint fk_user_details_user foreign KEY (user_uuid) references users (uuid) on delete RESTRICT
) TABLESPACE pg_default;

create index IF not exists idx_user_details_user_uuid on public.user_details using btree (user_uuid) TABLESPACE pg_default;

create index IF not exists idx_user_details_archived_at on public.user_details using btree (archived_at) TABLESPACE pg_default;

-- public.words schema (Master dictionary)
create table IF not exists public.words (
  uuid uuid not null default gen_random_uuid(),
  word character varying(50) not null,
  length integer not null,
  difficulty character varying(20) not null default 'easy',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone null,
  constraint words_pkey primary key (uuid),
  constraint words_word_key unique (word)
) TABLESPACE pg_default;

-- public.word_search_puzzle_words schema (Relationship)
create table IF not exists public.word_search_puzzle_words (
  uuid uuid not null default gen_random_uuid(),
  puzzle_uuid uuid not null,
  word_uuid uuid not null,
  start_row integer not null,
  start_column integer not null,
  end_row integer not null,
  end_column integer not null,
  direction character varying(20) not null,
  word_order integer not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone null,
  constraint wspw_pkey primary key (uuid),
  constraint fk_wspw_puzzle foreign KEY (puzzle_uuid) references word_search_puzzles (uuid) on delete cascade,
  constraint fk_wspw_word foreign KEY (word_uuid) references words (uuid) on delete restrict
) TABLESPACE pg_default;

create index IF not exists idx_wspw_puzzle_uuid on public.word_search_puzzle_words using btree (puzzle_uuid) TABLESPACE pg_default;

-- Seed data for words table
insert into public.words (word, length, difficulty) values 
('APPLE', 5, 'easy'),
('DOG', 3, 'easy'),
('CAT', 3, 'easy'),
('ELEPHANT', 8, 'hard'),
('FLOWER', 6, 'medium'),
('HOUSE', 5, 'easy'),
('TIGER', 5, 'medium'),
('ZEBRA', 5, 'medium'),
('MONKEY', 6, 'medium'),
('GIRAFFE', 7, 'hard'),
('SNAKE', 5, 'medium'),
('BIRD', 4, 'easy'),
('FISH', 4, 'easy'),
('SHARK', 5, 'medium'),
('WHALE', 5, 'medium'),
('DOLPHIN', 7, 'hard'),
('PENGUIN', 7, 'hard'),
('EAGLE', 5, 'medium'),
('FROG', 4, 'easy'),
('HORSE', 5, 'medium')
on conflict (word) do nothing;


CREATE TABLE permissions (
    uuid UUID PRIMARY KEY,
    permission VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);


CREATE TABLE user_permissions (
    uuid UUID PRIMARY KEY,
    user_uuid UUID NOT NULL,
    permission_uuid UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT fk_user_permissions_user
        FOREIGN KEY (user_uuid)
        REFERENCES users(uuid),

    CONSTRAINT fk_user_permissions_permission
        FOREIGN KEY (permission_uuid)
        REFERENCES permissions(uuid),

    CONSTRAINT uq_user_permission
        UNIQUE (user_uuid, permission_uuid)
);


CREATE TABLE roles (
    uuid UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE user_roles (
    uuid UUID PRIMARY KEY,
    user_uuid UUID NOT NULL,
    role_uuid UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_uuid)
        REFERENCES users(uuid),

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_uuid)
        REFERENCES roles(uuid),

    CONSTRAINT uq_user_role
        UNIQUE (user_uuid, role_uuid)
);


CREATE TABLE role_permissions (
    uuid UUID PRIMARY KEY,
    role_uuid UUID NOT NULL,
    permission_uuid UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_uuid)
        REFERENCES roles(uuid),

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_uuid)
        REFERENCES permissions(uuid),

    CONSTRAINT uq_role_permission
        UNIQUE (role_uuid, permission_uuid)
);
