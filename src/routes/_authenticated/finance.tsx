import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/lib/auth";
import {
  PAYMENT_METHODS, PAYMENT_TYPES, formatMoney, fmtDate, labelize, type Member, type Payment,
} from "@/lib/pfms";
import { toast } from "sonner";
import { DollarSign, Plus, Printer, Search, Receipt, TrendingUp, FileDown, Trash2 } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { exportReceiptPdf } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finance — PFMS" }] }),
  component: FinancePage,
});

function FinancePage() {
  const { hasAnyRole } = useUserContext();
  const canManage = hasAnyRole(["super_admin", "admin", "finance_officer"]);
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, members(full_name, membership_number)")
        .order("paid_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = payments.data ?? [];
    const term = q.trim().toLowerCase();
    return list.filter((p) => {
      if (typeFilter !== "all" && p.payment_type !== typeFilter) return false;
      if (!term) return true;
      return (
        (p.receipt_number ?? "").toLowerCase().includes(term) ||
        (p.members?.full_name ?? "").toLowerCase().includes(term) ||
        (p.reference_number ?? "").toLowerCase().includes(term)
      );
    });
  }, [payments.data, q, typeFilter]);

  const totals = useMemo(() => {
    const list = payments.data ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let today = 0, month = 0, income = 0, expense = 0;
    for (const p of list) {
      const amt = Number(p.amount);
      const d = new Date(p.paid_at);
      if (p.payment_type === "expense") expense += amt;
      else income += amt;
      if (d >= dayStart) today += p.payment_type === "expense" ? -amt : amt;
      if (d >= monthStart) month += p.payment_type === "expense" ? -amt : amt;
    }
    return { today, month, income, expense };
  }, [payments.data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finance"
        description="Record payments and track organization finances."
        action={
          <div className="flex gap-2">
            <ExportMenu
              name="payments"
              title="Payments"
              orientation="landscape"
              rows={(payments.data ?? []).map((p) => ({
                Receipt: p.receipt_number ?? "",
                Date: fmtDate(p.paid_at),
                Member: p.members?.full_name ?? "",
                Type: labelize(p.payment_type),
                Method: labelize(p.method),
                Amount: Number(p.amount),
                Currency: p.currency ?? "UGX",
                Reference: p.reference_number ?? "",
              }))}
            />
            {canManage && (
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Record payment
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MoneyStat label="Today" value={totals.today} icon={DollarSign} />
        <MoneyStat label="This month" value={totals.month} icon={TrendingUp} />
        <MoneyStat label="Total income" value={totals.income} icon={Receipt} />
        <MoneyStat label="Total expense" value={totals.expense} icon={DollarSign} tone="destructive" />
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search receipt, member, reference" className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{labelize(t)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {payments.isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground text-center">Loading…</Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No payments yet"
          description="Recorded payments will appear here."
          action={canManage ? <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Record payment</Button> : undefined}
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setReceipt(p as Payment)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {p.members?.full_name ?? "Unassigned"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.receipt_number} · {labelize(p.payment_type)} · {fmtDate(p.paid_at)}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold text-sm ${p.payment_type === "expense" ? "text-destructive" : "text-foreground"}`}>
                  {p.payment_type === "expense" ? "-" : ""}
                  {formatMoney(p.amount, p.currency)}
                </div>
                <Badge variant="outline" className="text-[10px]">{labelize(p.method)}</Badge>
              </div>
            </button>
          ))}
        </Card>
      )}

      <RecordPaymentDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["payments"] })} />
      <ReceiptDialog
        payment={receipt}
        onClose={() => setReceipt(null)}
        canManage={canManage}
        onDeleted={() => {
          setReceipt(null);
          qc.invalidateQueries({ queryKey: ["payments"] });
        }}
      />
    </div>
  );
}

function MoneyStat({
  label, value, icon: Icon, tone = "primary",
}: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: "primary" | "destructive";
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-lg font-semibold mt-1 ${tone === "destructive" ? "text-destructive" : "text-foreground"}`}>
            {formatMoney(value)}
          </div>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}

function RecordPaymentDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [search, setSearch] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [type, setType] = useState<string>("membership_fee");
  const [method, setMethod] = useState<string>("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const members = useQuery({
    queryKey: ["members", "picker", search],
    queryFn: async () => {
      let qb = supabase.from("members").select("*").order("full_name").limit(15);
      if (search.trim()) qb = qb.or(`full_name.ilike.%${search}%,membership_number.ilike.%${search}%`);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    enabled: open,
  });

  const save = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("payments").insert({
        member_id: member?.id ?? null,
        payment_type: type as never,
        method: method as never,
        amount: amt,
        reference_number: reference || null,
        notes: notes || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded — receipt generated");
      onSaved();
      onOpenChange(false);
      setMember(null); setAmount(""); setReference(""); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {member ? (
            <Card className="p-3">
              <div className="text-sm font-medium">{member.full_name}</div>
              <div className="text-xs text-muted-foreground">{member.membership_number}</div>
              <Button variant="link" size="sm" className="px-0 h-auto mt-1" onClick={() => setMember(null)}>Change member</Button>
            </Card>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus placeholder="Search member (optional for expenses)" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{labelize(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{labelize(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Reference #</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Record & generate receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ payment, onClose, canManage, onDeleted }: { payment: Payment | null; onClose: () => void; canManage?: boolean; onDeleted?: () => void }) {
  const withMember = payment as (Payment & { members?: { full_name?: string; membership_number?: string } | null }) | null;
  return (
    <Dialog open={!!payment} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
        {payment && (
          <div className="border rounded-lg p-6 bg-white text-black print:shadow-none" id="receipt-print">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center font-bold mx-auto mb-2">P</div>
              <div className="font-bold">Penda Foundation</div>
              <div className="text-xs text-gray-500">Official Payment Receipt</div>
            </div>
            <div className="border-t border-b py-3 my-3 space-y-1 text-sm">
              <Row k="Receipt #" v={payment.receipt_number} />
              <Row k="Date" v={fmtDate(payment.paid_at)} />
              <Row k="Member" v={withMember?.members?.full_name ?? "—"} />
              <Row k="Member #" v={withMember?.members?.membership_number ?? "—"} />
              <Row k="Type" v={labelize(payment.payment_type)} />
              <Row k="Method" v={labelize(payment.method)} />
              {payment.reference_number && <Row k="Reference" v={payment.reference_number} />}
            </div>
            <div className="text-center py-3">
              <div className="text-xs text-gray-500 uppercase">Amount</div>
              <div className="text-3xl font-bold text-primary">{formatMoney(payment.amount, payment.currency)}</div>
            </div>
            <div className="text-center text-[10px] text-gray-400 mt-3">
              Verify with receipt number at Penda Foundation
            </div>
          </div>
        )}
        <DialogFooter className="flex-wrap gap-2">
          {canManage && payment && onDeleted && (
            <Button
              variant="destructive"
              className="mr-auto"
              onClick={async () => {
                if (!confirm(`Delete receipt ${payment.receipt_number}? This cannot be undone.`)) return;
                const { error } = await supabase.from("payments").delete().eq("id", payment.id);
                if (error) return toast.error(error.message);
                toast.success("Payment deleted");
                onDeleted();
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => payment && exportReceiptPdf(withMember!)}>
            <FileDown className="w-4 h-4 mr-2" />PDF
          </Button>
          <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
