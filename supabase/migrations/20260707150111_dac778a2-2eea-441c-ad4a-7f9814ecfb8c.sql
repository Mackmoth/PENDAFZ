
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
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
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

CREATE INDEX idx_members_branch ON public.members(branch_id);
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
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
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
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
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
