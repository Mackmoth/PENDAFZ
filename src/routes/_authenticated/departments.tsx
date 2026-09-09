import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Layers, Plus, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({ meta: [{ title: "Departments — PFMS" }] }),
  component: DepartmentsPage,
});

type Row = { id: string; name: string; description: string | null; is_active: boolean };

function DepartmentsPage() {
  const { isAdmin } = useUserContext();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("departments").insert({ name: name.trim(), description: description || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setName(""); setDescription("");
    toast.success("Department added");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Department removed");
    load();
  };

  return (
    <div>
      <PageHeader title="Departments" description="Organize your teams." />

      {isAdmin && (
        <Card className="p-4 mb-4">
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

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Layers} title="No departments" description="Add your first department above." />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{r.name}</div>
                {r.description && (
                  <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                )}
              </div>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
