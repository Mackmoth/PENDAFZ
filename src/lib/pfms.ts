import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type MemberInsert = Database["public"]["Tables"]["members"]["Insert"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
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
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v);
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
  d
    ? new Date(d).toLocaleDateString(
        undefined,
        opts ?? { month: "short", day: "numeric", year: "numeric" },
      )
    : "—";

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

export const formatRelativeTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return fmtDate(d);
};

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

export async function fetchDepartments() {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Department[];
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const periodLabel = (month?: number | null, year?: number | null) =>
  month && month >= 1 && month <= 12 ? `${MONTHS[month - 1]}${year ? ` ${year}` : ""}` : "";

export const periodKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

export type MembershipMonth = {
  year: number;
  month: number;
  required: number;
  covered: number;
  balance: number;
  status: "paid" | "partial" | "outstanding";
};

export type Membership = {
  fee: number;
  months: Map<string, MembershipMonth>;
  credit: number;
  firstPeriod: { year: number; month: number } | null;
  lastPeriod: { year: number; month: number } | null;
};

export function computeMembership(
  fee: number,
  payments: {
    period_month?: number | null;
    period_year?: number | null;
    amount: number | string;
  }[],
): Membership {
  const unit = Math.max(0, Number(fee) || 0);
  const res: Membership = {
    fee: unit,
    months: new Map(),
    credit: 0,
    firstPeriod: null,
    lastPeriod: null,
  };
  if (unit <= 0) return res;

  const sums = new Map<string, number>();
  for (const p of payments) {
    const y = p.period_year;
    const m = p.period_month;
    const amt = Number(p.amount);
    if (!y || !m || y < 2000 || m < 1 || m > 12 || !Number.isFinite(amt) || amt <= 0) continue;
    const key = periodKey(y, m);
    sums.set(key, (sums.get(key) ?? 0) + amt);
  }
  if (sums.size === 0) return res;

  const keys = [...sums.keys()].sort();
  const first = keys[0];
  const last = keys[keys.length - 1];
  const [fy, fm] = first.split("-").map(Number);
  const [ly, lm] = last.split("-").map(Number);
  res.firstPeriod = { year: fy, month: fm };
  res.lastPeriod = { year: ly, month: lm };

  let y = fy;
  let m = fm;
  let carry = 0;
  let guard = 0;
  // Walk from the first period forward; keep going while credit rolls forward.
  while (guard < 600) {
    guard++;
    const key = periodKey(y, m);
    const total = (sums.get(key) ?? 0) + carry;
    const covered = Math.min(unit, total);
    carry = total - covered;
    const status: MembershipMonth["status"] =
      covered >= unit ? "paid" : covered > 0 ? "partial" : "outstanding";
    res.months.set(key, {
      year: y,
      month: m,
      required: unit,
      covered,
      balance: Math.max(0, unit - covered),
      status,
    });
    res.lastPeriod = { year: y, month: m };
    if (carry <= 0 && (y > ly || (y === ly && m >= lm))) break;
    if (m === 12) {
      m = 1;
      y++;
    } else {
      m++;
    }
  }
  res.credit = carry;
  return res;
}

export function membershipMonth(
  membership: Membership,
  year: number,
  month: number,
): MembershipMonth {
  const key = periodKey(year, month);
  const hit = membership.months.get(key);
  if (hit) return hit;
  return {
    year,
    month,
    required: membership.fee,
    covered: 0,
    balance: membership.fee,
    status: "outstanding",
  };
}

export function totalOutstanding(
  membership: Membership,
  through?: { year: number; month: number },
): number {
  const start = membership.firstPeriod;
  if (!start || membership.fee <= 0) return 0;
  const end =
    through ??
    (() => {
      const d = new Date();
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    })();
  let total = 0;
  let y = start.year;
  let m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    if (y > end.year || (y === end.year && m > end.month)) break;
    total += membershipMonth(membership, y, m).balance;
    if (m === 12) {
      m = 1;
      y++;
    } else {
      m++;
    }
  }
  return Math.max(0, total);
}
