import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, ShieldAlert, Video } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { ReportButtons } from "@/components/ReportButtons";
import { MotionStatus } from "@/components/MotionStatus";
import {
  IncidentDetailsDialog,
  type IncidentWithSite,
} from "@/components/IncidentDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ATTENDANCE_STATUSES,
  SHIFT_TYPES,
  severityTone,
  statusTone,
  type AttendanceLog,
  type IncidentLog,
  type Site,
} from "@/lib/silverline";

export const Route = createFileRoute("/client")({
  head: () => ({
    meta: [
      { title: "Client Portal — Silverline Station" },
      { name: "description", content: "Client dashboard for attendance and incidents." },
    ],
  }),
  component: ClientPortal,
});

function startOfDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function ClientPortal() {
  const [openIncident, setOpenIncident] = useState<IncidentWithSite | null>(null);
  const sitesQ = useQuery({
    queryKey: ["sites", "lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("id,site_name,company_name");
      if (error) throw error;
      return data as Pick<Site, "id" | "site_name" | "company_name">[];
    },
  });

  const attendanceQ = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .gte("created_at", startOfDayISO())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AttendanceLog[];
    },
  });

  const incidentsQ = useQuery({
    queryKey: ["incidents", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as IncidentLog[];
    },
  });

  const sitesById = useMemo(() => {
    const map = new Map<string, { site_name: string; company_name: string }>();
    sitesQ.data?.forEach((s) => map.set(s.id, s));
    return map;
  }, [sitesQ.data]);

  const todayCount = attendanceQ.data?.length ?? 0;
  const openIncidents = incidentsQ.data?.filter((i) => !i.resolved).length ?? 0;
  const resolvedThisMonth =
    incidentsQ.data?.filter((i) => i.resolved && i.created_at >= startOfMonthISO()).length ?? 0;

  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const companies = Array.from(
    new Set((sitesQ.data ?? []).map((s) => s.company_name)),
  ).sort();

  const filteredAttendance = (attendanceQ.data ?? []).filter((a) => {
    const site = sitesById.get(a.site_id);
    return (
      (shiftFilter === "all" || a.shift_type === shiftFilter) &&
      (statusFilter === "all" || a.status === statusFilter) &&
      (companyFilter === "all" || site?.company_name === companyFilter)
    );
  });

  const filteredIncidents = (incidentsQ.data ?? []).filter((i) => {
    const site = sitesById.get(i.site_id);
    return companyFilter === "all" || site?.company_name === companyFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">NGAO Client Portal</h1>
          <p className="text-sm text-muted-foreground">Attendance, incidents, and reports.</p>
        </div>
        <ReportButtons scope="client" title="Client portfolio report" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Today's Guards Logged" value={todayCount} icon={ClipboardList} />
        <MetricCard label="Open Incidents" value={openIncidents} icon={ShieldAlert} tone="danger" />
        <MetricCard
          label="Resolved This Month"
          value={resolvedThisMonth}
          icon={CheckCircle2}
          tone="ok"
        />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="attendance">
            <TabsList className="mb-4 flex w-full flex-wrap">
              <TabsTrigger value="attendance">Today's Attendance</TabsTrigger>
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="cameras">My Property Cameras</TabsTrigger>
            </TabsList>

            <FilterPills
              shiftFilter={shiftFilter}
              setShiftFilter={setShiftFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              companyFilter={companyFilter}
              setCompanyFilter={setCompanyFilter}
              companies={companies}
            />

            <TabsContent value="attendance" className="mt-4">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Site</th>
                      <th className="px-3 py-2 text-left">Guard</th>
                      <th className="px-3 py-2 text-left">Shift</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                          No attendance logs for today.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((a) => (
                        <tr key={a.id} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(a.created_at).toLocaleTimeString()}
                          </td>
                          <td className="px-3 py-2">
                            {sitesById.get(a.site_id)?.site_name ?? "—"}
                          </td>
                          <td className="px-3 py-2">{a.guard_name}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">{a.shift_type}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusTone(a.status)}`}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="incidents" className="mt-4">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-left">Site</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Severity</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                          No incidents.
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.map((i) => (
                        <tr
                          key={i.id}
                          className="cursor-pointer border-t border-border transition hover:bg-muted/40"
                          onClick={() => {
                            const site = sitesById.get(i.site_id);
                            setOpenIncident({
                              ...i,
                              sites: site
                                ? { site_name: site.site_name, company_name: site.company_name }
                                : null,
                            });
                          }}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(i.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            {sitesById.get(i.site_id)?.site_name ?? "—"}
                          </td>
                          <td className="px-3 py-2">
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
                          <td className="px-3 py-2">
                            <Badge variant={i.resolved ? "secondary" : "destructive"}>
                              {i.resolved ? "Resolved" : "Open"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium">Automated Reporting</p>
                <p className="text-xs text-muted-foreground">
                  Every report includes Verified Proof of Service and timestamped liability
                  documentation — a defensible audit trail for every guard shift.
                </p>
                <div className="mt-3">
                  <ReportButtons scope="client" title="Client portfolio report" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ReportTile label="Total attendance entries (today)" value={filteredAttendance.length} />
                <ReportTile
                  label="Open incidents"
                  value={filteredIncidents.filter((i) => !i.resolved).length}
                />
                <ReportTile
                  label="High-severity incidents"
                  value={filteredIncidents.filter((i) => i.severity === "High").length}
                />
              </div>
            </TabsContent>

            <TabsContent value="cameras" className="mt-4">
              <ClientCameras />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <IncidentDetailsDialog
        incident={openIncident}
        open={!!openIncident}
        onOpenChange={(o) => !o && setOpenIncident(null)}
        showProtocol={false}
      />
    </div>
  );
}

function ReportTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function FilterPills(props: {
  shiftFilter: string;
  setShiftFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  companyFilter: string;
  setCompanyFilter: (v: string) => void;
  companies: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={props.shiftFilter} onValueChange={props.setShiftFilter}>
        <SelectTrigger className="w-auto min-w-36">
          <SelectValue placeholder="Shift" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All shifts</SelectItem>
          {SHIFT_TYPES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={props.statusFilter} onValueChange={props.setStatusFilter}>
        <SelectTrigger className="w-auto min-w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ATTENDANCE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={props.companyFilter} onValueChange={props.setCompanyFilter}>
        <SelectTrigger className="w-auto min-w-44">
          <SelectValue placeholder="Company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All companies</SelectItem>
          {props.companies.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ClientCameras() {
  const cameras = [
    { name: "Front Door", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=60" },
    { name: "Driveway", img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=60" },
    { name: "Backyard", img: "https://images.unsplash.com/photo-1505692794403-34d4982d1a4e?w=800&q=60" },
    { name: "Side Gate", img: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=60" },
  ];
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
                Live Feed
              </div>
              <MotionStatus seed={c.name.length} />
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
        Connect your existing CCTV system to enable live feeds. Contact NGAO
        Security for setup assistance.
      </p>
    </div>
  );
}