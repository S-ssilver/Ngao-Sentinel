import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AttendanceLog, IncidentLog } from "./silverline";

export type Range = "week" | "month";

type IncidentRow = IncidentLog & { sites?: { site_name: string; company_name: string } | null };
type AttendanceRow = AttendanceLog & { sites?: { site_name: string; company_name: string } | null };

export interface ReportInput {
  siteName: string;
  companyName?: string;
  range: Range;
  from: Date;
  to: Date;
  attendance: AttendanceRow[];
  incidents: IncidentRow[];
  prevAttendance?: AttendanceRow[];
  prevIncidents?: IncidentRow[];
  generatedBy?: string;
  verifiedBy?: string;
}

export interface ReportStats {
  totalIncidents: number;
  high: number;
  medium: number;
  low: number;
  mostCommonType: string;
  totalShifts: number;
  present: number;
  absent: number;
  late: number;
  replacement: number;
  attendanceRate: number;
  byType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  guardBreakdown: {
    guard: string;
    shifts: number;
    present: number;
    absent: number;
    late: number;
    replacement: number;
  }[];
}

export function computeStats(attendance: AttendanceRow[], incidents: IncidentRow[]): ReportStats {
  const total = incidents.length;
  const high = incidents.filter((i) => i.severity === "High").length;
  const medium = incidents.filter((i) => i.severity === "Medium").length;
  const low = incidents.filter((i) => i.severity === "Low").length;
  const typeMap = new Map<string, number>();
  incidents.forEach((i) => {
    const k = i.incident_type === "Other" && i.other_type ? i.other_type : i.incident_type;
    typeMap.set(k, (typeMap.get(k) ?? 0) + 1);
  });
  const byType = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const bySeverity = [
    { severity: "High", count: high },
    { severity: "Medium", count: medium },
    { severity: "Low", count: low },
  ];
  const shifts = attendance.length;
  const present = attendance.filter((a) => a.status === "Present").length;
  const absent = attendance.filter((a) => a.status === "Absent").length;
  const late = attendance.filter((a) => a.status === "Late").length;
  const replacement = attendance.filter((a) => a.status === "Replacement Required").length;
  const attendanceRate = shifts === 0 ? 0 : Math.round((present / shifts) * 100);

  const guardMap = new Map<
    string,
    { guard: string; shifts: number; present: number; absent: number; late: number; replacement: number }
  >();
  attendance.forEach((a) => {
    const g = guardMap.get(a.guard_name) ?? {
      guard: a.guard_name, shifts: 0, present: 0, absent: 0, late: 0, replacement: 0,
    };
    g.shifts += 1;
    if (a.status === "Present") g.present += 1;
    if (a.status === "Absent") g.absent += 1;
    if (a.status === "Late") g.late += 1;
    if (a.status === "Replacement Required") g.replacement += 1;
    guardMap.set(a.guard_name, g);
  });

  return {
    totalIncidents: total,
    high, medium, low,
    mostCommonType: byType[0]?.type ?? "None",
    totalShifts: shifts,
    present, absent, late, replacement,
    attendanceRate,
    byType, bySeverity,
    guardBreakdown: Array.from(guardMap.values()).sort((a, b) => b.shifts - a.shifts),
  };
}

function drawFooter(doc: jsPDF, documentId: string) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `ARN Security  •  Verified Proof of Service  •  Document ID: ${documentId}  •  Page ${p} of ${pageCount}`,
      40,
      pageH - 28,
    );
    doc.setTextColor(150, 150, 150);
    doc.text("Powered by Silverline Tech", 40, pageH - 16);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.line(40, pageH - 38, pageW - 40, pageH - 38);
  }
}

function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: { label: string; value: number }[],
  color: [number, number, number],
) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (w - 20) / Math.max(data.length, 1);
  // baseline
  doc.setDrawColor(200);
  doc.line(x + 20, y + h - 20, x + w, y + h - 20);
  data.forEach((d, i) => {
    const bh = ((h - 40) * d.value) / max;
    const bx = x + 20 + i * barW + barW * 0.15;
    const by = y + h - 20 - bh;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(bx, by, barW * 0.7, bh, "F");
    doc.setTextColor(80);
    doc.setFontSize(7);
    doc.text(String(d.value), bx + (barW * 0.7) / 2, by - 2, { align: "center" });
    const label = d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label;
    doc.text(label, bx + (barW * 0.7) / 2, y + h - 8, { align: "center" });
  });
}

function trend(cur: number, prev: number): { arrow: string; pct: string; dir: "up" | "down" | "flat" } {
  if (prev === 0 && cur === 0) return { arrow: "→", pct: "0%", dir: "flat" };
  if (prev === 0) return { arrow: "↑", pct: "new", dir: "up" };
  const change = Math.round(((cur - prev) / prev) * 100);
  if (change === 0) return { arrow: "→", pct: "0%", dir: "flat" };
  return { arrow: change > 0 ? "↑" : "↓", pct: `${change > 0 ? "+" : ""}${change}%`, dir: change > 0 ? "up" : "down" };
}

function recommendations(stats: ReportStats, prev: ReportStats): string[] {
  const out: string[] = [];
  const incT = trend(stats.totalIncidents, prev.totalIncidents);
  const topType = stats.byType[0];
  if (topType && prev.byType.length > 0) {
    const prevTop = prev.byType.find((t) => t.type === topType.type);
    if (prevTop && prevTop.count > 0) {
      const change = Math.round(((topType.count - prevTop.count) / prevTop.count) * 100);
      if (change > 20) {
        out.push(`${topType.type} incidents increased ${change}% vs last month — consider reviewing patrol coverage and access controls.`);
      }
    } else {
      out.push(`${topType.type} emerged as top incident type this month — brief supervisors on prevention protocols.`);
    }
  }
  if (stats.attendanceRate < 85) {
    out.push(`Attendance rate at ${stats.attendanceRate}% — below 85% threshold. Review guard rostering and reliability.`);
  }
  if (stats.replacement >= 3) {
    out.push(`${stats.replacement} replacement-required shifts logged — audit shift handover and standby coverage.`);
  }
  if (stats.high > prev.high) {
    out.push(`High-severity incidents up from ${prev.high} to ${stats.high} — escalate risk assessment to Operations.`);
  }
  if (incT.dir === "down" && stats.totalIncidents > 0) {
    out.push(`Overall incident count trending down (${incT.pct}) — maintain current deployment and patrol frequency.`);
  }
  if (out.length === 0) out.push("Site metrics are within normal operating range. Continue current security posture.");
  return out.slice(0, 4);
}

export function generateReportPDF(input: ReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const generatedAt = new Date();
  const documentId = `ARN-${generatedAt.getTime().toString(36).toUpperCase()}`;
  const label = input.range === "week" ? "Weekly" : "Monthly";
  const stats = computeStats(input.attendance, input.incidents);
  const prevStats = input.prevAttendance && input.prevIncidents
    ? computeStats(input.prevAttendance, input.prevIncidents)
    : null;

  // ========= PAGE 1 — COVER =========
  doc.setFillColor(26, 60, 94);
  doc.rect(0, 0, pageW, 260, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text("ARN Security", 40, 90);
  doc.setFontSize(16);
  doc.text(`${label} Service Report`, 40, 120);
  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(2);
  doc.line(40, 135, 200, 135);

  // Gold verified badge
  doc.setFillColor(201, 168, 76);
  doc.roundedRect(pageW - 240, 60, 200, 60, 8, 8, "F");
  doc.setTextColor(26, 60, 94);
  doc.setFontSize(11);
  doc.text("VERIFIED PROOF OF SERVICE", pageW - 230, 85);
  doc.setFontSize(8);
  doc.text("Timestamped liability documentation", pageW - 230, 100);
  doc.text(`Doc ID: ${documentId}`, pageW - 230, 112);

  // Site + period
  doc.setTextColor(15, 23, 42);
  let y = 300;
  doc.setFontSize(20);
  doc.text(input.siteName, 40, y);
  y += 22;
  if (input.companyName) {
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Client: ${input.companyName}`, 40, y);
    y += 22;
  }
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Reporting Period: ${input.from.toLocaleDateString()} — ${input.to.toLocaleDateString()}`, 40, y);
  y += 16;
  doc.text(`Generated: ${generatedAt.toLocaleString()}`, 40, y);
  y += 40;

  // Signature-style fields
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Generated by: ${input.generatedBy ?? "Operations Manager"}`, 40, y);
  y += 20;
  doc.text(`Verified by:  ${input.verifiedBy ?? "ARN Security Quality Assurance"}`, 40, y);

  // ========= PAGE 2 — EXECUTIVE SUMMARY =========
  doc.addPage();
  y = 60;
  doc.setFontSize(18);
  doc.setTextColor(26, 60, 94);
  doc.text("Executive Summary", 40, y);
  y += 20;

  const narrative =
    `During the period ${input.from.toLocaleDateString()} — ${input.to.toLocaleDateString()}, ` +
    `${input.siteName} recorded ${stats.totalIncidents} security incident${stats.totalIncidents === 1 ? "" : "s"}, of which ` +
    `${stats.high} were high severity. Guard attendance stood at ${stats.attendanceRate}%, with ` +
    `${stats.absent} absence${stats.absent === 1 ? "" : "s"} and ${stats.late} late arrival${stats.late === 1 ? "" : "s"} ` +
    `recorded across ${stats.totalShifts} logged shift${stats.totalShifts === 1 ? "" : "s"}.`;

  doc.setFontSize(10);
  doc.setTextColor(50);
  const wrapped = doc.splitTextToSize(narrative, pageW - 80);
  doc.text(wrapped, 40, y);
  y += wrapped.length * 14 + 16;

  // Summary stats table
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [26, 60, 94] },
    styles: { fontSize: 10 },
    head: [["Metric", `This ${label === "Weekly" ? "Week" : "Month"}`]],
    body: [
      ["Total incidents", String(stats.totalIncidents)],
      ["High severity incidents", String(stats.high)],
      ["Medium severity incidents", String(stats.medium)],
      ["Low severity incidents", String(stats.low)],
      ["Most common incident type", stats.mostCommonType],
      ["Total guard shifts logged", String(stats.totalShifts)],
      ["Attendance rate", `${stats.attendanceRate}%`],
      ["Absences", String(stats.absent)],
      ["Late arrivals", String(stats.late)],
      ["Replacement required", String(stats.replacement)],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  // Month-on-month comparison (monthly only)
  if (prevStats) {
    doc.setFontSize(14);
    doc.setTextColor(26, 60, 94);
    doc.text("Month-on-Month Comparison", 40, y);
    y += 8;
    const metrics: [string, number, number][] = [
      ["Total incidents", stats.totalIncidents, prevStats.totalIncidents],
      ["High severity", stats.high, prevStats.high],
      ["Attendance rate", stats.attendanceRate, prevStats.attendanceRate],
      ["Absences", stats.absent, prevStats.absent],
      ["Late arrivals", stats.late, prevStats.late],
      ["Replacement required", stats.replacement, prevStats.replacement],
    ];
    autoTable(doc, {
      startY: y + 4,
      theme: "grid",
      headStyles: { fillColor: [26, 60, 94] },
      styles: { fontSize: 9 },
      head: [["Metric", "This Month", "Last Month", "Trend"]],
      body: metrics.map(([m, cur, prev]) => {
        const t = trend(cur, prev);
        return [m, String(cur), String(prev), `${t.arrow}  ${t.pct}`];
      }),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }

  // ========= INCIDENT BREAKDOWN =========
  if (y > 620) { doc.addPage(); y = 60; }
  doc.setFontSize(14);
  doc.setTextColor(26, 60, 94);
  doc.text("Incident Breakdown", 40, y);
  y += 10;
  const chartW = (pageW - 100) / 2;
  drawBarChart(
    doc, 40, y, chartW, 140,
    stats.byType.slice(0, 6).map((t) => ({ label: t.type, value: t.count })),
    [26, 60, 94],
  );
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("By type", 40 + chartW / 2, y + 155, { align: "center" });
  drawBarChart(
    doc, 60 + chartW, y, chartW, 140,
    stats.bySeverity.map((s) => ({ label: s.severity, value: s.count })),
    [201, 168, 76],
  );
  doc.text("By severity", 60 + chartW + chartW / 2, y + 155, { align: "center" });
  y += 175;

  if (stats.byType[0]) {
    doc.setFontSize(10);
    doc.setTextColor(50);
    const narr = `${stats.byType[0].type} was the most reported incident type with ${stats.byType[0].count} case${stats.byType[0].count === 1 ? "" : "s"} this ${label === "Weekly" ? "week" : "month"}.`;
    doc.text(doc.splitTextToSize(narr, pageW - 80), 40, y);
    y += 24;
  }

  // ========= ATTENDANCE SUMMARY =========
  if (y > 620) { doc.addPage(); y = 60; }
  doc.setFontSize(14);
  doc.setTextColor(26, 60, 94);
  doc.text("Attendance Summary", 40, y);
  y += 20;
  // Big rate number + bar
  doc.setFontSize(36);
  const rateColor: [number, number, number] =
    stats.attendanceRate >= 85 ? [34, 139, 34] :
    stats.attendanceRate >= 70 ? [200, 150, 20] : [200, 40, 40];
  doc.setTextColor(...rateColor);
  doc.text(`${stats.attendanceRate}%`, 40, y + 20);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Attendance rate", 40, y + 34);
  // Bar
  doc.setFillColor(230);
  doc.rect(160, y + 5, pageW - 200, 22, "F");
  doc.setFillColor(...rateColor);
  doc.rect(160, y + 5, ((pageW - 200) * stats.attendanceRate) / 100, 22, "F");
  y += 60;

  autoTable(doc, {
    startY: y,
    theme: "striped",
    headStyles: { fillColor: [26, 60, 94] },
    styles: { fontSize: 9 },
    head: [["Guard Name", "Shifts", "Present", "Absent", "Late", "Replacement Required"]],
    body: stats.guardBreakdown.length === 0
      ? [["—", "0", "0", "0", "0", "0"]]
      : stats.guardBreakdown.map((g) => [
          g.guard, String(g.shifts), String(g.present), String(g.absent), String(g.late), String(g.replacement),
        ]),
  });

  // ========= RECOMMENDATIONS (monthly only) =========
  if (prevStats) {
    doc.addPage();
    y = 60;
    doc.setFontSize(14);
    doc.setTextColor(26, 60, 94);
    doc.text("Recommendations", 40, y);
    y += 20;
    const recs = recommendations(stats, prevStats);
    doc.setFontSize(10);
    doc.setTextColor(50);
    recs.forEach((r) => {
      const lines = doc.splitTextToSize(`•  ${r}`, pageW - 80);
      doc.text(lines, 40, y);
      y += lines.length * 14 + 6;
    });
  }

  // ========= FULL INCIDENT LOG =========
  doc.addPage();
  y = 60;
  doc.setFontSize(14);
  doc.setTextColor(26, 60, 94);
  doc.text("Full Incident Log", 40, y);
  autoTable(doc, {
    startY: y + 10,
    theme: "striped",
    headStyles: { fillColor: [26, 60, 94] },
    styles: { fontSize: 8, cellPadding: 4 },
    head: [["Date/Time", "Type", "Severity", "Description", "Supervisor", "Final Status"]],
    body: input.incidents.length === 0
      ? [["—", "—", "—", "No incidents this period.", "—", "—"]]
      : input.incidents.map((i) => [
          new Date(i.created_at).toLocaleString(),
          i.incident_type === "Other" && i.other_type ? i.other_type : i.incident_type,
          i.severity,
          i.description ?? "—",
          i.reported_by ?? "—",
          i.resolved ? "Resolved" : "Open",
        ]),
  });

  // ========= SIGNATURE PAGE =========
  doc.addPage();
  y = 80;
  doc.setFontSize(18);
  doc.setTextColor(26, 60, 94);
  doc.text("Sign-off", 40, y);
  y += 30;
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text("This report has been reviewed and acknowledged by:", 40, y);
  y += 40;
  const sigLine = (title: string) => {
    doc.setDrawColor(80);
    doc.line(40, y + 14, 340, y + 14);
    doc.line(360, y + 14, 500, y + 14);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`${title}:`, 40, y + 26);
    doc.text("Date:", 360, y + 26);
    y += 60;
  };
  sigLine("Supervisor");
  sigLine("Site Manager");
  sigLine("Client Representative");

  drawFooter(doc, documentId);

  const fname = `arn-${input.range}-${(input.siteName || "site").replace(/\s+/g, "-").toLowerCase()}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
  return { documentId, stats };
}