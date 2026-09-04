-- 1. Create Arrow Puzzle Progress Table
CREATE TABLE IF NOT EXISTS public.arrow_puzzle_progress (
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL,
    shape VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL,
    time_taken_seconds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT arrow_puzzle_progress_pkey PRIMARY KEY (uuid),
    CONSTRAINT fk_arrow_puzzle_user
        FOREIGN KEY (user_uuid)
        REFERENCES public.users (uuid)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_arrow_puzzle_user_shape ON public.arrow_puzzle_progress(user_uuid, shape);

-- 2. Insert the permission for playing Arrow Puzzle
INSERT INTO public.permissions (uuid, permission, name, description) 
VALUES (
    gen_random_uuid(), 
    'games.puzzles.arrowpuzzle', 
    'Arrow Puzzle Access', 
    'Allows the user to access and play the full Arrow Puzzle game'
)
ON CONFLICT (permission) DO NOTHING;

-- 3. Optionally assign this to the Super Admin role (assuming 'Super Admin' exists)
INSERT INTO public.role_permissions (uuid, role_uuid, permission_uuid)
SELECT gen_random_uuid(), r.uuid, p.uuid
FROM public.roles r, public.permissions p
WHERE r.name = 'Super Admin' AND p.permission = 'games.puzzles.arrowpuzzle'
ON CONFLICT (role_uuid, permission_uuid) DO NOTHING;
