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
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import { fmtDateTime, type Announcement } from "@/lib/pfms";
import { toast } from "sonner";
import { Megaphone, Plus, Pin, Archive, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — PFMS" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { hasAnyRole } = useUserContext();
  const canManage = hasAnyRole(["super_admin", "admin", "secretary"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements").select("*")
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

  const togglePin = async (a: Announcement) => {
    const { error } = await supabase.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };
  const archive = async (a: Announcement) => {
    const { error } = await supabase.from("announcements").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Announcement archived");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };
  const remove = async (a: Announcement) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Announcements"
        description="Share updates with the organization."
        action={canManage && <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New announcement</Button>}
      />

      {list.isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground text-center">Loading…</Card>
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Posted announcements will appear here."
          action={canManage ? <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Post first</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {list.data!.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {a.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                    <h3 className="font-semibold text-foreground truncate">{a.title}</h3>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {fmtDateTime(a.published_at ?? a.created_at)}
                    {a.status !== "published" && <> · <Badge variant="secondary" className="text-[10px]">{a.status}</Badge></>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => togglePin(a)}><Pin className={`w-3.5 h-3.5 ${a.pinned ? "text-primary" : ""}`} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => archive(a)}><Archive className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(a)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">{a.body}</p>
            </Card>
          ))}
        </div>
      )}

      <NewAnnouncementDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["announcements"] })} />
    </div>
  );
}

function NewAnnouncementDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Title and message required");
      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        body: body.trim(),
        pinned,
        status: "published",
        published_at: new Date().toISOString(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement posted");
      setTitle(""); setBody(""); setPinned(false);
      onSaved(); onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={pinned} onCheckedChange={setPinned} id="pin" />
            <Label htmlFor="pin" className="cursor-pointer">Pin to top</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
