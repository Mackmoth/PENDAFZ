import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import {
  MEMBER_STATUSES,
  fetchBranches,
  fetchDepartments,
  fmtDate,
  initialsOf,
  labelize,
  ageFromDob,
  type Member,
} from "@/lib/pfms";
import { toast } from "sonner";
import { UserPlus, Users, Search, Phone, Mail, Calendar as CalIcon, IdCard, Trash2 } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
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

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — PFMS" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { hasAnyRole } = useUserContext();
  const canManage = hasAnyRole(["super_admin", "admin", "secretary"]);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [branchId, setBranchId] = useState<string>("all");
  const [deptId, setDeptId] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);

  const branches = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });
  const departments = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  const members = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const filtered = useMemo(() => {
    const list = members.data ?? [];
    const term = q.trim().toLowerCase();
    return list.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (branchId !== "all" && m.branch_id !== branchId) return false;
      if (deptId !== "all" && m.department_id !== deptId) return false;
      if (!term) return true;
      return (
        m.full_name.toLowerCase().includes(term) ||
        (m.membership_number ?? "").toLowerCase().includes(term) ||
        (m.phone ?? "").toLowerCase().includes(term) ||
        (m.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [members.data, q, status, branchId, deptId]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members"
        description={
          members.data ? `${members.data.length} member${members.data.length === 1 ? "" : "s"} on file` : undefined
        }
        action={
          <div className="flex gap-2">
            <ExportMenu
              name="members"
              title="Members"
              orientation="landscape"
              rows={filtered.map((m) => ({
                Number: m.membership_number ?? "",
                Name: m.full_name,
                Status: m.status,
                Gender: m.gender ?? "",
                Phone: m.phone ?? "",
                Email: m.email ?? "",
                Category: m.category ?? "",
                Joined: m.joined_at ?? "",
              }))}
            />
            {canManage && (
              <Button onClick={() => setNewOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Register member
              </Button>
            )}
          </div>
        }
      />

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, number, phone, email"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {MEMBER_STATUSES.map((s) => <SelectItem key={s} value={s}>{labelize(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {(branches.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptId} onValueChange={setDeptId}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {members.isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground text-center">Loading members…</Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={members.data?.length ? "No members match your filters" : "No members yet"}
          description={
            members.data?.length
              ? "Try clearing filters or search."
              : "Register the first member to get started."
          }
          action={
            canManage && !members.data?.length ? (
              <Button onClick={() => setNewOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Register first member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
            >
              <Avatar className="w-10 h-10">
                {m.photo_url && <AvatarImage src={m.photo_url} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initialsOf(m.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">{m.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.membership_number}
                  {m.phone ? ` · ${m.phone}` : ""}
                </div>
              </div>
              <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px]">
                {labelize(m.status)}
              </Badge>
            </button>
          ))}
        </Card>
      )}

      <NewMemberDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        branches={branches.data ?? []}
        departments={departments.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["members"] })}
      />

      <MemberDetailSheet
        member={selected}
        onClose={() => setSelected(null)}
        canManage={canManage}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["members"] })}
        onDeleted={() => {
          setSelected(null);
          qc.invalidateQueries({ queryKey: ["members"] });
        }}
      />
    </div>
  );
}

function NewMemberDialog({
  open,
  onOpenChange,
  branches,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branches: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    gender: "",
    date_of_birth: "",
    nationality: "",
    national_id: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    branch_id: "",
    department_id: "",
    category: "",
    occupation: "",
    notes: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Full name is required");
      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        nationality: form.nationality || null,
        national_id: form.national_id || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address: form.address || null,
        branch_id: form.branch_id || null,
        department_id: form.department_id || null,
        category: form.category || null,
        occupation: form.occupation || null,
        notes: form.notes || null,
      };
      const { error } = await supabase.from("members").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member registered");
      onSaved();
      onOpenChange(false);
      setForm({
        full_name: "", gender: "", date_of_birth: "", nationality: "", national_id: "",
        phone: "", whatsapp: "", email: "", address: "", branch_id: "", department_id: "",
        category: "", occupation: "", notes: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register new member</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Full name *</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date of birth</Label>
            <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
          </div>
          <div>
            <Label>National ID</Label>
            <Input value={form.national_id} onChange={(e) => set("national_id", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={form.branch_id} onValueChange={(v) => set("branch_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Ordinary, Youth" />
          </div>
          <div>
            <Label>Occupation</Label>
            <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Register member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberDetailSheet({
  member,
  onClose,
  canManage,
  onUpdated,
  onDeleted,
}: {
  member: Member | null;
  onClose: () => void;
  canManage: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const open = !!member;
  const memberId = member?.id ?? null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const attendance = useQuery({
    queryKey: ["attendance", "member", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance").select("*").eq("member_id", memberId!)
        .order("attendance_date", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!memberId,
  });

  const payments = useQuery({
    queryKey: ["payments", "member", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments").select("*").eq("member_id", memberId!)
        .order("paid_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!memberId,
  });

  const setStatus = async (status: string) => {
    if (!member) return;
    const { error } = await supabase
      .from("members")
      .update({ status: status as never })
      .eq("id", member.id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    onUpdated();
  };

  const handleDelete = async () => {
    if (!member) return;
    setDeleting(true);
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Member deleted");
    setConfirmDelete(false);
    onDeleted();
  };

  if (!member) return null;
  const age = ageFromDob(member.date_of_birth);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Member profile</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {member.photo_url && <AvatarImage src={member.photo_url} />}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initialsOf(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold text-lg text-foreground">{member.full_name}</div>
              <div className="text-xs text-muted-foreground">{member.membership_number}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge>{labelize(member.status)}</Badge>
                {member.category && <Badge variant="outline">{member.category}</Badge>}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Change status</Label>
                <Select value={member.status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEMBER_STATUSES.map((s) => <SelectItem key={s} value={s}>{labelize(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete member
              </Button>
            </div>
          )}

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {member.full_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the member and their attendance and payment history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleDelete(); }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-2 text-sm">
              <InfoRow icon={Phone} label="Phone" value={member.phone ?? "—"} />
              <InfoRow icon={Mail} label="Email" value={member.email ?? "—"} />
              <InfoRow icon={CalIcon} label="DOB" value={`${fmtDate(member.date_of_birth)}${age !== null ? ` · ${age}y` : ""}`} />
              <InfoRow icon={IdCard} label="National ID" value={member.national_id ?? "—"} />
              <InfoRow icon={CalIcon} label="Joined" value={fmtDate(member.joined_at)} />
              {member.address && <div className="text-xs text-muted-foreground pt-2 border-t">{member.address}</div>}
              {member.notes && <div className="text-xs text-muted-foreground pt-2 border-t">{member.notes}</div>}
            </TabsContent>

            <TabsContent value="attendance">
              {attendance.isLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
              ) : !attendance.data?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No attendance yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {attendance.data.map((a) => (
                    <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                      <span>{fmtDate(a.attendance_date)}</span>
                      <Badge variant="secondary" className="text-[10px]">{labelize(a.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="payments">
              {payments.isLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
              ) : !payments.data?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {payments.data.map((p) => (
                    <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{labelize(p.payment_type)}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(p.paid_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{Number(p.amount).toLocaleString()} {p.currency}</div>
                        <div className="text-xs text-muted-foreground">{p.receipt_number}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground w-24">{label}</span>
      <span className="text-sm text-foreground flex-1 truncate">{value}</span>
    </div>
  );
}
