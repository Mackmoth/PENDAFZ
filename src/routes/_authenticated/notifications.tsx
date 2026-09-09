import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDateTime, labelize, type Notification } from "@/lib/pfms";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — PFMS" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user,
  });

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (error) return toast.error(error.message);
    toast.success("Marked all as read");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const unread = (list.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up"}
        action={unread > 0 ? <Button variant="outline" size="sm" onClick={markAllRead}><Check className="w-4 h-4 mr-2" />Mark all read</Button> : undefined}
      />

      {(list.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="New alerts will appear here." />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {list.data!.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${!n.read_at ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    <div className="font-medium text-sm truncate">{n.title}</div>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <div className="text-[10px] text-muted-foreground mt-1">{fmtDateTime(n.created_at)}</div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{labelize(n.type)}</Badge>
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
