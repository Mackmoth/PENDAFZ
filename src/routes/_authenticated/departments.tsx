import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import { PageHeader, EmptyState, PageTransition, ConfirmDeleteDialog } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Layers, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({ meta: [{ title: "Departments — PFMS" }] }),
  component: DepartmentsPage,
});

type Row = { id: string; name: string; description: string | null; is_active: boolean };

function DepartmentsPage() {
  const { isAdmin } = useUserContext();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("departments")
      .insert({ name: name.trim(), description: description || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setName("");
    setDescription("");
    toast.success("Department added");
    qc.invalidateQueries({ queryKey: ["departments"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("departments").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Department removed");
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ["departments"] });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader title="Departments" description="Organize your teams." />

        {isAdmin && (
          <Card className="p-4">
            <form onSubmit={add} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </form>
          </Card>
        )}

        {rows.isLoading ? (
          <div className="skeleton-card space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton skeleton-circle w-9 h-9" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton skeleton-text w-1/2" />
                  <div className="skeleton skeleton-text w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.data?.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No departments"
            description="Add your first department above."
          />
        ) : (
          <div className="grid gap-2 animate-fade-in">
            {rows.data!.map((r) => (
              <Card
                key={r.id}
                className="p-4 flex items-center gap-3 hover:shadow-[var(--shadow-elevated)] transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                  )}
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setDeleteTarget(r)}
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
          title={`Delete "${deleteTarget?.name ?? ""}"?`}
          description="This permanently removes the department. Members assigned to it will lose their department link."
          onConfirm={handleDelete}
          loading={deleting}
        />
      </div>
    </PageTransition>
  );
}
