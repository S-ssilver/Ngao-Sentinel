import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ClipboardList, MapPin, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { ReportButtons } from "@/components/ReportButtons";
import {
  IncidentDetailsDialog,
  type IncidentWithSite,
} from "@/components/IncidentDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  severityTone,
  statusTone,
  type AttendanceLog,
  type IncidentLog,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {site?.site_name ?? "Site"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {site?.company_name ?? ""}
            {site?.location_code ? ` · ${site.location_code}` : ""}
          </p>
        </div>
        <Link to="/sites" className="text-sm text-muted-foreground hover:text-primary">
          All sites →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Attendance entries" value={attendance.length} icon={ClipboardList} />
        <MetricCard label="Total incidents" value={incidents.length} icon={ShieldAlert} tone="danger" />
        <MetricCard
          label="Status"
          value={site?.active ? "Active" : "Inactive"}
          icon={site?.active ? Building2 : MapPin}
          tone={site?.active ? "ok" : "default"}
        />
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
            companyName={site?.company_name}
            title={`Site report — ${site?.site_name ?? ""}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="attendance">
            <TabsList className="mb-4">
              <TabsTrigger value="attendance">Attendance Logs</TabsTrigger>
              <TabsTrigger value="incidents">Incident Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Timestamp</th>
                      <th className="px-3 py-2 text-left">Guard</th>
                      <th className="px-3 py-2 text-left">Shift</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Reported by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                          No attendance logs.
                        </td>
                      </tr>
                    ) : (
                      attendance.map((a) => (
                        <tr key={a.id} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
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

            <TabsContent value="incidents">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Severity</th>
                      <th className="px-3 py-2 text-left">Reported by</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <IncidentDetailsDialog
        incident={openIncident}
        open={!!openIncident}
        onOpenChange={(o) => !o && setOpenIncident(null)}
      />
    </div>
  );
}