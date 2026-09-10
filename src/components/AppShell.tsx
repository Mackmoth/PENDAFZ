import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Calendar, Bell, Menu, AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/members", label: "Members", icon: Users },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/more", label: "More", icon: Menu },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 border-r border-border bg-sidebar flex-col p-4">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            P
          </div>
          <div>
            <div className="font-semibold text-sm text-sidebar-foreground">PFMS</div>
            <div className="text-xs text-muted-foreground">Penda Foundation</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[var(--shadow-nav)] rounded-t-2xl z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                    {active && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/* ── Page wrapper with fade-in ─────────────────────── */

export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}

/* ── Page header ────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2 sm:shrink-0">{action}</div>}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ── Stat card (reused in Dashboard, Attendance, Finance, Reports) ── */

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  tone = "primary",
  loading,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "destructive";
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="skeleton-card">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="skeleton skeleton-text w-16" />
            <div className="skeleton skeleton-text-lg" />
            {trend !== undefined && <div className="skeleton skeleton-text w-20" />}
          </div>
          <div className="skeleton skeleton-circle w-9 h-9" />
        </div>
      </div>
    );
  }

  const toneStyles = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className="p-4 transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-semibold mt-1",
              tone === "destructive" ? "text-destructive" : "text-foreground",
            )}
          >
            {value}
          </p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div
          className={cn("w-9 h-9 rounded-lg flex items-center justify-center", toneStyles[tone])}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

/* ── Filter bar (reused in Members, Attendance, Finance, Documents) ── */

export function FilterBar({ children }: { children: ReactNode }) {
  return <Card className="p-3 flex flex-wrap gap-2 items-center animate-fade-in">{children}</Card>;
}

/* ── List item (reused in Members, Finance, Documents, Audit Logs, etc.) ── */

export function ListItem({
  onClick,
  children,
  className,
}: {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent/80 transition-colors text-left",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Confirm delete dialog (replaces raw confirm() calls) ── */

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ── Error state (replaces missing error handling) ── */

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-8 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}
