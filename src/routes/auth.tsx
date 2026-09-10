import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PFMS" },
      { name: "description", content: "Sign in to Penda Foundation Management System." },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});
const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.46a5.55 5.55 0 0 1-2.4 3.58v3h3.87c2.26-2.09 3.57-5.16 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3a5.9 5.9 0 0 1-4.07 1.16c-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09C3.24 21.3 7.32 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.32 0 3.24 2.7 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
  visible,
  onToggle,
  minLength,
}: {
  id: string;
  name: string;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleForgot = async (email: string) => {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    setGoogleLoading(false);
    if (error) toast.error(error.message);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      <header className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            P
          </div>
          <span className="font-semibold text-foreground">Penda Foundation</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-10">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elevated)] animate-fade-in">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Welcome to PFMS</h1>
            <p className="text-sm text-muted-foreground mt-1">Penda Foundation Management System</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full hover:bg-muted active:scale-[0.99] transition-all"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            Continue with Google
          </Button>

          <div
            className="flex items-center gap-3 my-5"
            role="separator"
            aria-label="or continue with email"
          >
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or continue with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="si-password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={(e) => {
                        const form = e.currentTarget.closest("form") as HTMLFormElement;
                        const email =
                          (form?.elements.namedItem("email") as HTMLInputElement)?.value ?? "";
                        handleForgot(email);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    id="si-password"
                    name="password"
                    autoComplete="current-password"
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="fullName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <PasswordInput
                    id="su-password"
                    name="password"
                    autoComplete="new-password"
                    visible={showSignUpPassword}
                    onToggle={() => setShowSignUpPassword((v) => !v)}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  The first account created becomes Super Admin.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
