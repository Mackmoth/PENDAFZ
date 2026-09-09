import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — PFMS" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase parses hash tokens automatically via detectSessionInUrl.
    // If we have a session, allow updating password.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        toast.error("Reset link expired or invalid. Please request a new one.");
        navigate({ to: "/auth", replace: true });
      }
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-semibold text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a strong password for your PFMS account.
        </p>
        {!ready ? (
          <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">New password</Label>
              <Input id="pwd" name="password" type="password" minLength={6} required />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
