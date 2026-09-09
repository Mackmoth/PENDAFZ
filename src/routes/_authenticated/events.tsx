import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import {
  EVENT_STATUSES, fetchBranches, fetchDepartments, fmtDate, labelize, type EventRow,
} from "@/lib/pfms";
import { toast } from "sonner";
import { Calendar as CalIcon, CalendarPlus, MapPin, Users, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events — PFMS" }] }),
  component: EventsPage,
});

function EventsPage() {
  const { hasAnyRole } = useUserContext();
  const canManage = hasAnyRole(["super_admin", "admin", "secretary"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events").select("*").order("event_date", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const branches = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });
  const departments = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  const remove = async (e: EventRow) => {
    if (!confirm(`Delete event "${e.title}"? This also removes its registrations and attendance.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const now = new Date();
  const upcoming = (events.data ?? []).filter((e) => new Date(e.event_date) >= new Date(now.toDateString()));
  const past = (events.data ?? []).filter((e) => new Date(e.event_date) < new Date(now.toDateString()));


  return (
    <div className="space-y-4">
      <PageHeader
        title="Events"
        description="Meetings, trainings, seminars and community activities."
        action={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <CalendarPlus className="w-4 h-4 mr-2" />
              Create event
            </Button>
          )
        }
      />

      {events.isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground text-center">Loading…</Card>
      ) : (events.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CalIcon}
          title="No events yet"
          description="Create your first event to get started."
          action={canManage ? <Button onClick={() => setOpen(true)}><CalendarPlus className="w-4 h-4 mr-2" />Create event</Button> : undefined}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-2">Upcoming</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {upcoming.map((e) => <EventCard key={e.id} event={e} canManage={canManage} onDelete={() => remove(e)} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-2 mt-4">Past</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {past.map((e) => <EventCard key={e.id} event={e} canManage={canManage} onDelete={() => remove(e)} />)}
              </div>
            </section>
          )}

        </>
      )}

      <CreateEventDialog
        open={open}
        onOpenChange={setOpen}
        branches={branches.data ?? []}
        departments={departments.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["events"] })}
      />
    </div>
  );
}

function EventCard({ event, canManage, onDelete }: { event: EventRow; canManage?: boolean; onDelete?: () => void }) {
  return (
    <Card className="p-4 hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground truncate">{event.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            <CalIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {fmtDate(event.event_date, { weekday: "short", month: "short", day: "numeric" })}
              {event.start_time && ` · ${event.start_time.slice(0, 5)}`}
            </span>
          </div>
          {event.venue && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{event.venue}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={event.status === "scheduled" ? "default" : "secondary"} className="text-[10px]">
            {labelize(event.status)}
          </Badge>
          {canManage && onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} aria-label="Delete event">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {event.description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
      )}
      {event.max_participants && (
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Capacity {event.max_participants}
        </div>
      )}
    </Card>
  );
}

function CreateEventDialog({
  open, onOpenChange, branches, departments, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  branches: { id: string; name: string }[]; departments: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", start_time: "", end_time: "",
    venue: "", category: "", branch_id: "", department_id: "", max_participants: "",
    status: "scheduled",
  });
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.event_date) throw new Error("Title and date are required");
      const { error } = await supabase.from("events").insert({
        title: form.title.trim(),
        description: form.description || null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        venue: form.venue || null,
        category: form.category || null,
        branch_id: form.branch_id || null,
        department_id: form.department_id || null,
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        status: form.status as never,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event created");
      onSaved();
      onOpenChange(false);
      setForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", venue: "", category: "", branch_id: "", department_id: "", max_participants: "", status: "scheduled" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div><Label>Date *</Label><Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} /></div>
          <div><Label>Category</Label><Input placeholder="Meeting, Training…" value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
          <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} /></div>
          <div><Label>End time</Label><Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} /></div>
          <div className="col-span-2"><Label>Venue</Label><Input value={form.venue} onChange={(e) => set("venue", e.target.value)} /></div>
          <div>
            <Label>Branch</Label>
            <Select value={form.branch_id} onValueChange={(v) => set("branch_id", v)}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Max participants</Label><Input type="number" value={form.max_participants} onChange={(e) => set("max_participants", e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{labelize(s)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
