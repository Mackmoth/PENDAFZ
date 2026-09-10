import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, PageTransition, FilterBar } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, ScrollText } from "lucide-react";
import { formatRelativeTime } from "@/lib/pfms";

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
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  const rows = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const modules = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows.data ?? []) if (r.module) set.add(r.module);
    return [...set].sort();
  }, [rows.data]);

  const filtered = useMemo(
    () => (rows.data ?? []).filter((r) => moduleFilter === "all" || r.module === moduleFilter),
    [rows.data, moduleFilter],
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Audit logs" description="System activity across PFMS." />

        {rows.data && rows.data.length > 0 && (
          <FilterBar>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
        )}

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
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No activity yet"
            description="Actions will appear here."
          />
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map((r) => (
              <Card
                key={r.id}
                className="p-3.5 flex items-start gap-3 hover:shadow-[var(--shadow-elevated)] transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm">{r.action}</span>
                    {r.module && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.module}
                      </Badge>
                    )}
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
                    {formatRelativeTime(r.created_at)}
                  </div>
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1 truncate">
                      {Object.entries(r.metadata)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
