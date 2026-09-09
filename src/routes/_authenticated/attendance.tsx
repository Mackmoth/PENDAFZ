import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import { ATTENDANCE_STATUSES, fmtDate, labelize, type Member } from "@/lib/pfms";
import { toast } from "sonner";
import { ClipboardCheck, Plus, Search, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — PFMS" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const { hasAnyRole } = useUserContext();
  const canRecord = hasAnyRole(["super_admin", "admin", "attendance_officer"]);
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["attendance", "day", dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, members(full_name, membership_number), events(title)")
        .eq("attendance_date", dateFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => (list.data ?? []).filter((a: { status: string }) => statusFilter === "all" || a.status === statusFilter),
    [list.data, statusFilter],
  );

  const stats = useMemo(() => {
    const items = list.data ?? [];
    return {
      total: items.length,
      present: items.filter((i: { status: string }) => i.status === "present").length,
      late: items.filter((i: { status: string }) => i.status === "late").length,
      absent: items.filter((i: { status: string }) => i.status === "absent").length,
    };
  }, [list.data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        description="Record and review attendance for members."
        action={
          canRecord && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Record attendance
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ClipboardCheck} label="Records" value={stats.total} tone="primary" />
        <StatCard icon={CheckCircle2} label="Present" value={stats.present} tone="success" />
        <StatCard icon={Clock} label="Late" value={stats.late} tone="warning" />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} tone="destructive" />
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ATTENDANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{labelize(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {list.isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground text-center">Loading…</Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No attendance recorded"
          description={`No records for ${fmtDate(dateFilter)}.`}
          action={canRecord ? <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Record now</Button> : undefined}
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((a: {
            id: string; status: string; time_in: string | null; notes: string | null;
            members: { full_name: string; membership_number: string } | null;
            events: { title: string } | null;
          }) => (
            <div key={a.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{a.members?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {a.members?.membership_number}
                  {a.events?.title ? ` · ${a.events.title}` : ""}
                  {a.time_in ? ` · ${a.time_in}` : ""}
                </div>
              </div>
              <Badge variant={a.status === "present" ? "default" : "secondary"} className="text-[10px] shrink-0">
                {labelize(a.status)}
              </Badge>
              {canRecord && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Delete record"
                  onClick={async () => {
                    if (!confirm("Delete this attendance record?")) return;
                    const { error } = await supabase.from("attendance").delete().eq("id", a.id);
                    if (error) return toast.error(error.message);
                    toast.success("Deleted");
                    qc.invalidateQueries({ queryKey: ["attendance"] });
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </Card>

      )}

      <RecordAttendanceDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={dateFilter}
        onSaved={() => qc.invalidateQueries({ queryKey: ["attendance"] })}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneCls}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold text-foreground">{value}</div>
      </div>
    </Card>
  );
}

function RecordAttendanceDialog({
  open, onOpenChange, defaultDate, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; defaultDate: string; onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [status, setStatus] = useState<string>("present");
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");

  const members = useQuery({
    queryKey: ["members", "picker", search],
    queryFn: async () => {
      let qb = supabase.from("members").select("*").order("full_name").limit(20);
      if (search.trim()) {
        qb = qb.or(`full_name.ilike.%${search}%,membership_number.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    enabled: open,
  });

  const record = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a member");
      const { error } = await supabase.from("attendance").insert({
        member_id: selected.id,
        status: status as never,
        attendance_date: date,
        time_in: new Date().toTimeString().slice(0, 8),
        branch_id: selected.branch_id,
        department_id: selected.department_id,
        notes: notes || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance recorded");
      onSaved();
      setSelected(null);
      setNotes("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record attendance</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!selected ? (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search member by name, number, phone"
                  className="pl-9"
                />
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                {(members.data ?? []).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className="w-full text-left px-3 py-2 hover:bg-accent"
                  >
                    <div className="text-sm font-medium">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground">{m.membership_number}</div>
                  </button>
                ))}
                {members.data?.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground text-center">No members found.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <Card className="p-3">
                <div className="text-sm font-medium">{selected.full_name}</div>
                <div className="text-xs text-muted-foreground">{selected.membership_number}</div>
                <Button variant="link" size="sm" className="px-0 h-auto mt-1" onClick={() => setSelected(null)}>
                  Change member
                </Button>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{labelize(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => record.mutate()} disabled={!selected || record.isPending}>
            {record.isPending ? "Saving…" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
