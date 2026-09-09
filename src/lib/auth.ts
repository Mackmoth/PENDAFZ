import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "super_admin"
  | "admin"
  | "finance_officer"
  | "attendance_officer"
  | "welfare_officer"
  | "secretary"
  | "branch_leader"
  | "department_leader"
  | "member";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  finance_officer: "Finance Officer",
  attendance_officer: "Attendance Officer",
  welfare_officer: "Welfare Officer",
  secretary: "Secretary",
  branch_leader: "Branch Leader",
  department_leader: "Department Leader",
  member: "Member",
};

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  branch: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export function useUserContext() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRoles([]);
      setLoading(authLoading);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setProfile((p as Profile) ?? null);
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (list: AppRole[]) => list.some((r) => roles.includes(r));
  const isAdmin = hasAnyRole(["super_admin", "admin"]);

  return { user, profile, roles, hasRole, hasAnyRole, isAdmin, loading };
}
