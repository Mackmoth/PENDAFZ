import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — PFMS" }] }),
  component: AuditLogsPage,
});

type Row = {
  id: string;
  action: string;
  module: string | null;
  status: string;
  target_type: string | null;
  target_id: string | null;
  user_id: string | null;
  created_at: string;
  metadata: any;
};

function AuditLogsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader title="Audit logs" description="System activity across PFMS." />
      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title="No activity yet" description="Actions will appear here." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground text-sm">{r.action}</span>
                  {r.module && <Badge variant="outline" className="text-[10px]">{r.module}</Badge>}
                  <Badge
                    variant="outline"
                    className={
                      r.status === "success"
                        ? "text-[10px] bg-success/10 text-success border-success/20"
                        : "text-[10px] bg-destructive/10 text-destructive border-destructive/20"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
