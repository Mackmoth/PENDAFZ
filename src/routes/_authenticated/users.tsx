import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext, ROLE_LABELS, type AppRole } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { inviteUser, updateUserAdmin, forceResetPassword } from "@/lib/admin.functions";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  UserPlus,
  Users as UsersIcon,
  KeyRound,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users & Roles — PFMS" }] }),
  component: UsersPage,
});

const ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "finance_officer",
  "attendance_officer",
  "welfare_officer",
  "secretary",
  "branch_leader",
  "department_leader",
  "member",
];

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  department_id: string | null;
  branch_id: string | null;
  last_login: string | null;
  roles: AppRole[];
  departmentIds: string[];
};

type Opt = { id: string; name: string };

function TogglePills({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              on
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {on && <Check className="w-3 h-3" />}
            {o.label}
          </button>
        );
      })}
      {options.length === 0 && <span className="text-xs text-muted-foreground">None available</span>}
    </div>
  );
}

function UsersPage() {
  const { isAdmin, loading: ctxLoading } = useUserContext();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Opt[]>([]);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: userDeps }, { data: deps }, { data: brs }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, status, department_id, branch_id, last_login")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_departments").select("user_id, department_id"),
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("branches").select("id, name").order("name"),
      ]);
    const roleMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    });
    const depMap = new Map<string, string[]>();
    (userDeps ?? []).forEach((d: any) => {
      const list = depMap.get(d.user_id) ?? [];
      list.push(d.department_id);
      depMap.set(d.user_id, list);
    });
    setRows(
      (profiles ?? []).map((p: any) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
        departmentIds: depMap.get(p.id) ?? (p.department_id ? [p.department_id] : []),
      })),
    );
    setDepartments(deps ?? []);
    setBranches(brs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (ctxLoading) return null;
  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Restricted area"
        description="Only Administrators and Super Admin can manage users."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Invite staff, assign roles, departments and personal numbers."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite user
              </Button>
            </DialogTrigger>
            <InviteDialog
              departments={departments}
              branches={branches}
              onDone={() => {
                setOpen(false);
                load();
              }}
            />
          </Dialog>
        }
      />

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users yet"
          description="Invite your first staff member to get started."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <UserRow
              key={r.id}
              row={r}
              departments={departments}
              branches={branches}
              onChange={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InviteDialog({
  departments,
  branches,
  onDone,
}: {
  departments: Opt[];
  branches: Opt[];
  onDone: () => void;
}) {
  const invite = useServerFn(inviteUser);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>(["member"]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [branchId, setBranchId] = useState<string>("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (roles.length === 0) {
      toast.error("Pick at least one role");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await invite({
        data: {
          email: String(fd.get("email") ?? ""),
          fullName: String(fd.get("fullName") ?? ""),
          phone: (fd.get("phone") as string) || null,
          roles,
          departmentId: departmentIds[0] ?? null,
          departmentIds,
          branchId: branchId || null,
        },
      });
      toast.success("Invitation sent");
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? "Could not invite user");
    } finally {
      setLoading(false);
    }
  };

  const toggle = <T extends string>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  return (
    <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Invite user</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input name="fullName" required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label>Personal number</Label>
          <Input name="phone" type="tel" placeholder="+256 7XX XXX XXX" />
        </div>
        <div className="space-y-2">
          <Label>Roles</Label>
          <TogglePills
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            selected={roles}
            onToggle={(v) => toggle(roles, setRoles, v as AppRole)}
          />
        </div>
        <div className="space-y-2">
          <Label>Departments</Label>
          <TogglePills
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            selected={departmentIds}
            onToggle={(v) => toggle(departmentIds, setDepartmentIds, v)}
          />
        </div>
        <div className="space-y-2">
          <Label>Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send invite"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending_verification: "bg-primary/10 text-primary border-primary/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  inactive: "bg-muted text-muted-foreground",
  locked: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground",
};

function UserRow({
  row,
  departments,
  branches,
  onChange,
}: {
  row: Row;
  departments: Opt[];
  branches: Opt[];
  onChange: () => void;
}) {
  const update = useServerFn(updateUserAdmin);
  const reset = useServerFn(forceResetPassword);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const [roles, setRoles] = useState<AppRole[]>(row.roles.length ? row.roles : ["member"]);
  const [status, setStatus] = useState(row.status);
  const [phone, setPhone] = useState(row.phone ?? "");
  const [departmentIds, setDepartmentIds] = useState<string[]>(row.departmentIds);
  const [branchId, setBranchId] = useState(row.branch_id ?? "");

  const initials = (row.full_name ?? row.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const toggle = <T extends string>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const save = async (overrideStatus?: string) => {
    if (roles.length === 0) {
      toast.error("Pick at least one role");
      return;
    }
    setBusy(true);
    try {
      await update({
        data: {
          userId: row.id,
          roles,
          status: (overrideStatus ?? status) as any,
          phone: phone.trim() || null,
          departmentId: departmentIds[0] ?? null,
          departmentIds,
          branchId: branchId || null,
        },
      });
      toast.success("User updated");
      setEditing(false);
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatusAndSave = async (next: string) => {
    setStatus(next);
    await save(next);
  };

  const doReset = async () => {
    setBusy(true);
    try {
      await reset({ data: { userId: row.id } });
      toast.success("Password reset email sent");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const depNames = row.departmentIds
    .map((id) => departments.find((d) => d.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate">{row.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground truncate">{row.email}</div>
          {row.phone && <div className="text-xs text-muted-foreground truncate">{row.phone}</div>}
          {depNames.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {depNames.map((n) => (
                <Badge key={n} variant="outline" className="text-[10px]">
                  {n}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {row.roles.map((r) => (
            <Badge key={r} variant="secondary" className="text-[10px]">
              {ROLE_LABELS[r]}
            </Badge>
          ))}
          <Badge variant="outline" className={STATUS_TONES[row.status] ?? ""}>
            {row.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Roles (multiple allowed)</Label>
            <TogglePills
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
              selected={roles}
              onToggle={(v) => toggle(roles, setRoles, v as AppRole)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Departments (multiple allowed)</Label>
            <TogglePills
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              selected={departmentIds}
              onToggle={(v) => toggle(departmentIds, setDepartmentIds, v)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Personal number</Label>
              <Input
                value={phone}
                type="tel"
                placeholder="+256 7XX XXX XXX"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "active",
                    "inactive",
                    "suspended",
                    "locked",
                    "pending_verification",
                    "archived",
                  ].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 justify-end">
        {row.status === "pending_verification" && (
          <>
            <Button size="sm" onClick={() => setStatusAndSave("active")} disabled={busy}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusAndSave("suspended")}
              disabled={busy}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={doReset} disabled={busy}>
          <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Reset password
        </Button>

        {editing ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => save()} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
    </Card>
  );
}
