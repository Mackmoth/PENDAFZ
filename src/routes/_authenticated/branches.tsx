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
import { Building2, Plus, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({ meta: [{ title: "Branches — PFMS" }] }),
  component: BranchesPage,
});

type Row = {
  id: string; name: string; location: string | null;
  contact_person: string | null; phone: string | null;
};

function BranchesPage() {
  const { isAdmin } = useUserContext();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("branches").select("*").order("name");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("branches").insert({ name: name.trim(), location: location || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setName(""); setLocation("");
    toast.success("Branch added");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Branch removed");
    load();
  };

  return (
    <div>
      <PageHeader title="Branches" description="Locations and outposts." />

      {isAdmin && (
        <Card className="p-4 mb-4">
          <form onSubmit={add} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-1">
              <Label>Branch name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
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
        <EmptyState icon={Building2} title="No branches" description="Add your first branch above." />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{r.name}</div>
                {r.location && <div className="text-xs text-muted-foreground truncate">{r.location}</div>}
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
