INSERT INTO public.permissions (uuid, permission, name, description)
VALUES (gen_random_uuid(), 'admin.audit_logs.view', 'View Audit Logs', 'Allows viewing of system audit logs')
ON CONFLICT (permission) DO NOTHING;

DO $$ 
DECLARE
    super_admin_uuid UUID;
    perm_uuid UUID;
BEGIN
    SELECT uuid INTO super_admin_uuid FROM public.roles WHERE name = 'Super Admin';
    SELECT uuid INTO perm_uuid FROM public.permissions WHERE permission = 'admin.audit_logs.view';
    
    IF super_admin_uuid IS NOT NULL AND perm_uuid IS NOT NULL THEN
        INSERT INTO public.role_permissions (uuid, role_uuid, permission_uuid)
        VALUES (gen_random_uuid(), super_admin_uuid, perm_uuid)
        ON CONFLICT ON CONSTRAINT uq_role_permission DO NOTHING;
    END IF;
END $$;
