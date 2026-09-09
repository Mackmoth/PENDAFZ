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