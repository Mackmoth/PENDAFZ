import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext, ROLE_LABELS } from "@/lib/auth";
import { PageHeader, PageTransition } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — PFMS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles } = useUserContext();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [deptName, setDeptName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setGender((profile as any).gender ?? "");
    setDob((profile as any).date_of_birth ?? "");
    (async () => {
      if ((profile as any).department_id) {
        const { data } = await supabase
          .from("departments")
          .select("name")
          .eq("id", (profile as any).department_id)
          .maybeSingle();
        setDeptName(data?.name ?? null);
      }
    })();
  }, [profile]);

  if (!user || !profile) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="skeleton skeleton-text-lg w-40" />
          <div className="skeleton-card p-6 flex items-center gap-4">
            <div className="skeleton skeleton-circle w-16 h-16" />
            <div className="flex-1 space-y-2">
              <div className="skeleton skeleton-text w-1/3" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        gender: gender || null,
        date_of_birth: dob || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const initials = (fullName || profile.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader title="My profile" description="Update your personal information." />

        <Card className="p-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-foreground">{fullName || "Unnamed"}</div>
              <div className="text-sm text-muted-foreground">{profile.email}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 animate-fade-in animate-fade-in-delay-1">
          <h3 className="font-semibold text-foreground">Personal information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Input
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="e.g. Male / Female"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-3 animate-fade-in animate-fade-in-delay-2">
          <h3 className="font-semibold text-foreground">Organization</h3>
          <p className="text-xs text-muted-foreground">
            Department and role are managed by the Super Admin.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Department</div>
              <div className="font-medium">{deptName ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-medium capitalize">
                {(profile as any).status?.replace("_", " ") ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last login</div>
              <div className="font-medium">
                {(profile as any).last_login
                  ? new Date((profile as any).last_login).toLocaleString()
                  : "—"}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
