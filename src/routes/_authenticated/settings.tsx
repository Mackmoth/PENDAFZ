import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import { PageHeader, EmptyState, PageTransition } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Organization Settings — PFMS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { hasRole, loading: ctxLoading } = useUserContext();
  const isSuper = hasRole("super_admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    motto: "",
    address: "",
    email: "",
    phone: "",
    website: "",
    membership_fee_amount: 0,
    membership_fee_currency: "UGX",
    financial_year_start: "",
    backup_schedule: "",
    session_timeout_minutes: 60,
  });

  useEffect(() => {
    supabase
      .from("organization_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name ?? "",
            motto: data.motto ?? "",
            address: data.address ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            website: data.website ?? "",
            membership_fee_amount: Number(data.membership_fee_amount ?? 0),
            membership_fee_currency: data.membership_fee_currency ?? "UGX",
            financial_year_start: data.financial_year_start ?? "",
            backup_schedule: data.backup_schedule ?? "",
            session_timeout_minutes: data.session_timeout_minutes ?? 60,
          });
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organization_settings")
      .update({
        ...form,
        financial_year_start: form.financial_year_start || null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  if (ctxLoading || loading) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="skeleton skeleton-text-lg w-48" />
            <div className="skeleton skeleton-text w-72" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-card p-6 space-y-4">
              <div className="skeleton skeleton-text w-24" />
              <div className="skeleton skeleton-text w-full" />
              <div className="skeleton skeleton-text w-2/3" />
            </div>
          ))}
        </div>
      </PageTransition>
    );
  }
  if (!isSuper) {
    return (
      <EmptyState
        icon={Shield}
        title="Restricted area"
        description="Only Super Admin can edit organization settings."
      />
    );
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Organization settings"
          description="Configure Penda Foundation defaults."
        />
        <Card className="p-6 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-foreground">Identity</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Motto</Label>
              <Input value={form.motto} onChange={(e) => set("motto", e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 animate-fade-in animate-fade-in-delay-1">
          <h3 className="font-semibold text-foreground">Finance</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Monthly fee</Label>
              <Input
                type="number"
                step="0.01"
                value={form.membership_fee_amount}
                onChange={(e) => set("membership_fee_amount", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input
                value={form.membership_fee_currency}
                onChange={(e) => set("membership_fee_currency", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Financial year start</Label>
              <Input
                type="date"
                value={form.financial_year_start}
                onChange={(e) => set("financial_year_start", e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 animate-fade-in animate-fade-in-delay-2">
          <h3 className="font-semibold text-foreground">Operations</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Backup schedule</Label>
              <Input
                placeholder="daily, weekly…"
                value={form.backup_schedule}
                onChange={(e) => set("backup_schedule", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Session timeout (minutes)</Label>
              <Input
                type="number"
                value={form.session_timeout_minutes}
                onChange={(e) => set("session_timeout_minutes", Number(e.target.value))}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save settings"}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
