import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState, PageTransition } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ageFromDob, daysUntil, initialsOf, upcomingBirthdayDate, type Member } from "@/lib/pfms";
import { Cake, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/birthdays")({
  head: () => ({ meta: [{ title: "Birthdays — PFMS" }] }),
  component: BirthdaysPage,
});

function BirthdaysPage() {
  const members = useQuery({
    queryKey: ["members", "birthdays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, date_of_birth, phone, whatsapp, photo_url, department_id")
        .not("date_of_birth", "is", null);
      if (error) throw error;
      return (data ?? []) as Pick<
        Member,
        "id" | "full_name" | "date_of_birth" | "phone" | "whatsapp" | "photo_url" | "department_id"
      >[];
    },
  });

  const groups = useMemo(() => {
    const list = (members.data ?? [])
      .map((m) => {
        const next = upcomingBirthdayDate(m.date_of_birth!);
        return { m, next, days: daysUntil(next) };
      })
      .sort((a, b) => a.days - b.days);

    return {
      today: list.filter((x) => x.days === 0),
      thisWeek: list.filter((x) => x.days > 0 && x.days <= 7),
      thisMonth: list.filter((x) => x.days > 7 && x.days <= 31),
      later: list.filter((x) => x.days > 31),
    };
  }, [members.data]);

  const total = (members.data ?? []).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Birthdays"
          description={
            members.data
              ? `${total} member${total === 1 ? "" : "s"} with birthday on file.`
              : "Members with a date of birth"
          }
        />

        {members.isLoading ? (
          <div className="skeleton-card divide-y divide-border overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="skeleton skeleton-circle w-10 h-10" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton skeleton-text w-1/2" />
                  <div className="skeleton skeleton-text w-1/3" />
                </div>
                <div className="skeleton skeleton-text w-14" />
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={Cake}
            title="No birthdays yet"
            description="Members with a date of birth will appear here."
          />
        ) : (
          <div className="space-y-6 animate-fade-in">
            <BirthdaySection title="Today" items={groups.today} highlight />
            <BirthdaySection title="This week" items={groups.thisWeek} />
            <BirthdaySection title="This month" items={groups.thisMonth} />
            <BirthdaySection title="Later" items={groups.later} />
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function BirthdaySection({
  title,
  items,
  highlight,
}: {
  title: string;
  items: {
    m: {
      id: string;
      full_name: string;
      date_of_birth: string | null;
      phone: string | null;
      whatsapp: string | null;
      photo_url: string | null;
    };
    next: Date;
    days: number;
  }[];
  highlight?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="text-[10px]">
          {items.length}
        </Badge>
      </div>
      <Card
        className={
          highlight
            ? "divide-y divide-border overflow-hidden ring-1 ring-primary/30"
            : "divide-y divide-border overflow-hidden"
        }
      >
        {items.map(({ m, next, days }) => {
          const age = ageFromDob(m.date_of_birth);
          const wa = (m.whatsapp ?? m.phone ?? "").replace(/[^\d]/g, "");
          return (
            <div key={m.id} className="px-4 py-3 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {m.photo_url && <AvatarImage src={m.photo_url} />}
                <AvatarFallback className="bg-success/10 text-success text-xs font-semibold">
                  {initialsOf(m.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{m.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {next.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {age !== null && ` · turning ${age + (days === 0 ? 0 : 1)}`}
                  {days === 0 ? " · today" : days > 0 ? ` · in ${days}d` : ""}
                </div>
              </div>
              {wa && (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`https://wa.me/${wa}?text=${encodeURIComponent(`Happy birthday, ${m.full_name.split(" ")[0]}! 🎉`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Wish
                  </a>
                </Button>
              )}
            </div>
          );
        })}
      </Card>
    </section>
  );
}
