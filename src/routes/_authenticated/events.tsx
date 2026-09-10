import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, EmptyState, PageTransition, ConfirmDeleteDialog } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import { EVENT_STATUSES, fetchDepartments, fmtDate, labelize, type EventRow } from "@/lib/pfms";
import { toast } from "sonner";
import { Calendar as CalIcon, CalendarPlus, MapPin, Users, Trash2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events — PFMS" }] }),
  component: EventsPage,
});

function EventsPage() {
  const { hasAnyRole } = useUserContext();
  const canManage = hasAnyRole(["super_admin", "admin", "secretary"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const departments = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const now = new Date();
  const todayStart = new Date(now.toDateString());
  const upcoming = (events.data ?? []).filter((e) => new Date(e.event_date) >= todayStart);
  const past = (events.data ?? []).filter((e) => new Date(e.event_date) < todayStart);

  return (
    <PageTransition>
      <div className="space-y-6">
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
          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="skeleton skeleton-text w-2/3" />
                    <div className="skeleton skeleton-text w-1/2" />
                  </div>
                  <div className="skeleton skeleton-text w-14" />
                </div>
                <div className="skeleton skeleton-text w-full" />
                <div className="skeleton skeleton-text w-1/3" />
              </div>
            ))}
          </div>
        ) : (events.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No events yet"
            description="Create your first event to get started."
            action={
              canManage ? (
                <Button onClick={() => setOpen(true)}>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Create event
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="animate-fade-in">
                <h2 className="text-sm font-semibold mb-3">Upcoming</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {upcoming.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      canManage={canManage}
                      onDelete={() => setDeleteTarget(e)}
                    />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section className="animate-fade-in">
                <h2 className="text-sm font-semibold mb-3 mt-4">Past</h2>
                <div className="grid sm:grid-cols-2 gap-3 opacity-70">
                  {past.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      canManage={canManage}
                      onDelete={() => setDeleteTarget(e)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
          title={`Delete "${deleteTarget?.title ?? ""}"?`}
          description="This also removes its registrations and attendance. This action cannot be undone."
          onConfirm={handleDelete}
          loading={deleting}
        />

        <CreateEventDialog
          open={open}
          onOpenChange={setOpen}
          departments={departments.data ?? []}
          onSaved={() => qc.invalidateQueries({ queryKey: ["events"] })}
        />
      </div>
    </PageTransition>
  );
}

function EventCard({
  event,
  canManage,
  onDelete,
}: {
  event: EventRow;
  canManage?: boolean;
  onDelete?: () => void;
}) {
  return (
    <Card className="p-4 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all">
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
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant={event.status === "scheduled" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {labelize(event.status)}
          </Badge>
          {canManage && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDelete}
              aria-label="Delete event"
            >
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
  open,
  onOpenChange,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    venue: "",
    category: "",
    department_id: "",
    max_participants: "",
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
      setForm({
        title: "",
        description: "",
        event_date: "",
        start_time: "",
        end_time: "",
        venue: "",
        category: "",
        department_id: "",
        max_participants: "",
        status: "scheduled",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              placeholder="Meeting, Training…"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </div>
          <div>
            <Label>Start time</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => set("start_time", e.target.value)}
            />
          </div>
          <div>
            <Label>End time</Label>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => set("end_time", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Venue</Label>
            <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max participants</Label>
            <Input
              type="number"
              value={form.max_participants}
              onChange={(e) => set("max_participants", e.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {labelize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
