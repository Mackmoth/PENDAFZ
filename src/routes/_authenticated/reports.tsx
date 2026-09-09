import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, labelize } from "@/lib/pfms";
import { ExportMenu } from "@/components/ExportMenu";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — PFMS" }] }),
  component: ReportsPage,
});

const COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function ReportsPage() {
  const members = useQuery({
    queryKey: ["reports", "members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("status, gender, date_of_birth, branch_id, department_id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const payments = useQuery({
    queryKey: ["reports", "payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount, payment_type, paid_at").order("paid_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const attendance = useQuery({
    queryKey: ["reports", "attendance"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data, error } = await supabase.from("attendance").select("status, attendance_date").gte("attendance_date", since.toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
  });

  const membersByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members.data ?? []) map[m.status] = (map[m.status] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name: labelize(name), value }));
  }, [members.data]);

  const genderDist = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members.data ?? []) {
      const k = m.gender ?? "unspecified";
      map[k] = (map[k] ?? 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name: labelize(name), value }));
  }, [members.data]);

  const growth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members.data ?? []) {
      const d = new Date(m.created_at as string);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[k] = (map[k] ?? 0) + 1;
    }
    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
    let cum = 0;
    return entries.map(([month, n]) => { cum += n; return { month, new: n, total: cum }; });
  }, [members.data]);

  const paymentsByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments.data ?? []) {
      const key = labelize(p.payment_type);
      map[key] = (map[key] ?? 0) + Number(p.amount);
    }
    return Object.entries(map).map(([name, total]) => ({ name, total }));
  }, [payments.data]);

  const monthlyIncome = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments.data ?? []) {
      if (p.payment_type === "expense") continue;
      const d = new Date(p.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] ?? 0) + Number(p.amount);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, income]) => ({ month, income }));
  }, [payments.data]);

  const attendanceByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of attendance.data ?? []) map[a.status] = (map[a.status] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name: labelize(name), value }));
  }, [attendance.data]);

  const totalIncome = (payments.data ?? []).filter((p) => p.payment_type !== "expense").reduce((s, p) => s + Number(p.amount), 0);
  const totalExpense = (payments.data ?? []).filter((p) => p.payment_type === "expense").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Insights across members, attendance and finance."
        action={
          <ExportMenu
            name="pfms-summary"
            title="PFMS Summary"
            rows={[
              { Metric: "Total members", Value: members.data?.length ?? 0 },
              { Metric: "Total income", Value: formatMoney(totalIncome) },
              { Metric: "Total expenses", Value: formatMoney(totalExpense) },
              { Metric: "Net balance", Value: formatMoney(totalIncome - totalExpense) },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total members</div><div className="text-2xl font-semibold mt-1">{members.data?.length ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total income</div><div className="text-2xl font-semibold mt-1">{formatMoney(totalIncome)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total expenses</div><div className="text-2xl font-semibold mt-1 text-destructive">{formatMoney(totalExpense)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Net balance</div><div className="text-2xl font-semibold mt-1 text-success">{formatMoney(totalIncome - totalExpense)}</div></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="Monthly income" name="monthly-income" rows={monthlyIncome}>
          <BarChart data={monthlyIncome}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="month" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip formatter={(v: number) => formatMoney(v)} />
            <Bar dataKey="income" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Membership growth" name="membership-growth" rows={growth}>
          <LineChart data={growth}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="month" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="new" stroke="var(--color-primary)" strokeWidth={2} />
            <Line type="monotone" dataKey="total" stroke="var(--color-success)" strokeWidth={2} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Members by status" name="members-by-status" rows={membersByStatus}>
          <PieChart>
            <Pie data={membersByStatus} dataKey="value" nameKey="name" outerRadius={80} label>
              {membersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ChartCard>

        <ChartCard title="Gender distribution" name="gender-distribution" rows={genderDist}>
          <PieChart>
            <Pie data={genderDist} dataKey="value" nameKey="name" outerRadius={80} label>
              {genderDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ChartCard>

        <ChartCard title="Payments by type" name="payments-by-type" rows={paymentsByType}>
          <BarChart data={paymentsByType}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip formatter={(v: number) => formatMoney(v)} />
            <Bar dataKey="total" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Attendance (30 days)" name="attendance-30d" rows={attendanceByStatus}>
          <PieChart>
            <Pie data={attendanceByStatus} dataKey="value" nameKey="name" outerRadius={80} label>
              {attendanceByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title, name, rows, children,
}: {
  title: string; name: string; rows: Record<string, string | number>[]; children: React.ReactElement;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <ExportMenu name={name} title={title} rows={rows} />
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
