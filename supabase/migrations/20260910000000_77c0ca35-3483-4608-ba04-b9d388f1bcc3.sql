-- PFMS: Remove branches and branch_leader role
-- Penda Foundation operates a single location; branches are no longer used.

-- 1. Remove data referencing the removed role
DELETE FROM public.role_permissions WHERE role = 'branch_leader';
DELETE FROM public.user_roles WHERE role = 'branch_leader';
DELETE FROM public.permissions WHERE key = 'branches.manage';

-- 2. Drop branch columns (FK constraints are dropped with the columns)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS branch_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS branch;
ALTER TABLE public.members DROP COLUMN IF EXISTS branch_id;
ALTER TABLE public.events DROP COLUMN IF EXISTS branch_id;
ALTER TABLE public.attendance DROP COLUMN IF EXISTS branch_id;

-- 3. Drop the branches table
DROP TABLE IF EXISTS public.branches;

-- 4. Recreate app_role enum without branch_leader
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'finance_officer',
  'attendance_officer',
  'welfare_officer',
  'secretary',
  'department_leader',
  'member'
);
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
DROP TYPE public.app_role_old;

-- 5. Recreate has_role helper with the new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 6. Remove no-longer-seeded departments
DELETE FROM public.departments WHERE name IN ('Music', 'Sports', 'Projects');