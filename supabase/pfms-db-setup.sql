-- PFMS combined schema setup
-- Target project: wwypcdcbhhklorftvwwt


-- === 1) 20260706212311_289cc0e9-3678-4701-b51b-aeca43b4bba1.sql ===


-- Roles enum
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

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
phone TEXT,
  department TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- === 2) 20260706212323_8daa79e1-7ace-49ba-9579-208adbbae230.sql ===


REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;


-- === 3) 20260706213049_26307fc1-f230-4c9f-889f-9ab893aaef5f.sql ===


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

-- 3. Branches (removed — single-location org) 
-- Wire foreign keys on profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

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

-- department_leader
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('department_leader','members.view'),('department_leader','attendance.view'),
  ('department_leader','events.view'),('department_leader','announcements.view');

-- member (basic viewing)
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('member','announcements.view'),('member','events.view');

-- 14. Seed departments, responsibilities, org settings
INSERT INTO public.departments (name, description) VALUES
  ('Administration','Overall administration'),
  ('Finance','Financial operations and reporting'),
  ('Welfare','Member welfare and support'),
  ('Education','Education and training'),
  ('IT','Technology and systems');

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

INSERT INTO public.organization_settings (id, name, motto, membership_fee_amount, membership_fee_currency)
  VALUES (1, 'Penda Foundation', 'Serving our community with love', 5000, 'UGX')
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


-- === 4) 20260707150111_dac778a2-2eea-441c-ad4a-7f9814ecfb8c.sql ===


-- =========================================================================
-- Enums
-- =========================================================================
CREATE TYPE public.member_status AS ENUM ('active','inactive','suspended','visitor','alumni');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused','visitor');
CREATE TYPE public.payment_type AS ENUM ('membership_fee','registration_fee','donation','fundraising','project','expense','other');
CREATE TYPE public.payment_method AS ENUM ('cash','mobile_money','bank_transfer','card','other');
CREATE TYPE public.payment_status AS ENUM ('pending','completed','failed','refunded');
CREATE TYPE public.event_status AS ENUM ('draft','scheduled','ongoing','completed','cancelled');
CREATE TYPE public.announcement_status AS ENUM ('draft','scheduled','published','archived');
CREATE TYPE public.notification_type AS ENUM ('event','birthday','payment','announcement','attendance','system');

-- =========================================================================
-- Helper: staff role check
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid);
$$;

-- =========================================================================
-- Membership number counter
-- =========================================================================
CREATE TABLE public.membership_counters (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.membership_counters TO authenticated;
GRANT ALL ON public.membership_counters TO service_role;
ALTER TABLE public.membership_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read counters" ON public.membership_counters FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_membership_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y INT := EXTRACT(YEAR FROM now())::INT; n INT;
BEGIN
  INSERT INTO public.membership_counters(year, last_number) VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_number = public.membership_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN 'PF-' || y::text || '-' || lpad(n::text, 4, '0');
END $$;

-- Receipt number counter
CREATE TABLE public.receipt_counters (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.receipt_counters TO authenticated;
GRANT ALL ON public.receipt_counters TO service_role;
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read receipt counters" ON public.receipt_counters FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y INT := EXTRACT(YEAR FROM now())::INT; n INT;
BEGIN
  INSERT INTO public.receipt_counters(year, last_number) VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_number = public.receipt_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN 'RCP-' || y::text || '-' || lpad(n::text, 6, '0');
END $$;

-- =========================================================================
-- Members
-- =========================================================================
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_number TEXT UNIQUE NOT NULL,
  qr_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  full_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  nationality TEXT,
  national_id TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
address TEXT,
  photo_url TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  category TEXT,
  status public.member_status NOT NULL DEFAULT 'active',
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  occupation TEXT,
  education_level TEXT,
  skills TEXT,
  talents TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,
  notes TEXT,
  linked_user_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read members" ON public.members FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "member managers write" ON public.members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'));

CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.members_set_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.membership_number IS NULL OR NEW.membership_number = '' THEN
    NEW.membership_number := public.next_membership_number();
  END IF;
  IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
    NEW.qr_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_members_defaults BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.members_set_defaults();

CREATE INDEX idx_members_department ON public.members(department_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_full_name ON public.members(full_name);

-- =========================================================================
-- Member documents
-- =========================================================================
CREATE TABLE public.member_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_documents TO authenticated;
GRANT ALL ON public.member_documents TO service_role;
ALTER TABLE public.member_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read docs" ON public.member_documents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "doc managers write" ON public.member_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'welfare_officer'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'welfare_officer'));

-- =========================================================================
-- Events
-- =========================================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  venue TEXT,
  category TEXT,
  organizer_id UUID,
department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  poster_url TEXT,
  max_participants INT,
  status public.event_status NOT NULL DEFAULT 'scheduled',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read events" ON public.events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "event managers write" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'));
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_events_date ON public.events(event_date);

-- Event registrations
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE (event_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read event regs" ON public.event_registrations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "event reg managers" ON public.event_registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'));

-- =========================================================================
-- Attendance
-- =========================================================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_in TIME,
status public.attendance_status NOT NULL DEFAULT 'present',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read attendance" ON public.attendance FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "attendance managers" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'attendance_officer'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'attendance_officer'));

-- Prevent duplicate attendance for same event/member
CREATE UNIQUE INDEX uniq_attendance_event_member ON public.attendance(event_id, member_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX idx_attendance_member ON public.attendance(member_id);

-- =========================================================================
-- Payments
-- =========================================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  payment_type public.payment_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  method public.payment_method NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT,
  recorded_by UUID,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.payment_status NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "finance managers" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'finance_officer'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'finance_officer'));

CREATE OR REPLACE FUNCTION public.payments_set_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := public.next_receipt_number();
  END IF;
  IF NEW.recorded_by IS NULL THEN NEW.recorded_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_payments_defaults BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.payments_set_defaults();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payments_member ON public.payments(member_id);
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at);

-- =========================================================================
-- Announcements
-- =========================================================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  status public.announcement_status NOT NULL DEFAULT 'published',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read announcements" ON public.announcements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "announcement authors" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary'));
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- Notifications
-- =========================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'secretary') OR user_id = auth.uid());
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- =========================================================================
-- Storage policies for member-files bucket
-- =========================================================================
CREATE POLICY "member files read staff" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'member-files' AND public.is_staff(auth.uid()));
CREATE POLICY "member files write managers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'member-files' AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'welfare_officer')
  ));
CREATE POLICY "member files update managers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'member-files' AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'welfare_officer')
  ));
CREATE POLICY "member files delete managers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'member-files' AND (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'welfare_officer')
  ));


-- === 5) 20260827190702_8fba3ee7-a54d-4357-b5eb-aaced343edcb.sql ===

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;

  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN _is_first THEN 'active'::public.account_status
         ELSE 'pending_verification'::public.account_status END
  )
  ON CONFLICT (id) DO NOTHING;

  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;

-- === 6) 20260901101144_aa70c3ba-c44f-49f4-95e8-cf53a1649d30.sql ===

CREATE TABLE public.user_departments (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, department_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_departments TO authenticated;
GRANT ALL ON public.user_departments TO service_role;

ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view department assignments"
  ON public.user_departments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins manage department assignments"
  ON public.user_departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- === 7) 20260901101349_f862858e-29bc-468f-8ddc-869b199b2656.sql ===

ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'UGX';
ALTER TABLE public.organization_settings ALTER COLUMN membership_fee_currency SET DEFAULT 'UGX';
UPDATE public.payments SET currency = 'UGX' WHERE currency = 'KES';
UPDATE public.organization_settings SET membership_fee_currency = 'UGX' WHERE membership_fee_currency = 'KES' OR membership_fee_currency IS NULL;

-- Create member-files storage bucket (if missing)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('member-files', 'member-files', false)
  ON CONFLICT (id) DO NOTHING;

