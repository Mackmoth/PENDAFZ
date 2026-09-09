import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/login-history")({
  head: () => ({ meta: [{ title: "Login History — PFMS" }] }),
  component: LoginHistoryPage,
});

type Row = {
  id: string; email: string | null; success: boolean;
  user_agent: string | null; created_at: string;
};

function LoginHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("login_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader title="Login history" description="Recent sign-in attempts." />
      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={LogIn} title="No login records" description="Sign-in attempts will appear here." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-3.5 flex items-center gap-3">
              <div className={"w-9 h-9 rounded-lg flex items-center justify-center " + (r.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                <LogIn className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm truncate">{r.email ?? "unknown"}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <Badge variant="outline" className={r.success ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                {r.success ? "Success" : "Failed"}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
