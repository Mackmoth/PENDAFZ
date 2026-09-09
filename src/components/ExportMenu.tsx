import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { exportCsv, exportPdf, exportXlsx, type Row } from "@/lib/exports";

export function ExportMenu({
  name,
  rows,
  title,
  orientation = "portrait",
  size = "sm",
  disabled,
}: {
  name: string;
  rows: Row[];
  title?: string;
  orientation?: "portrait" | "landscape";
  size?: "sm" | "default";
  disabled?: boolean;
}) {
  const empty = !rows.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={disabled || empty}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportPdf(name, rows, { title, orientation })}>
          <FileType className="w-4 h-4 mr-2 text-primary" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXlsx(name, rows)}>
          <FileSpreadsheet className="w-4 h-4 mr-2 text-success" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportCsv(name, rows)}>
          <FileText className="w-4 h-4 mr-2 text-muted-foreground" /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
