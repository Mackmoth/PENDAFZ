import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext, ROLE_LABELS } from "@/lib/auth";
import {
  DollarSign, ClipboardCheck, Megaphone, FileText, Building2, Layers, UserCog,
  Settings, LogOut, ChevronRight, UserCircle, History, ShieldCheck, Cake,
  CalendarDays, Bell, Paperclip,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more")({
  head: () => ({ meta: [{ title: "More — PFMS" }] }),
  component: MorePage,
});

const MODULES = [
  { label: "My profile", icon: UserCircle, to: "/profile", adminOnly: false },
  { label: "Attendance", icon: ClipboardCheck, to: "/attendance", adminOnly: false },
  { label: "Finance", icon: DollarSign, to: "/finance", adminOnly: false },
  { label: "Events", icon: CalendarDays, to: "/events", adminOnly: false },
  { label: "Birthdays", icon: Cake, to: "/birthdays", adminOnly: false },
  { label: "Announcements", icon: Megaphone, to: "/announcements", adminOnly: false },
  { label: "Notifications", icon: Bell, to: "/notifications", adminOnly: false },
  { label: "Documents", icon: Paperclip, to: "/documents", adminOnly: false },
  { label: "Reports", icon: FileText, to: "/reports", adminOnly: false },
  { label: "Users & Roles", icon: UserCog, to: "/users", adminOnly: true },
  { label: "Departments", icon: Layers, to: "/departments", adminOnly: false },
  { label: "Branches", icon: Building2, to: "/branches", adminOnly: false },
  { label: "Audit logs", icon: ShieldCheck, to: "/audit-logs", adminOnly: true },
  { label: "Login history", icon: History, to: "/login-history", adminOnly: false },
  { label: "Organization settings", icon: Settings, to: "/settings", adminOnly: true },
] as const;

function MorePage() {
  const navigate = useNavigate();
  const { profile, roles } = useUserContext();
  const primaryRole = roles[0];
  const isAdmin = roles.includes("super_admin") || roles.includes("admin");

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="More" />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{profile?.full_name ?? "Unnamed user"}</div>
            <div className="text-sm text-muted-foreground truncate">{profile?.email}</div>
            {primaryRole && <Badge variant="secondary" className="mt-2">{ROLE_LABELS[primaryRole]}</Badge>}
          </div>
        </div>
      </Card>
      <Card className="divide-y divide-border overflow-hidden">
        {MODULES.filter((m) => !m.adminOnly || isAdmin).map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.label} to={m.to} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent transition-colors">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <Icon className="w-4 h-4 text-foreground" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">{m.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          );
        })}
      </Card>
      <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" />Sign out
      </Button>
      <p className="text-center text-xs text-muted-foreground pt-2">PFMS · Penda Foundation</p>
    </div>
  );
}
