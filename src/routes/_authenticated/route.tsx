import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  pending_verification: {
    title: "Awaiting approval",
    body: "Your account has been created but still needs to be approved by the Super Admin. You'll be able to sign in once your access is granted.",
  },
  suspended: {
    title: "Account suspended",
    body: "Your access has been suspended. Please contact the Super Admin for assistance.",
  },
  locked: {
    title: "Account locked",
    body: "Your account is locked. Please contact the Super Admin to restore access.",
  },
  inactive: {
    title: "Account inactive",
    body: "Your account is not active. Please contact the Super Admin.",
  },
  archived: {
    title: "Account archived",
    body: "This account has been archived. Please contact the Super Admin.",
  },
};

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string>("active");

  useEffect(() => {
    let cancelled = false;

    const check = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      setStatus((data?.status as string) ?? "active");
      setReady(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) navigate({ to: "/auth", replace: true });
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
      } else {
        check(data.session.user.id);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const blocked = STATUS_MESSAGES[status];
  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">{blocked.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{blocked.body}</p>
          <Button
            className="mt-6 w-full"
            variant="secondary"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            Sign out
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
