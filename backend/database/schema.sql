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
  language character varying(20) not null default 'en'::character varying,
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


-- ============================================================
-- 1. CHAT REQUESTS
-- ============================================================

CREATE TABLE chat_requests (
    uuid UUID NOT NULL,
    sender_uuid UUID NOT NULL,
    receiver_uuid UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE NULL,

    CONSTRAINT chat_requests_pkey PRIMARY KEY (uuid),

    CONSTRAINT fk_chat_requests_sender
        FOREIGN KEY (sender_uuid)
        REFERENCES public.users (uuid)
        ON DELETE RESTRICT,

    CONSTRAINT fk_chat_requests_receiver
        FOREIGN KEY (receiver_uuid)
        REFERENCES public.users (uuid)
        ON DELETE RESTRICT,

    CONSTRAINT chk_chat_requests_status
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),

    CONSTRAINT chk_chat_requests_different_users
        CHECK (sender_uuid <> receiver_uuid)
);

CREATE INDEX idx_chat_requests_sender
    ON public.chat_requests (sender_uuid);

CREATE INDEX idx_chat_requests_receiver
    ON public.chat_requests (receiver_uuid);

CREATE INDEX idx_chat_requests_receiver_status
    ON public.chat_requests (receiver_uuid, status);

CREATE INDEX idx_chat_requests_sender_status
    ON public.chat_requests (sender_uuid, status);


-- ============================================================
-- 2. CONVERSATIONS
-- ============================================================

CREATE TABLE conversations (
    uuid UUID NOT NULL,

    is_group BOOLEAN NOT NULL DEFAULT false,
    name VARCHAR(255) NULL,
    description TEXT NULL,
    profile_image_url TEXT NULL,
    created_by_uuid UUID NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL,

    CONSTRAINT conversations_pkey PRIMARY KEY (uuid),
    CONSTRAINT fk_conversations_created_by
        FOREIGN KEY (created_by_uuid)
        REFERENCES public.users (uuid)
        ON DELETE RESTRICT
);

CREATE INDEX idx_conversations_archived_at
    ON public.conversations (archived_at);


-- ============================================================
-- 3. CONVERSATION MEMBERS
-- ============================================================

CREATE TABLE conversation_members (
    uuid UUID NOT NULL,
    conversation_uuid UUID NOT NULL,
    user_uuid UUID NOT NULL,
    
    wallpaper_url TEXT NULL,

    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL,

    CONSTRAINT conversation_members_pkey PRIMARY KEY (uuid),

    CONSTRAINT fk_conversation_members_conversation
        FOREIGN KEY (conversation_uuid)
        REFERENCES public.conversations (uuid)
        ON DELETE CASCADE,

    CONSTRAINT fk_conversation_members_user
        FOREIGN KEY (user_uuid)
        REFERENCES public.users (uuid)
        ON DELETE RESTRICT,

    CONSTRAINT uq_conversation_member
        UNIQUE (conversation_uuid, user_uuid)
);

CREATE INDEX idx_conversation_members_conversation
    ON public.conversation_members (conversation_uuid);

CREATE INDEX idx_conversation_members_user
    ON public.conversation_members (user_uuid);

CREATE INDEX idx_conversation_members_user_archived
    ON public.conversation_members (user_uuid, archived_at);


-- ============================================================
-- 4. MESSAGES
-- ============================================================

CREATE TABLE messages (
    uuid UUID NOT NULL,
    conversation_uuid UUID NOT NULL,
    sender_uuid UUID NOT NULL,

    message TEXT NULL,

    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    seen_at TIMESTAMP WITH TIME ZONE NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL,

    CONSTRAINT messages_pkey PRIMARY KEY (uuid),

    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_uuid)
        REFERENCES public.conversations (uuid)
        ON DELETE CASCADE,

    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_uuid)
        REFERENCES public.users (uuid)
        ON DELETE RESTRICT
);

CREATE INDEX idx_messages_conversation
    ON public.messages (conversation_uuid);

CREATE INDEX idx_messages_conversation_sent_at
    ON public.messages (conversation_uuid, sent_at);

CREATE INDEX idx_messages_sender
    ON public.messages (sender_uuid);

CREATE INDEX idx_messages_archived_at
    ON public.messages (archived_at);


-- ============================================================
-- 5. USER BLOCKS
-- ============================================================

CREATE TABLE user_blocks (
    uuid UUID NOT NULL,
    blocker_uuid UUID NOT NULL,
    blocked_uuid UUID NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL,

    CONSTRAINT user_blocks_pkey PRIMARY KEY (uuid),

    CONSTRAINT fk_user_blocks_blocker
        FOREIGN KEY (blocker_uuid)
        REFERENCES public.users (uuid)
        ON DELETE RESTRICT,

    CONSTRAINT fk_user_blocks_blocked
        FOREIGN KEY (blocked_uuid)
        REFERENCES public.users (uuid)
        ON DELETE RESTRICT,

    CONSTRAINT uq_user_block
        UNIQUE (blocker_uuid, blocked_uuid),

    CONSTRAINT chk_user_blocks_different_users
        CHECK (blocker_uuid <> blocked_uuid)
);

CREATE INDEX idx_user_blocks_blocker
    ON public.user_blocks (blocker_uuid);

CREATE INDEX idx_user_blocks_blocked
    ON public.user_blocks (blocked_uuid);

CREATE INDEX idx_user_blocks_blocker_archived
    ON public.user_blocks (blocker_uuid, archived_at);

CREATE INDEX idx_user_blocks_blocked_archived
    ON public.user_blocks (blocked_uuid, archived_at);

-- ============================================================
-- 6. MESSAGE RECEIPTS
-- ============================================================

CREATE TABLE message_receipts (
    uuid UUID NOT NULL,
    message_uuid UUID NOT NULL,
    user_uuid UUID NOT NULL,

    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    seen_at TIMESTAMP WITH TIME ZONE NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL,

    CONSTRAINT message_receipts_pkey PRIMARY KEY (uuid),

    CONSTRAINT fk_message_receipts_message
        FOREIGN KEY (message_uuid)
        REFERENCES public.messages (uuid)
        ON DELETE CASCADE,

    CONSTRAINT fk_message_receipts_user
        FOREIGN KEY (user_uuid)
        REFERENCES public.users (uuid)
        ON DELETE CASCADE,

    CONSTRAINT uq_message_receipt
        UNIQUE (message_uuid, user_uuid)
);

CREATE INDEX idx_message_receipts_message ON public.message_receipts(message_uuid);
CREATE INDEX idx_message_receipts_user ON public.message_receipts(user_uuid);

-- ============================================================
-- RLS POLICIES & REALTIME
-- ============================================================

ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_requests_select ON public.chat_requests FOR SELECT USING (auth.uid() = sender_uuid OR auth.uid() = receiver_uuid);
CREATE POLICY chat_requests_insert ON public.chat_requests FOR INSERT WITH CHECK (auth.uid() = sender_uuid);
CREATE POLICY chat_requests_update ON public.chat_requests FOR UPDATE USING (auth.uid() = sender_uuid OR auth.uid() = receiver_uuid);

CREATE POLICY conversations_select ON public.conversations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_uuid = conversations.uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL)
);

CREATE POLICY conversation_members_select ON public.conversation_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_uuid = conversation_members.conversation_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL)
);

CREATE POLICY messages_select ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_uuid = messages.conversation_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL)
);

CREATE POLICY message_receipts_select ON public.message_receipts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON m.conversation_uuid = cm.conversation_uuid
        WHERE m.uuid = message_receipts.message_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL
    )
);

CREATE POLICY user_blocks_select ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_uuid OR auth.uid() = blocked_uuid);

-- ============================================================
-- 7. MESSAGE ATTACHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.message_attachments (
    uuid UUID NOT NULL,
    message_uuid UUID NOT NULL,
    
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    attachment_type VARCHAR(50) NOT NULL DEFAULT 'file',
    
    width INTEGER NULL,
    height INTEGER NULL,
    duration INTEGER NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL,

    CONSTRAINT message_attachments_pkey PRIMARY KEY (uuid),

    CONSTRAINT fk_message_attachments_message
        FOREIGN KEY (message_uuid)
        REFERENCES public.messages (uuid)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message 
    ON public.message_attachments (message_uuid);

CREATE INDEX IF NOT EXISTS idx_message_attachments_archived 
    ON public.message_attachments (archived_at);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_attachments_select ON public.message_attachments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON m.conversation_uuid = cm.conversation_uuid
        WHERE m.uuid = message_attachments.message_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL
    )
);