import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, PageTransition } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, LogIn } from "lucide-react";
import { formatRelativeTime } from "@/lib/pfms";

export const Route = createFileRoute("/_authenticated/login-history")({
  head: () => ({ meta: [{ title: "Login History — PFMS" }] }),
  component: LoginHistoryPage,
});

type Row = {
  id: string;
  email: string | null;
  success: boolean;
  user_agent: string | null;
  created_at: string;
};

function LoginHistoryPage() {
  const rows = useQuery({
    queryKey: ["login-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Login history" description="Recent sign-in attempts." />

        {rows.isLoading ? (
          <div className="skeleton-card divide-y divide-border overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 flex items-center gap-3">
                <div className="skeleton skeleton-circle w-9 h-9" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton skeleton-text w-1/3" />
                  <div className="skeleton skeleton-text w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (rows.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={LogIn}
            title="No login records"
            description="Sign-in attempts will appear here."
          />
        ) : (
          <div className="space-y-2 animate-fade-in">
            {rows.data!.map((r) => (
              <Card
                key={r.id}
                className="p-3.5 flex items-center gap-3 hover:shadow-[var(--shadow-elevated)] transition-shadow"
              >
                <div
                  className={
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 " +
                    (r.success
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive")
                  }
                >
                  <LogIn className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">
                    {r.email ?? "unknown"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    {r.user_agent && <Monitor className="w-3 h-3 flex-shrink-0" />}
                    {r.user_agent ?? "Unknown device"} · {formatRelativeTime(r.created_at)}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    "flex-shrink-0 " +
                    (r.success
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20")
                  }
                >
                  {r.success ? "Success" : "Failed"}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
