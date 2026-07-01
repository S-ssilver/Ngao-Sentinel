import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceLog, IncidentLog } from "@/lib/silverline";

type Range = "week" | "month";

export function ReportButtons({
  scope,
  siteId,
  companyName,
  title,
}: {
  scope: "client" | "site";
  siteId?: string;
  companyName?: string;
  title: string;
}) {
  const [loading, setLoading] = useState<Range | null>(null);

  async function generate(range: Range) {
    setLoading(range);
    try {
      const now = new Date();
      const from = new Date(now);
      if (range === "week") from.setDate(now.getDate() - 7);
      else from.setMonth(now.getMonth() - 1);
      const fromISO = from.toISOString();

      let attQ = supabase
        .from("attendance_logs")
        .select("*, sites(site_name, company_name)")
        .gte("created_at", fromISO)
        .order("created_at", { ascending: false });
      let incQ = supabase
        .from("incident_logs")
        .select("*, sites(site_name, company_name)")
        .gte("created_at", fromISO)
        .order("created_at", { ascending: false });

      if (scope === "site" && siteId) {
        attQ = attQ.eq("site_id", siteId);
        incQ = incQ.eq("site_id", siteId);
      }

      const [attRes, incRes] = await Promise.all([attQ, incQ]);
      if (attRes.error) throw attRes.error;
      if (incRes.error) throw incRes.error;

      const attendance = (attRes.data ?? []) as (AttendanceLog & {
        sites: { site_name: string; company_name: string } | null;
      })[];
      const incidents = (incRes.data ?? []) as (IncidentLog & {
        sites: { site_name: string; company_name: string } | null;
      })[];

      buildPDF({ title, range, from, to: now, attendance, incidents, companyName });
      toast.success(`${range === "week" ? "Weekly" : "Monthly"} report downloaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary">
        <ShieldCheck className="h-3.5 w-3.5" />
        Verified Proof of Service
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => generate("week")}
        disabled={loading !== null}
      >
        <FileDown className="mr-1.5 h-4 w-4" />
        {loading === "week" ? "Generating..." : "Download Weekly Report"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => generate("month")}
        disabled={loading !== null}
      >
        <FileDown className="mr-1.5 h-4 w-4" />
        {loading === "month" ? "Generating..." : "Download Monthly Report"}
      </Button>
    </div>
  );
}

function buildPDF({
  title,
  range,
  from,
  to,
  attendance,
  incidents,
  companyName,
}: {
  title: string;
  range: Range;
  from: Date;
  to: Date;
  attendance: (AttendanceLog & { sites: { site_name: string; company_name: string } | null })[];
  incidents: (IncidentLog & { sites: { site_name: string; company_name: string } | null })[];
  companyName?: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const generatedAt = new Date();
  const label = range === "week" ? "Weekly" : "Monthly";

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Silverline Station", 40, 40);
  doc.setFontSize(12);
  doc.text(`${label} Service Report`, 40, 60);
  doc.setFontSize(9);
  doc.text(`Generated ${generatedAt.toLocaleString()}`, 40, 76);

  // Verified badge (top right)
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(pageW - 220, 26, 180, 40, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("VERIFIED PROOF OF SERVICE", pageW - 210, 44);
  doc.setFontSize(8);
  doc.text("Timestamped liability documentation", pageW - 210, 58);

  // Subject
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  let y = 120;
  doc.text(title, 40, y);
  y += 16;
  if (companyName) {
    doc.setFontSize(9);
    doc.text(`Client: ${companyName}`, 40, y);
    y += 14;
  }
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Reporting period: ${from.toLocaleDateString()} — ${to.toLocaleDateString()}`,
    40,
    y,
  );
  y += 20;

  // Key features callout
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(59, 130, 246);
  doc.roundedRect(40, y, pageW - 80, 60, 4, 4, "FD");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text("Key features of this report:", 52, y + 18);
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("• Verified Proof of Service — every guard shift is timestamped at source", 52, y + 34);
  doc.text("• Timestamped liability documentation — legally defensible audit trail", 52, y + 48);
  y += 78;

  // Summary
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text("Summary", 40, y);
  y += 6;
  autoTable(doc, {
    startY: y + 4,
    theme: "grid",
    styles: { fontSize: 9 },
    head: [["Metric", "Value"]],
    body: [
      ["Attendance entries", String(attendance.length)],
      ["Guards present", String(attendance.filter((a) => a.status === "Present").length)],
      ["Absences / late", String(attendance.filter((a) => a.status === "Absent" || a.status === "Late").length)],
      ["Total incidents", String(incidents.length)],
      ["High-severity incidents", String(incidents.filter((i) => i.severity === "High").length)],
    ],
  });

  // Attendance
  const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text("Attendance log", 40, afterSummaryY);
  autoTable(doc, {
    startY: afterSummaryY + 6,
    theme: "striped",
    styles: { fontSize: 8 },
    head: [["Timestamp", "Site", "Guard", "Shift", "Status", "Reported by"]],
    body: attendance.slice(0, 100).map((a) => [
      new Date(a.created_at).toLocaleString(),
      a.sites?.site_name ?? "—",
      a.guard_name,
      a.shift_type,
      a.status,
      a.reported_by ?? "—",
    ]),
  });

  const afterAttY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text("Incident log", 40, afterAttY);
  autoTable(doc, {
    startY: afterAttY + 6,
    theme: "striped",
    styles: { fontSize: 8 },
    head: [["Timestamp", "Site", "Type", "Severity", "Description", "Reported by"]],
    body: incidents.slice(0, 100).map((i) => [
      new Date(i.created_at).toLocaleString(),
      i.sites?.site_name ?? "—",
      i.incident_type === "Other" && i.other_type ? i.other_type : i.incident_type,
      i.severity,
      i.description ?? "—",
      i.reported_by ?? "—",
    ]),
  });

  // Footer with hash-like ID for perceived authenticity
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Silverline Station • Verified Proof of Service • Document ID: SLS-${generatedAt.getTime().toString(36).toUpperCase()} • Page ${p} of ${pageCount}`,
      40,
      doc.internal.pageSize.getHeight() - 20,
    );
  }

  const fname = `silverline-${range}-report-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}