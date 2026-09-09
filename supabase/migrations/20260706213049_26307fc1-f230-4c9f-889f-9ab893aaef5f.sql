
-- 1. Account status enum + profile enrichment
CREATE TYPE public.account_status AS ENUM (
  'active','inactive','suspended','locked','pending_verification','archived'
);

ALTER TABLE public.profiles
  ADD COLUMN gender TEXT,
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN date_joined DATE DEFAULT CURRENT_DATE,
  ADD COLUMN last_login TIMESTAMPTZ,
  ADD COLUMN status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN department_id UUID,
  ADD COLUMN branch_id UUID,
  ADD COLUMN accepted_terms_at TIMESTAMPTZ,
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Branches
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  contact_person TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER branches_updated BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Wire foreign keys on profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD CONSTRAINT profiles_branch_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- 4. Permissions catalog
CREATE TABLE public.permissions (
  key TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage permissions" ON public.permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- 5. Role-permission defaults
CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage role_permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- 6. Per-user permission overrides
CREATE TABLE public.user_permission_overrides (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own overrides" ON public.user_permission_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage overrides" ON public.user_permission_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- 7. Permission-check helper
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _override BOOLEAN;
BEGIN
  SELECT granted INTO _override FROM public.user_permission_overrides
    WHERE user_id = _user_id AND permission_key = _permission_key;
  IF _override IS NOT NULL THEN
    RETURN _override;
  END IF;

  -- super_admin has everything
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND rp.permission_key = _permission_key
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.user_has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated, service_role;

-- 8. Responsibilities
CREATE TABLE public.responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsibilities TO authenticated;
GRANT ALL ON public.responsibilities TO service_role;
ALTER TABLE public.responsibilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view responsibilities" ON public.responsibilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage responsibilities" ON public.responsibilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER responsibilities_updated BEFORE UPDATE ON public.responsibilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_responsibilities (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responsibility_id UUID NOT NULL REFERENCES public.responsibilities(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, responsibility_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_responsibilities TO authenticated;
GRANT ALL ON public.user_responsibilities TO service_role;
ALTER TABLE public.user_responsibilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own responsibilities or admins all" ON public.user_responsibilities FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage user_responsibilities" ON public.user_responsibilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- 9. Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT,
  target_type TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_user_idx ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own audit or admin all" ON public.audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 10. Login history
CREATE TABLE public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX login_history_user_idx ON public.login_history(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own login history or admin all" ON public.login_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own login history" ON public.login_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 11. Organization settings (single row)
CREATE TABLE public.organization_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Penda Foundation',
  motto TEXT,
  logo_url TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  theme TEXT NOT NULL DEFAULT 'light',
  membership_fee_amount NUMERIC(12,2) DEFAULT 0,
  membership_fee_currency TEXT DEFAULT 'KES',
  financial_year_start DATE,
  attendance_rules JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  backup_schedule TEXT,
  session_timeout_minutes INT DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.organization_settings TO authenticated;
GRANT UPDATE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view org settings" ON public.organization_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin update org settings" ON public.organization_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER org_settings_updated BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12. Seed permissions
INSERT INTO public.permissions (key, module, name, description) VALUES
  ('members.view','Members','View Members','See member list and profiles'),
  ('members.create','Members','Register Members','Register new members'),
  ('members.edit','Members','Edit Members','Update member records'),
  ('members.archive','Members','Archive Members','Archive members'),
  ('members.delete','Members','Delete Members','Permanently delete members'),
  ('attendance.view','Attendance','View Attendance','View attendance records'),
  ('attendance.record','Attendance','Record Attendance','Record attendance'),
  ('attendance.edit','Attendance','Edit Attendance','Modify attendance entries'),
  ('attendance.delete','Attendance','Delete Attendance','Remove attendance records'),
  ('finance.view','Finance','View Payments','View payment records'),
  ('finance.record','Finance','Record Payments','Record payments'),
  ('finance.edit','Finance','Edit Payments','Edit payment records'),
  ('finance.delete','Finance','Delete Payments','Remove payments'),
  ('finance.print_receipt','Finance','Print Receipts','Print payment receipts'),
  ('finance.export','Finance','Export Finance Reports','Export finance data'),
  ('events.view','Events','View Events','View events'),
  ('events.create','Events','Create Events','Create new events'),
  ('events.edit','Events','Edit Events','Modify events'),
  ('events.delete','Events','Delete Events','Remove events'),
  ('reports.view','Reports','View Reports','View reports'),
  ('reports.generate','Reports','Generate Reports','Generate reports'),
  ('reports.export','Reports','Export Reports','Export reports'),
  ('users.view','Users','View Users','View system users'),
  ('users.create','Users','Create Users','Invite new users'),
  ('users.edit','Users','Edit Users','Edit user accounts'),
  ('users.delete','Users','Delete Users','Delete user accounts'),
  ('departments.manage','Departments','Manage Departments','Add/edit/remove departments'),
  ('branches.manage','Branches','Manage Branches','Add/edit/remove branches'),
  ('documents.view','Documents','View Documents','View documents'),
  ('documents.upload','Documents','Upload Documents','Upload documents'),
  ('documents.delete','Documents','Delete Documents','Remove documents'),
  ('announcements.view','Announcements','View Announcements','View announcements'),
  ('announcements.create','Announcements','Create Announcements','Create announcements'),
  ('announcements.delete','Announcements','Delete Announcements','Remove announcements'),
  ('settings.view','Settings','View Settings','View organization settings'),
  ('settings.edit','Settings','Edit Settings','Change organization settings'),
  ('audit.view','Audit','View Audit Logs','View system activity logs');

-- 13. Seed role-permission defaults
-- super_admin: everything (has bypass in function but seed for visibility)
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'super_admin', key FROM public.permissions;

-- admin: everything except delete users, delete permissions & settings edit (still has most)
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'admin', key FROM public.permissions
  WHERE key NOT IN ('users.delete');

-- finance_officer
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('finance_officer','finance.view'),('finance_officer','finance.record'),
  ('finance_officer','finance.edit'),('finance_officer','finance.print_receipt'),
  ('finance_officer','finance.export'),('finance_officer','reports.view'),
  ('finance_officer','reports.generate'),('finance_officer','reports.export'),
  ('finance_officer','members.view');

-- attendance_officer
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('attendance_officer','attendance.view'),('attendance_officer','attendance.record'),
  ('attendance_officer','attendance.edit'),('attendance_officer','reports.view'),
  ('attendance_officer','members.view');

-- welfare_officer
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('welfare_officer','members.view'),('welfare_officer','members.edit'),
  ('welfare_officer','events.view'),('welfare_officer','announcements.view'),
  ('welfare_officer','reports.view');

-- secretary
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('secretary','members.view'),('secretary','members.create'),('secretary','members.edit'),
  ('secretary','documents.view'),('secretary','documents.upload'),
  ('secretary','announcements.view'),('secretary','announcements.create'),
  ('secretary','events.view'),('secretary','events.create'),('secretary','events.edit');

-- branch_leader
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('branch_leader','members.view'),('branch_leader','attendance.view'),
  ('branch_leader','events.view'),('branch_leader','reports.view'),
  ('branch_leader','announcements.view');

-- department_leader
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('department_leader','members.view'),('department_leader','attendance.view'),
  ('department_leader','events.view'),('department_leader','announcements.view');

-- member (basic viewing)
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('member','announcements.view'),('member','events.view');

-- 14. Seed departments, branches, responsibilities, org settings
INSERT INTO public.departments (name, description) VALUES
  ('Administration','Overall administration'),
  ('Finance','Financial operations and reporting'),
  ('Welfare','Member welfare and support'),
  ('Music','Music ministry'),
  ('Sports','Sports and recreation'),
  ('Education','Education and training'),
  ('IT','Technology and systems'),
  ('Projects','Community and organization projects');

INSERT INTO public.branches (name, location) VALUES
  ('Main Branch','Headquarters');

INSERT INTO public.responsibilities (title, description) VALUES
  ('Record Membership Fees','Collect and record monthly membership fees'),
  ('Print Receipts','Issue printed receipts for payments'),
  ('Approve Donations','Approve incoming donations'),
  ('Generate Financial Reports','Prepare periodic financial reports'),
  ('Record Attendance','Take attendance during events'),
  ('Edit Attendance','Correct attendance records'),
  ('Generate Attendance Reports','Produce attendance summaries'),
  ('Register Members','Add new members to the system'),
  ('Update Member Records','Keep member records current'),
  ('Upload Documents','Upload organization documents'),
  ('Create Announcements','Publish announcements');

INSERT INTO public.organization_settings (id, name, motto)
  VALUES (1, 'Penda Foundation', 'Serving our community with love')
  ON CONFLICT (id) DO NOTHING;

-- 15. Update handle_new_user to set default status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active'::public.account_status
         ELSE 'pending_verification'::public.account_status END
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;
