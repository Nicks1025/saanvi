-- 1. Alter conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS description TEXT NULL,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT NULL,
ADD COLUMN IF NOT EXISTS created_by_uuid UUID NULL;

ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS fk_conversations_created_by;

ALTER TABLE public.conversations
ADD CONSTRAINT fk_conversations_created_by
    FOREIGN KEY (created_by_uuid)
    REFERENCES public.users (uuid)
    ON DELETE RESTRICT;

-- 2. Create message_receipts table
CREATE TABLE IF NOT EXISTS public.message_receipts (
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

CREATE INDEX IF NOT EXISTS idx_message_receipts_message ON public.message_receipts(message_uuid);
CREATE INDEX IF NOT EXISTS idx_message_receipts_user ON public.message_receipts(user_uuid);

-- 3. Enable RLS
ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Note: Supabase realtime depends on RLS if 'public' schema tables are broadcast via pg_changes.

-- chat_requests: sender or receiver
DROP POLICY IF EXISTS chat_requests_select ON public.chat_requests;
CREATE POLICY chat_requests_select ON public.chat_requests FOR SELECT USING (auth.uid() = sender_uuid OR auth.uid() = receiver_uuid);

DROP POLICY IF EXISTS chat_requests_insert ON public.chat_requests;
CREATE POLICY chat_requests_insert ON public.chat_requests FOR INSERT WITH CHECK (auth.uid() = sender_uuid);

DROP POLICY IF EXISTS chat_requests_update ON public.chat_requests;
CREATE POLICY chat_requests_update ON public.chat_requests FOR UPDATE USING (auth.uid() = sender_uuid OR auth.uid() = receiver_uuid);

-- conversations: user is member
DROP POLICY IF EXISTS conversations_select ON public.conversations;
CREATE POLICY conversations_select ON public.conversations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm 
        WHERE cm.conversation_uuid = conversations.uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL
    )
);

-- conversation_members
DROP POLICY IF EXISTS conversation_members_select ON public.conversation_members;
CREATE POLICY conversation_members_select ON public.conversation_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm 
        WHERE cm.conversation_uuid = conversation_members.conversation_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL
    )
);

-- messages
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm 
        WHERE cm.conversation_uuid = messages.conversation_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL
    )
);

-- message_receipts
DROP POLICY IF EXISTS message_receipts_select ON public.message_receipts;
CREATE POLICY message_receipts_select ON public.message_receipts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON m.conversation_uuid = cm.conversation_uuid
        WHERE m.uuid = message_receipts.message_uuid AND cm.user_uuid = auth.uid() AND cm.archived_at IS NULL
    )
);

-- user_blocks
DROP POLICY IF EXISTS user_blocks_select ON public.user_blocks;
CREATE POLICY user_blocks_select ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_uuid OR auth.uid() = blocked_uuid);

-- Enable Replication for Realtime on all chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;
