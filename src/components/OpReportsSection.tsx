import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, Brain, CalendarRange, ChevronRight, FileDown,
  Sparkles, Target, TrendingDown, TrendingUp, Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Site } from "@/lib/silverline";
import { fetchReportData } from "@/components/ReportButtons";
import { computeStats, generateReportPDF } from "@/lib/report-pdf";

type Period = "week" | "month";

function rangeFor(period: Period): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const to = new Date();
  const from = new Date(to);
  if (period === "week") from.setDate(to.getDate() - 7);
  else from.setMonth(to.getMonth() - 1);
  const prevTo = new Date(from);
  const prevFrom = new Date(from);
  if (period === "week") prevFrom.setDate(prevFrom.getDate() - 7);
  else prevFrom.setMonth(prevFrom.getMonth() - 1);
  return { from, to, prevFrom, prevTo };
}

export function OpReportsSection({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState<string>("");
  const [period, setPeriod] = useState<Period>("week");
  const [generated, setGenerated] = useState<{ siteId: string; period: Period } | null>(null);

  const { from, to, prevFrom, prevTo } = rangeFor(period);
  const site = sites.find((s) => s.id === siteId);

  const dataQ = useQuery({
    queryKey: ["op-report", generated?.siteId, generated?.period],
    enabled: !!generated,
    queryFn: async () => {
      const [cur, prev] = await Promise.all([
        fetchReportData(from, to, siteId),
        fetchReportData(prevFrom, prevTo, siteId),
      ]);
      return { cur, prev };
    },
  });

  const stats = dataQ.data ? computeStats(dataQ.data.cur.attendance, dataQ.data.cur.incidents) : null;
  const prevStats = dataQ.data ? computeStats(dataQ.data.prev.attendance, dataQ.data.prev.incidents) : null;

  const intel = useMemo(() => {
    if (!stats || !prevStats || !dataQ.data) return null;
    return buildIntelligence(stats, prevStats, dataQ.data.cur.incidents);
  }, [stats, prevStats, dataQ.data]);

  function handleGenerate() {
    if (!siteId) { toast.error("Select a site first"); return; }
    setGenerated({ siteId, period });
  }

  function handleDownload() {
    if (!stats || !dataQ.data || !site) return;
    generateReportPDF({
      siteName: site.site_name,
      companyName: site.company_name,
      range: period,
      from, to,
      attendance: dataQ.data.cur.attendance,
      incidents: dataQ.data.cur.incidents,
      prevAttendance: period === "month" ? dataQ.data.prev.attendance : undefined,
      prevIncidents: period === "month" ? dataQ.data.prev.incidents : undefined,
    });
    toast.success("Report downloaded");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-52">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Site</label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.site_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Period</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Range</label>
            <div className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              {from.toLocaleDateString()} — {to.toLocaleDateString()}
            </div>
          </div>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleGenerate}>
            Generate Report
          </Button>
        </div>

        {generated && stats && prevStats && intel && site ? (
          <div className="space-y-4">
            {/* Intelligence Summary */}
            <div className="rounded-lg border-2 border-accent/50 bg-accent/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                <h3 className="text-base font-bold text-accent">
                  Intelligence Summary — {site.site_name}
                </h3>
              </div>
              <p className="mb-4 text-xs italic text-muted-foreground">
                Operations Manager view only — not included in client-facing PDF
              </p>

              <IntelBlock icon={AlertTriangle} title="Attendance Flags">
                {intel.attendanceFlags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance flags for this period.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {intel.attendanceFlags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
                <div className="mt-2">
                  <Badge className={
                    stats.attendanceRate >= 85 ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/40" :
                    stats.attendanceRate >= 70 ? "bg-amber-500/20 text-amber-600 border border-amber-500/40" :
                    "bg-destructive/20 text-destructive border border-destructive/40"
                  }>
                    Attendance rate: {stats.attendanceRate}%
                  </Badge>
                </div>
              </IntelBlock>

              <IntelBlock icon={Target} title="Incident Patterns">
                {intel.patterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notable patterns detected.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {intel.patterns.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </IntelBlock>

              <IntelBlock icon={Sparkles} title="Suggested Actions">
                <ul className="space-y-1 text-sm">
                  {intel.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-1.5">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </IntelBlock>

              <IntelBlock icon={Zap} title="Quick Actions">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Marked all intelligence items as reviewed")}>
                    Mark all reviewed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Intelligence report export queued")}>
                    Export Intelligence Report
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Supervisor briefing scheduled")}>
                    Schedule Supervisor Briefing
                  </Button>
                </div>
              </IntelBlock>
            </div>

            {/* Client-safe preview */}
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Client-facing preview</div>
                  <h3 className="text-base font-bold">
                    {period === "week" ? "Weekly" : "Monthly"} Service Report — {site.site_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {from.toLocaleDateString()} — {to.toLocaleDateString()}
                  </p>
                </div>
                <Button onClick={handleDownload}>
                  <FileDown className="mr-1.5 h-4 w-4" /> Download PDF
                </Button>
              </div>

              <PreviewStats stats={stats} prevStats={period === "month" ? prevStats : null} period={period} />
            </div>
          </div>
        ) : generated && dataQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading report data…</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function IntelBlock({
  icon: Icon, title, children,
}: { icon: typeof AlertTriangle; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-md border border-border bg-background/50 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4 text-accent" /> {title}
      </div>
      {children}
    </div>
  );
}

function PreviewStats({
  stats, prevStats, period,
}: {
  stats: ReturnType<typeof computeStats>;
  prevStats: ReturnType<typeof computeStats> | null;
  period: Period;
}) {
  const rows: [string, string, string?][] = [
    ["Total incidents", String(stats.totalIncidents)],
    ["High severity", String(stats.high)],
    ["Most common type", stats.mostCommonType],
    ["Guard shifts logged", String(stats.totalShifts)],
    ["Attendance rate", `${stats.attendanceRate}%`],
    ["Absences", String(stats.absent)],
    ["Late arrivals", String(stats.late)],
    ["Replacement required", String(stats.replacement)],
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Summary statistics
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([m, v]) => (
                <tr key={m} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 text-muted-foreground">{m}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        {prevStats && period === "month" ? (
          <>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Month-on-month
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Metric</th>
                    <th className="px-3 py-1.5 text-right">Now</th>
                    <th className="px-3 py-1.5 text-right">Prev</th>
                    <th className="px-3 py-1.5 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Total incidents", stats.totalIncidents, prevStats.totalIncidents],
                    ["High severity", stats.high, prevStats.high],
                    ["Attendance %", stats.attendanceRate, prevStats.attendanceRate],
                    ["Absences", stats.absent, prevStats.absent],
                    ["Replacement", stats.replacement, prevStats.replacement],
                  ].map(([m, c, p]) => {
                    const cur = Number(c); const prev = Number(p);
                    const delta = prev === 0 ? (cur === 0 ? 0 : 100) : Math.round(((cur - prev) / prev) * 100);
                    const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : ChevronRight;
                    const cls = delta > 0 ? "text-destructive" : delta < 0 ? "text-emerald-600" : "text-muted-foreground";
                    return (
                      <tr key={String(m)} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5 text-muted-foreground">{m}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{cur}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{prev}</td>
                        <td className={`px-3 py-1.5 text-right ${cls}`}>
                          <span className="inline-flex items-center gap-0.5">
                            <Trend className="h-3 w-3" />
                            {delta > 0 ? "+" : ""}{delta}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Guard breakdown
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Guard</th>
                    <th className="px-3 py-1.5 text-right">Shifts</th>
                    <th className="px-3 py-1.5 text-right">Abs</th>
                    <th className="px-3 py-1.5 text-right">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.guardBreakdown.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-3 text-center text-muted-foreground">No data</td></tr>
                  ) : stats.guardBreakdown.slice(0, 6).map((g) => (
                    <tr key={g.guard} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5">{g.guard}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{g.shifts}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{g.absent}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{g.late}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function buildIntelligence(
  stats: ReturnType<typeof computeStats>,
  prev: ReturnType<typeof computeStats>,
  incidents: { created_at: string; incident_type: string; resolved: boolean; description: string | null }[],
): { attendanceFlags: string[]; patterns: string[]; suggestions: string[] } {
  const attendanceFlags: string[] = [];

  // Guards with 2+ absences
  stats.guardBreakdown
    .filter((g) => g.absent >= 2)
    .forEach((g) => attendanceFlags.push(`⚠ ${g.guard} — ${g.absent} absences this period. Recommend deployment review.`));

  if (stats.replacement >= 2) {
    attendanceFlags.push(`⚠ Replacement required ${stats.replacement} times this period. Consider roster adjustment.`);
  }

  const patterns: string[] = [];
  const top = stats.byType[0];
  if (top && stats.totalIncidents > 0) {
    const pct = Math.round((top.count / stats.totalIncidents) * 100);
    patterns.push(`Most reported: ${top.type} — ${top.count} incidents (${pct}% of total)`);
  }

  // Peak hour detection
  if (incidents.length >= 3) {
    const buckets: Record<number, number> = {};
    incidents.forEach((i) => {
      const h = new Date(i.created_at).getHours();
      const b = Math.floor(h / 3) * 3;
      buckets[b] = (buckets[b] ?? 0) + 1;
    });
    const peak = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    if (peak && peak[1] >= 2) {
      const h = Number(peak[0]);
      const fmt = (hr: number) => `${((hr + 11) % 12) + 1}${hr < 12 ? "am" : "pm"}`;
      patterns.push(`Peak period: Most incidents occurred between ${fmt(h)} and ${fmt(h + 3)}`);
    }
  }

  const highDelta = prev.high === 0 ? (stats.high > 0 ? 100 : 0) : Math.round(((stats.high - prev.high) / prev.high) * 100);
  patterns.push(
    `Severity trend: High severity incidents are ${highDelta > 0 ? "UP" : highDelta < 0 ? "DOWN" : "STABLE"} ` +
    `${highDelta === 0 ? "" : Math.abs(highDelta) + "% "}vs previous period`,
  );

  if (top && top.count >= 3) {
    patterns.push(`🔴 ${top.type} has been reported ${top.count} times — possible structural security gap at this site`);
  }

  // Suggestions
  const suggestions: string[] = [];
  const worstGuard = stats.guardBreakdown.find((g) => g.absent >= 2);
  if (worstGuard) {
    suggestions.push(`→ Schedule performance review for ${worstGuard.guard} — ${worstGuard.absent} absences recorded this period`);
  }
  if (top && top.count >= 2) {
    suggestions.push(`→ Review ${top.type.toLowerCase()} response — ${top.count} cases logged this period`);
  }
  const noDesc = incidents.filter((i) => !i.description || i.description.trim().length < 10).length;
  if (noDesc > 0) {
    suggestions.push(`→ ${noDesc} incident${noDesc === 1 ? "" : "s"} logged with limited detail — brief supervisors on evidence capture protocol`);
  }
  const openCount = incidents.filter((i) => !i.resolved).length;
  if (openCount > 0) {
    suggestions.push(`→ ${openCount} incident${openCount === 1 ? "" : "s"} still marked Open — assign for closure and update client`);
  }
  if (stats.attendanceRate < 85) {
    suggestions.push(`→ Attendance rate ${stats.attendanceRate}% is below target — audit guard reliability and standby coverage`);
  }
  if (suggestions.length === 0) {
    suggestions.push("→ No corrective action required — maintain current deployment and post orders");
  }

  return { attendanceFlags, patterns, suggestions: suggestions.slice(0, 5) };
}