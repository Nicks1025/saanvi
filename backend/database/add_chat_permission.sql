INSERT INTO public.permissions (uuid, permission, name, description) 
VALUES (gen_random_uuid(), 'chat.access', 'Access Chat', 'Allows the user to access the real-time chat feature')
ON CONFLICT (permission) DO NOTHING;
