import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldAlert, Video, Maximize2, Users, AlertTriangle, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { ReportButtons } from "@/components/ReportButtons";
import { MetricCard } from "@/components/MetricCard";
import {
  IncidentDetailsDialog,
  type IncidentWithSite,
} from "@/components/IncidentDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INCIDENT_PROTOCOLS } from "@/lib/incident-protocols";
import {
  severityTone,
  statusTone,
  type AttendanceLog,
  type IncidentLog,
  type IncidentType,
  type Site,
} from "@/lib/silverline";

export const Route = createFileRoute("/sites/$siteId")({
  head: () => ({
    meta: [
      { title: "Site Details — Silverline Station" },
      { name: "description", content: "Attendance and incident logs for a protected site." },
    ],
  }),
  component: SiteDetailsPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Site not found.</div>,
});

function SiteDetailsPage() {
  const { siteId } = Route.useParams();
  const router = useRouter();
  const [openIncident, setOpenIncident] = useState<IncidentWithSite | null>(null);
  const [openProtocol, setOpenProtocol] = useState<IncidentType | null>(null);

  const siteQ = useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("id", siteId).maybeSingle();
      if (error) throw error;
      return data as Site | null;
    },
  });

  const attendanceQ = useQuery({
    queryKey: ["attendance", "site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AttendanceLog[];
    },
  });

  const incidentsQ = useQuery({
    queryKey: ["incidents", "site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_logs")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as IncidentLog[];
    },
  });

  const site = siteQ.data;
  const attendance = attendanceQ.data ?? [];
  const incidents = incidentsQ.data ?? [];

  // Stat cards
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const guardsToday = attendance.filter(
    (a) => a.status === "Present" && new Date(a.created_at) >= startOfToday,
  ).length;
  const openIncidentsCount = incidents.filter((i) => !i.resolved).length;
  const attendanceRate = attendance.length === 0
    ? 0
    : Math.round((attendance.filter((a) => a.status === "Present").length / attendance.length) * 100);

  // Weekly attendance summary
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekAtt = attendance.filter((a) => new Date(a.created_at) >= weekAgo);
  const wkPresent = weekAtt.filter((a) => a.status === "Present").length;
  const wkAbsent = weekAtt.filter((a) => a.status === "Absent").length;
  const wkLate = weekAtt.filter((a) => a.status === "Late").length;
  const wkRepl = weekAtt.filter((a) => a.status === "Replacement Required").length;

  // Aggregate incident types for the site chart
  const typeCounts = incidents.reduce<Record<string, number>>((acc, i) => {
    const key = i.incident_type === "Other" && i.other_type ? i.other_type : i.incident_type;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const typeChartData = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const topType = typeChartData[0];
  // Map top label back to a real IncidentType for the SOP link
  const topIncidentType: IncidentType | null = topType
    ? incidents.find(
        (i) =>
          (i.incident_type === "Other" && i.other_type === topType.type) ||
          i.incident_type === topType.type,
      )?.incident_type ?? null
    : null;
  const topProtocol = topIncidentType ? INCIDENT_PROTOCOLS[topIncidentType] : null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-2 -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Sites Management
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{site?.site_name ?? "Site"}</h1>
            <p className="text-sm text-muted-foreground">{site?.company_name ?? ""}</p>
            {site?.address ? (
              <p className="text-sm text-muted-foreground">{site.address}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {site?.location_code ? (
                <Badge variant="outline" className="font-mono text-xs">
                  Site Code: {site.location_code}
                </Badge>
              ) : null}
              <Badge variant={site?.active ? "default" : "secondary"}>
                {site?.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Operations
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Guards Today" value={guardsToday} icon={Users} tone="ok" />
        <MetricCard label="Open Incidents" value={openIncidentsCount} icon={AlertTriangle} tone="danger" />
        <MetricCard label="Attendance Rate" value={`${attendanceRate}%`} icon={TrendingUp} tone={attendanceRate >= 85 ? "ok" : attendanceRate >= 70 ? "warn" : "danger"} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
          <div>
            <p className="text-sm font-medium">Automated reports</p>
            <p className="text-xs text-muted-foreground">
              Timestamped liability documentation for this site.
            </p>
          </div>
          <ReportButtons
            scope="site"
            siteId={siteId}
            siteName={site?.site_name}
            companyName={site?.company_name}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="incidents">
            <TabsList className="mb-4">
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="cctv">CCTV</TabsTrigger>
            </TabsList>

            <TabsContent value="incidents" className="space-y-4">
              {typeChartData.length > 0 ? (
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Most frequent incident types</h3>
                    {topType ? (
                      <span className="rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                        Common Risk: {topType.type}
                      </span>
                    ) : null}
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeChartData} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
                        <XAxis
                          dataKey="type"
                          stroke="oklch(0.68 0.02 250)"
                          fontSize={10}
                          angle={-20}
                          textAnchor="end"
                          interval={0}
                          height={50}
                        />
                        <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "oklch(0.21 0.014 250)",
                            border: "1px solid oklch(0.3 0.015 250)",
                            borderRadius: 8,
                            color: "oklch(0.96 0.005 250)",
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {typeChartData.map((entry, idx) => (
                            <Cell
                              key={entry.type}
                              fill={idx === 0 ? "oklch(0.62 0.22 25)" : "oklch(0.78 0.13 220)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {topProtocol && topIncidentType ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Most common: <span className="font-medium text-foreground">{topType.type}</span>
                      {" — "}
                      <button
                        type="button"
                        onClick={() => setOpenProtocol(topIncidentType)}
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        View {topProtocol.title}
                      </button>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Date/Time</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Severity</th>
                      <th className="px-3 py-2 text-left">Supervisor</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                          No incidents.
                        </td>
                      </tr>
                    ) : (
                      incidents.map((i) => (
                        <tr
                          key={i.id}
                          className="cursor-pointer border-t border-border transition hover:bg-muted/40"
                          onClick={() =>
                            setOpenIncident({ ...i, site_name: site?.site_name })
                          }
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(i.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {i.incident_type === "Other" && i.other_type
                              ? i.other_type
                              : i.incident_type}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${severityTone(i.severity)}`}
                            >
                              {i.severity}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {i.reported_by ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={i.resolved ? "secondary" : "destructive"}>
                              {i.resolved ? "Resolved" : "Open"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[280px] truncate">
                            {i.description ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="attendance">
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryPill label="Present" value={wkPresent} tone="ok" />
                <SummaryPill label="Absent" value={wkAbsent} tone="danger" />
                <SummaryPill label="Late" value={wkLate} tone="warn" />
                <SummaryPill label="Replacement" value={wkRepl} tone="info" />
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Guard Name</th>
                      <th className="px-3 py-2 text-left">Guard ID</th>
                      <th className="px-3 py-2 text-left">Shift</th>
                      <th className="px-3 py-2 text-left">Check-in</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Logged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                          No attendance logs.
                        </td>
                      </tr>
                    ) : (
                      attendance.map((a) => (
                        <tr key={a.id} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">{a.guard_name}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                            G-{a.id.slice(0, 6).toUpperCase()}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">{a.shift_type}</Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground tabular-nums">
                            {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusTone(a.status)}`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {a.reported_by ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="cctv">
              <CctvGrid siteName={site?.site_name ?? "Site"} label="Live Feed" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <IncidentDetailsDialog
        incident={openIncident}
        open={!!openIncident}
        onOpenChange={(o) => !o && setOpenIncident(null)}
        allowStatusUpdate
      />

      <Dialog open={!!openProtocol} onOpenChange={(o) => !o && setOpenProtocol(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {openProtocol ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  {INCIDENT_PROTOCOLS[openProtocol].title}
                </DialogTitle>
                <DialogDescription>
                  Standard worldwide SOP for {openProtocol} incidents.
                </DialogDescription>
              </DialogHeader>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Immediate actions</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {INCIDENT_PROTOCOLS[openProtocol].immediate.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </section>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Follow-up</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {INCIDENT_PROTOCOLS[openProtocol].followUp.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <span className="font-semibold text-destructive">Escalation: </span>
                {INCIDENT_PROTOCOLS[openProtocol].escalate}
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CctvGrid({ siteName, label }: { siteName: string; label: string }) {
  const cameras = [
    { name: "Front Gate", img: "https://images.unsplash.com/photo-1557183050-52a5470b3c98?w=800&q=60" },
    { name: "Parking Area", img: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=60" },
    { name: "Main Entrance", img: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&q=60" },
    { name: "Rear Perimeter", img: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=60" },
  ];
  const [full, setFull] = useState<{ name: string; img: string } | null>(null);
  const updated = new Date().toLocaleTimeString();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cameras.map((c) => (
          <div key={c.name} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="relative aspect-video bg-black">
              <img src={c.img} alt={c.name} className="h-full w-full object-cover opacity-90" />
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                </span>
                {label}
              </div>
              <button
                onClick={() => setFull(c)}
                className="absolute right-2 top-2 rounded-md bg-black/70 p-1.5 text-white hover:bg-black"
                aria-label="Full Screen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between p-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <Video className="h-3.5 w-3.5 text-accent" /> {c.name}
              </div>
              <span className="text-muted-foreground">Updated {updated}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Connect your existing CCTV system to enable live feeds — {siteName}. Contact
        ARN Security for setup assistance.
      </p>
      <Dialog open={!!full} onOpenChange={(o) => !o && setFull(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{full?.name}</DialogTitle>
          </DialogHeader>
          {full ? (
            <div className="relative aspect-video overflow-hidden rounded-md bg-black">
              <img src={full.img} alt={full.name} className="h-full w-full object-cover" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                </span>
                {label}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}