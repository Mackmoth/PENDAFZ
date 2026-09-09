import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type MemberInsert = Database["public"]["Tables"]["members"]["Insert"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];

export const MEMBER_STATUSES = ["active", "inactive", "suspended", "visitor", "alumni"] as const;
export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused", "visitor"] as const;
export const PAYMENT_TYPES = [
  "membership_fee",
  "registration_fee",
  "donation",
  "fundraising",
  "project",
  "expense",
  "other",
] as const;
export const PAYMENT_METHODS = ["cash", "mobile_money", "bank_transfer", "card", "other"] as const;
export const EVENT_STATUSES = ["draft", "scheduled", "ongoing", "completed", "cancelled"] as const;

export const labelize = (s: string | null | undefined) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const formatMoney = (n: number | string | null | undefined, currency = "UGX") => {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
};

export const initialsOf = (name: string | null | undefined) =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0]!)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const fmtDate = (d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
  d ? new Date(d).toLocaleDateString(undefined, opts ?? { month: "short", day: "numeric", year: "numeric" }) : "—";

export const fmtDateTime = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const ageFromDob = (dob: string | null | undefined) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

export const upcomingBirthdayDate = (dob: string) => {
  const d = new Date(dob);
  const now = new Date();
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return next;
};

export const daysUntil = (target: Date) => {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86400000);
};

export async function fetchBranches() {
  const { data, error } = await supabase.from("branches").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Branch[];
}
export async function fetchDepartments() {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Department[];
}
