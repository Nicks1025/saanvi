-- ============================================================
-- MESSAGE ATTACHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS message_attachments (
    uuid UUID NOT NULL,
    message_uuid UUID NOT NULL,
    
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    attachment_type VARCHAR(50) NOT NULL DEFAULT 'file', -- image, video, audio, document, file
    
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

-- RLS Policy (Assuming Saanvi uses Supabase Auth)
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_attachments_select ON public.message_attachments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON m.conversation_uuid = cm.conversation_uuid
        WHERE m.uuid = message_attachments.message_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL
    )
);
