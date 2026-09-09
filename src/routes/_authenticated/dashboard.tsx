import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext, ROLE_LABELS } from "@/lib/auth";
import {
  daysUntil, formatMoney, upcomingBirthdayDate, type Announcement, type EventRow, type Member,
} from "@/lib/pfms";
import {
  UserPlus, ClipboardCheck, DollarSign, CalendarPlus, Megaphone, FileText,
  Users, TrendingUp, Cake, CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PFMS" },
      { name: "description", content: "Your Penda Foundation overview." },
    ],
  }),
  component: Dashboard,
});

const QUICK_ACTIONS = [
  { label: "Register Member", icon: UserPlus, to: "/members", roles: ["super_admin", "admin", "secretary"] },
  { label: "Record Attendance", icon: ClipboardCheck, to: "/attendance", roles: ["super_admin", "admin", "attendance_officer"] },
  { label: "Record Payment", icon: DollarSign, to: "/finance", roles: ["super_admin", "admin", "finance_officer"] },
  { label: "Create Event", icon: CalendarPlus, to: "/events", roles: ["super_admin", "admin", "secretary"] },
  { label: "Announcement", icon: Megaphone, to: "/announcements", roles: ["super_admin", "admin", "secretary"] },
  { label: "View Reports", icon: FileText, to: "/reports", roles: ["super_admin", "admin", "finance_officer"] },
] as const;

function Dashboard() {
  const { profile, roles, isAdmin } = useUserContext();
  const primaryRole = roles[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

      const [{ count: totalMembers }, { count: activeMembers }, attendanceToday, upcomingEventsRes, birthdaysRes, monthPaymentsRes] = await Promise.all([
        supabase.from("members").select("*", { count: "exact", head: true }),
        supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("attendance_date", dayStart.toISOString().slice(0, 10)),
        supabase.from("events").select("*").gte("event_date", dayStart.toISOString().slice(0, 10)).order("event_date").limit(5),
        supabase.from("members").select("id, full_name, date_of_birth, photo_url").not("date_of_birth", "is", null),
        supabase.from("payments").select("amount, payment_type").gte("paid_at", monthStart.toISOString()),
      ]);

      const birthdayList = ((birthdaysRes.data ?? []) as Pick<Member, "id" | "full_name" | "date_of_birth" | "photo_url">[])
        .map((m) => ({ ...m, days: daysUntil(upcomingBirthdayDate(m.date_of_birth!)) }))
        .filter((m) => m.days >= 0 && m.days <= 7)
        .sort((a, b) => a.days - b.days);

      const income = (monthPaymentsRes.data ?? []).filter((p) => p.payment_type !== "expense").reduce((s, p) => s + Number(p.amount), 0);

      return {
        totalMembers: totalMembers ?? 0,
        activeMembers: activeMembers ?? 0,
        attendanceToday: attendanceToday.count ?? 0,
        upcomingEvents: (upcomingEventsRes.data ?? []) as EventRow[],
        birthdays: birthdayList,
        monthlyIncome: income,
      };
    },
  });

  const announcements = useQuery({
    queryKey: ["dashboard", "announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements").select("*")
        .eq("status", "published")
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(3);
      return (data ?? []) as Announcement[];
    },
  });

  const visibleActions = QUICK_ACTIONS.filter(
    (a) => isAdmin || a.roles.some((r) => roles.includes(r as never)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="text-2xl font-semibold text-foreground mt-1">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {primaryRole && <Badge variant="secondary">{ROLE_LABELS[primaryRole]}</Badge>}
            {profile?.department && <Badge variant="outline">{profile.department}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Members" value={String(stats.data?.totalMembers ?? "—")} trend={`${stats.data?.activeMembers ?? 0} active`} icon={Users} tone="primary" />
        <Stat label="Today's Attendance" value={String(stats.data?.attendanceToday ?? "—")} trend="Recorded today" icon={TrendingUp} tone="success" />
        <Stat label="Upcoming Events" value={String(stats.data?.upcomingEvents.length ?? "—")} trend="Next 30 days" icon={CalendarDays} tone="primary" />
        <Stat label="Monthly Income" value={stats.data ? formatMoney(stats.data.monthlyIncome) : "—"} trend="This month" icon={DollarSign} tone="success" />
      </div>

      {visibleActions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {visibleActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.label} to={a.to}>
                  <Card className="p-4 hover:shadow-[var(--shadow-elevated)] transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-sm text-foreground">{a.label}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Announcements</h3>
            <Button variant="ghost" size="sm" asChild><Link to="/announcements">View all</Link></Button>
          </div>
          {(announcements.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.data!.map((a) => (
                <li key={a.id} className="border-l-2 border-primary/40 pl-3">
                  <div className="font-medium text-sm">{a.title}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Cake className="w-4 h-4 text-success" />Upcoming birthdays</h3>
            <Button variant="ghost" size="sm" asChild><Link to="/birthdays">View all</Link></Button>
          </div>
          {(stats.data?.birthdays.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No birthdays this week.</p>
          ) : (
            <ul className="space-y-2">
              {stats.data!.birthdays.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{b.full_name}</span>
                  <Badge variant="outline" className="text-[10px]">{b.days === 0 ? "Today" : `in ${b.days}d`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Upcoming events</h3>
          <Button variant="ghost" size="sm" asChild><Link to="/events">View all</Link></Button>
        </div>
        {(stats.data?.upcomingEvents.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        ) : (
          <ul className="space-y-2">
            {stats.data!.upcomingEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{e.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {new Date(e.event_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label, value, trend, icon: Icon, tone,
}: {
  label: string; value: string; trend: string; icon: React.ComponentType<{ className?: string }>; tone: "primary" | "success";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{trend}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone === "primary" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
