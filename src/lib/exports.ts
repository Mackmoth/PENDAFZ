import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type Row = Record<string, string | number | null | undefined>;

const filename = (name: string, ext: string) =>
  `${name.replace(/[^\w-]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.${ext}`;

export function exportCsv(name: string, rows: Row[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename(name, "csv"));
}

export function exportXlsx(name: string, rows: Row[], sheetName = "Sheet1") {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
  XLSX.writeFile(wb, filename(name, "xlsx"));
}

export function exportPdf(
  name: string,
  rows: Row[],
  opts: { title?: string; subtitle?: string; orientation?: "portrait" | "landscape" } = {},
) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: opts.orientation ?? "portrait", unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(227, 28, 37); // Penda Red
  doc.text("Penda Foundation", 40, 44);

  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(opts.title ?? name, 40, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(opts.subtitle ?? new Date().toLocaleString(), 40, 80);

  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    startY: 96,
    head: [headers],
    body: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [227, 28, 37], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: 40, right: 40 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pages}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" },
    );
  }

  doc.save(filename(name, "pdf"));
}

export function exportReceiptPdf(payment: {
  receipt_number?: string | null;
  paid_at?: string | null;
  amount: number | string;
  currency?: string | null;
  payment_type: string;
  method: string;
  reference_number?: string | null;
  notes?: string | null;
  members?: { full_name?: string | null; membership_number?: string | null } | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(227, 28, 37);
  doc.rect(0, 0, w, 60, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Penda Foundation", w / 2, 30, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Payment Receipt", w / 2, 46, { align: "center" });

  doc.setTextColor(31, 41, 55);
  const rows: [string, string][] = [
    ["Receipt #", payment.receipt_number ?? "—"],
    ["Date", payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "—"],
    ["Member", payment.members?.full_name ?? "—"],
    ["Member #", payment.members?.membership_number ?? "—"],
    ["Type", payment.payment_type.replace(/_/g, " ")],
    ["Method", payment.method.replace(/_/g, " ")],
  ];
  if (payment.reference_number) rows.push(["Reference", payment.reference_number]);

  autoTable(doc, {
    startY: 80,
    body: rows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { textColor: [107, 114, 128] }, 1: { fontStyle: "bold" } },
    margin: { left: 30, right: 30 },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setDrawColor(230);
  doc.line(30, y, w - 30, y);
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("AMOUNT", w / 2, y + 22, { align: "center" });
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(227, 28, 37);
  const amt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: payment.currency ?? "UGX",
    maximumFractionDigits: 0,
  }).format(Number(payment.amount));
  doc.text(amt, w / 2, y + 50, { align: "center" });

  if (payment.notes) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(payment.notes, 30, y + 80, { maxWidth: w - 60 });
  }

  doc.setFontSize(7);
  doc.setTextColor(160);
  doc.text(
    "Verify this receipt with Penda Foundation.",
    w / 2,
    doc.internal.pageSize.getHeight() - 20,
    { align: "center" },
  );

  doc.save(`receipt_${payment.receipt_number ?? "unknown"}.pdf`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
