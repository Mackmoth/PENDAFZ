import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext, ROLE_LABELS } from "@/lib/auth";
import {
  daysUntil,
  formatMoney,
  upcomingBirthdayDate,
  formatRelativeTime,
  type Announcement,
  type EventRow,
  type Member,
} from "@/lib/pfms";
import {
  UserPlus,
  ClipboardCheck,
  DollarSign,
  CalendarPlus,
  Megaphone,
  FileText,
  Users,
  TrendingUp,
  Cake,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { PageTransition, StatCard, ErrorState, EmptyState } from "@/components/AppShell";

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
  {
    label: "Register Member",
    icon: UserPlus,
    to: "/members",
    roles: ["super_admin", "admin", "secretary"],
  },
  {
    label: "Record Attendance",
    icon: ClipboardCheck,
    to: "/attendance",
    roles: ["super_admin", "admin", "attendance_officer"],
  },
  {
    label: "Record Payment",
    icon: DollarSign,
    to: "/finance",
    roles: ["super_admin", "admin", "finance_officer"],
  },
  {
    label: "Create Event",
    icon: CalendarPlus,
    to: "/events",
    roles: ["super_admin", "admin", "secretary"],
  },
  {
    label: "Announcement",
    icon: Megaphone,
    to: "/announcements",
    roles: ["super_admin", "admin", "secretary"],
  },
  {
    label: "View Reports",
    icon: FileText,
    to: "/reports",
    roles: ["super_admin", "admin", "finance_officer"],
  },
] as const;

function Dashboard() {
  const { profile, roles, isAdmin } = useUserContext();
  const primaryRole = roles[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [
        { count: totalMembers },
        { count: activeMembers },
        attendanceToday,
        upcomingEventsRes,
        birthdaysRes,
        monthPaymentsRes,
      ] = await Promise.all([
        supabase.from("members").select("*", { count: "exact", head: true }),
        supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("attendance_date", dayStart.toISOString().slice(0, 10)),
        supabase
          .from("events")
          .select("*")
          .gte("event_date", dayStart.toISOString().slice(0, 10))
          .order("event_date")
          .limit(5),
        supabase
          .from("members")
          .select("id, full_name, date_of_birth, photo_url")
          .not("date_of_birth", "is", null),
        supabase
          .from("payments")
          .select("amount, payment_type")
          .gte("paid_at", monthStart.toISOString()),
      ]);

      const birthdayList = (
        (birthdaysRes.data ?? []) as Pick<
          Member,
          "id" | "full_name" | "date_of_birth" | "photo_url"
        >[]
      )
        .map((m) => ({ ...m, days: daysUntil(upcomingBirthdayDate(m.date_of_birth!)) }))
        .filter((m) => m.days >= 0 && m.days <= 7)
        .sort((a, b) => a.days - b.days);

      const income = (monthPaymentsRes.data ?? [])
        .filter((p) => p.payment_type !== "expense")
        .reduce((s, p) => s + Number(p.amount), 0);

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
        .from("announcements")
        .select("*")
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
    <PageTransition>
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

        {stats.isError ? (
          <ErrorState message="Could not load dashboard stats" onRetry={() => stats.refetch()} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Members"
              value={stats.data ? String(stats.data.totalMembers) : "—"}
              trend={stats.data ? `${stats.data.activeMembers} active` : undefined}
              icon={Users}
              loading={stats.isLoading}
            />
            <StatCard
              label="Today's Attendance"
              value={stats.data ? String(stats.data.attendanceToday) : "—"}
              trend="Recorded today"
              icon={TrendingUp}
              tone="success"
              loading={stats.isLoading}
            />
            <StatCard
              label="Upcoming Events"
              value={stats.data ? String(stats.data.upcomingEvents.length) : "—"}
              trend="Next 30 days"
              icon={CalendarDays}
              loading={stats.isLoading}
            />
            <StatCard
              label="Monthly Income"
              value={stats.data ? formatMoney(stats.data.monthlyIncome) : "—"}
              trend="This month"
              icon={DollarSign}
              tone="success"
              loading={stats.isLoading}
            />
          </div>
        )}

        {visibleActions.length > 0 && (
          <section className="animate-fade-in animate-fade-in-delay-1">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visibleActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link key={a.label} to={a.to} className="group">
                    <Card className="p-4 hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm text-foreground">{a.label}</span>
                        <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5 animate-fade-in animate-fade-in-delay-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                Announcements
              </h3>
              <Button variant="ghost" size="sm" asChild className="group">
                <Link to="/announcements">
                  View all{" "}
                  <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
            {announcements.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2 py-1">
                    <div className="skeleton skeleton-text w-1/2" />
                    <div className="skeleton skeleton-text w-full" />
                  </div>
                ))}
              </div>
            ) : (announcements.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No announcements yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {announcements.data!.map((a) => (
                  <li
                    key={a.id}
                    className="border-l-2 border-primary/40 pl-3 transition-colors hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{a.title}</div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatRelativeTime(a.published_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 animate-fade-in animate-fade-in-delay-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Cake className="w-4 h-4 text-success" />
                Upcoming birthdays
              </h3>
              <Button variant="ghost" size="sm" asChild className="group">
                <Link to="/birthdays">
                  View all{" "}
                  <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
            {stats.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton skeleton-text w-full" />
                ))}
              </div>
            ) : (stats.data?.birthdays.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No birthdays this week.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.data!.birthdays.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-sm py-1">
                    <span className="truncate">{b.full_name}</span>
                    <Badge variant={b.days === 0 ? "default" : "outline"} className="text-[10px]">
                      {b.days === 0 ? "Today" : `in ${b.days}d`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-5 animate-fade-in animate-fade-in-delay-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Upcoming events
            </h3>
            <Button variant="ghost" size="sm" asChild className="group">
              <Link to="/events">
                View all{" "}
                <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
          {stats.isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton skeleton-text w-full" />
              ))}
            </div>
          ) : (stats.data?.upcomingEvents.length ?? 0) === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              description="Events you schedule will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {stats.data!.upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm py-2.5">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {e.venue ?? "Venue TBD"}
                      {e.status ? ` · ${e.status}` : ""}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                    {new Date(e.event_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
