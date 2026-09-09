import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchBranches, fmtDate, type Member } from "@/lib/pfms";
import { toast } from "sonner";
import { FileText, Upload, Search, Download, Trash2, Eye, Loader2, Paperclip } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — PFMS" },
      { name: "description", content: "Central repository for member documents, receipts, forms and reports." },
    ],
  }),
  component: DocumentsPage,
});

const DOC_TYPES = [
  "membership_form",
  "id_document",
  "receipt",
  "certificate",
  "meeting_minutes",
  "report",
  "photo",
  "other",
] as const;

type DocRow = {
  id: string;
  member_id: string;
  doc_type: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  members?: { full_name: string; membership_number: string | null } | null;
};

function DocumentsPage() {
  const { hasAnyRole } = useUserContext();
  const canManage = hasAnyRole(["super_admin", "admin", "secretary", "welfare_officer"]);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<DocRow | null>(null);

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_documents")
        .select("*, members(full_name, membership_number)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const filtered = useMemo(() => {
    const list = docs.data ?? [];
    const term = q.trim().toLowerCase();
    return list.filter((d) => {
      if (type !== "all" && d.doc_type !== type) return false;
      if (!term) return true;
      return (
        d.file_name.toLowerCase().includes(term) ||
        (d.members?.full_name ?? "").toLowerCase().includes(term) ||
        (d.members?.membership_number ?? "").toLowerCase().includes(term)
      );
    });
  }, [docs.data, q, type]);

  const del = useMutation({
    mutationFn: async (d: DocRow) => {
      await supabase.storage.from("member-files").remove([d.file_path]);
      const { error } = await supabase.from("member_documents").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openSigned = async (d: DocRow, download = false) => {
    const { data, error } = await supabase.storage
      .from("member-files")
      .createSignedUrl(d.file_path, 300, download ? { download: d.file_name } : undefined);
    if (error || !data) return toast.error(error?.message ?? "Could not open file");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        description="Membership forms, receipts, certificates and reports."
        action={
          canManage && (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload document
            </Button>
          )
        }
      />

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search file, member, number"
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {docs.isLoading ? (
        <div className="py-10 text-center">
          <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={docs.data?.length ? "No documents match your filters" : "No documents yet"}
          description={
            docs.data?.length
              ? "Try clearing filters or search."
              : "Upload the first document to get started."
          }
          action={canManage && !docs.data?.length ? (
            <Button onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" />Upload document</Button>
          ) : undefined}
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <button
                onClick={() => setPreview(d)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="font-medium text-sm text-foreground truncate">{d.file_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {d.members?.full_name ?? "—"}
                  {d.members?.membership_number ? ` · ${d.members.membership_number}` : ""}
                  {" · "}{fmtDate(d.created_at)}
                  {d.size_bytes ? ` · ${formatSize(d.size_bytes)}` : ""}
                </div>
              </button>
              {d.doc_type && (
                <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                  {d.doc_type.replace(/_/g, " ")}
                </Badge>
              )}
              <Button variant="ghost" size="icon" aria-label="Preview" onClick={() => setPreview(d)}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Download" onClick={() => openSigned(d, true)}>
                <Download className="w-4 h-4" />
              </Button>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${d.file_name}"?`)) del.mutate(d);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["documents"] })}
      />

      <PreviewDialog doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function UploadDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [search, setSearch] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [docType, setDocType] = useState<string>("other");
  const [file, setFile] = useState<File | null>(null);

  useQuery({ queryKey: ["branches"], queryFn: fetchBranches, enabled: false });

  const members = useQuery({
    queryKey: ["members", "doc-picker", search],
    queryFn: async () => {
      let qb = supabase.from("members").select("*").order("full_name").limit(15);
      if (search.trim()) qb = qb.or(`full_name.ilike.%${search}%,membership_number.ilike.%${search}%`);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    enabled: open,
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Select a member");
      if (!file) throw new Error("Choose a file");
      const path = `${member.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("member-files")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("member_documents").insert({
        member_id: member.id,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      } as never);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      onSaved();
      onOpenChange(false);
      setMember(null); setFile(null); setDocType("other"); setSearch("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {member ? (
            <Card className="p-3">
              <div className="text-sm font-medium">{member.full_name}</div>
              <div className="text-xs text-muted-foreground">{member.membership_number}</div>
              <Button variant="link" size="sm" className="px-0 h-auto mt-1" onClick={() => setMember(null)}>
                Change member
              </Button>
            </Card>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus placeholder="Search member" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                {(members.data ?? []).map((m) => (
                  <button key={m.id} onClick={() => setMember(m)} className="w-full text-left px-3 py-2 hover:bg-accent">
                    <div className="text-sm font-medium">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground">{m.membership_number}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          <div>
            <Label>Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <div className="text-xs text-muted-foreground mt-1">
                {file.name} · {formatSize(file.size)}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => upload.mutate()} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ doc, onClose }: { doc: DocRow | null; onClose: () => void }) {
  const url = useQuery({
    queryKey: ["doc-signed", doc?.id],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("member-files")
        .createSignedUrl(doc!.file_path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!doc,
  });

  if (!doc) return null;
  const isImage = doc.mime_type?.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";

  return (
    <Dialog open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{doc.file_name}</DialogTitle>
        </DialogHeader>
        <div className="min-h-[300px] bg-muted rounded-md overflow-hidden flex items-center justify-center">
          {url.isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : url.data ? (
            isImage ? (
              <img src={url.data} alt={doc.file_name} className="max-h-[70vh] object-contain" />
            ) : isPdf ? (
              <iframe src={url.data} title={doc.file_name} className="w-full h-[70vh] border-0" />
            ) : (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
              </div>
            )
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {url.data && (
            <Button asChild>
              <a href={url.data} download={doc.file_name} target="_blank" rel="noreferrer">
                <Download className="w-4 h-4 mr-2" />Download
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
