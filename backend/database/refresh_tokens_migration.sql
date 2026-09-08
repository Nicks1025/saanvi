CREATE TABLE public.refresh_tokens (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES public.users(uuid) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    replaced_by_token VARCHAR(255)
);

CREATE INDEX idx_refresh_tokens_user_uuid ON public.refresh_tokens(user_uuid);
CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
