import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageTransition } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Cake, CalendarDays } from "lucide-react";
import type { EventRow, Member } from "@/lib/pfms";
import { fmtDate } from "@/lib/pfms";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — PFMS" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  const events = useQuery({
    queryKey: ["events", "month", cursor.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", monthStart.toISOString().slice(0, 10))
        .lte("event_date", monthEnd.toISOString().slice(0, 10))
        .order("event_date");
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const members = useQuery({
    queryKey: ["members", "dobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, date_of_birth")
        .not("date_of_birth", "is", null);
      if (error) throw error;
      return (data ?? []) as Pick<Member, "id" | "full_name" | "date_of_birth">[];
    },
  });

  const birthdaysByDay = useMemo(() => {
    const map: Record<number, { id: string; full_name: string }[]> = {};
    for (const m of members.data ?? []) {
      if (!m.date_of_birth) continue;
      const d = new Date(m.date_of_birth);
      if (d.getMonth() !== cursor.getMonth()) continue;
      const day = d.getDate();
      (map[day] ||= []).push({ id: m.id, full_name: m.full_name });
    }
    return map;
  }, [members.data, cursor]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, EventRow[]> = {};
    for (const e of events.data ?? []) {
      const day = new Date(e.event_date).getDate();
      (map[day] ||= []).push(e);
    }
    return map;
  }, [events.data]);

  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === cursor.getFullYear() &&
    today.getMonth() === cursor.getMonth() &&
    today.getDate() === d;

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Calendar" description="Events, birthdays and important dates." />

        <Card className="p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">{monthLabel}</div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={isToday(new Date().getDate()) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const t = new Date();
                  setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-[10px] font-medium text-muted-foreground uppercase mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
            {cells.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "bg-card min-h-[72px] p-1.5 text-xs",
                  d === null && "bg-muted/30",
                  d !== null && isToday(d) && "ring-2 ring-primary ring-inset",
                )}
              >
                {d !== null && (
                  <>
                    <div
                      className={cn("font-medium", isToday(d) ? "text-primary" : "text-foreground")}
                    >
                      {d}
                    </div>
                    <div className="mt-1 space-y-1">
                      {events.isLoading || members.isLoading ? (
                        <div className="skeleton skeleton-text w-full" />
                      ) : (
                        <>
                          {(eventsByDay[d] ?? []).slice(0, 2).map((e) => (
                            <div
                              key={e.id}
                              className="truncate text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5"
                            >
                              {e.title}
                            </div>
                          ))}
                          {(birthdaysByDay[d] ?? []).slice(0, 2).map((b) => (
                            <div
                              key={b.id}
                              className="truncate text-[10px] bg-success/10 text-success rounded px-1 py-0.5 flex items-center gap-1"
                            >
                              <Cake className="w-2.5 h-2.5" />
                              {b.full_name.split(" ")[0]}
                            </div>
                          ))}
                          {(eventsByDay[d]?.length ?? 0) + (birthdaysByDay[d]?.length ?? 0) > 4 && (
                            <div className="text-[10px] text-muted-foreground">+more</div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-3">
          <Card className="p-4 animate-fade-in animate-fade-in-delay-1">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Events this month</h3>
            </div>
            {events.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton skeleton-text w-full" />
                ))}
              </div>
            ) : (events.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No events scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {events.data!.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{e.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {fmtDate(e.event_date, { month: "short", day: "numeric" })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-4 animate-fade-in animate-fade-in-delay-2">
            <div className="flex items-center gap-2 mb-3">
              <Cake className="w-4 h-4 text-success" />
              <h3 className="font-semibold text-sm">Birthdays this month</h3>
            </div>
            {members.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton skeleton-text w-full" />
                ))}
              </div>
            ) : Object.keys(birthdaysByDay).length === 0 ? (
              <p className="text-sm text-muted-foreground">No birthdays this month.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(birthdaysByDay)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .flatMap(([day, list]) =>
                    list.map((b) => (
                      <li key={b.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{b.full_name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {monthLabel.split(" ")[0].slice(0, 3)} {day}
                        </Badge>
                      </li>
                    )),
                  )}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
