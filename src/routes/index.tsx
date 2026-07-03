import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, MapPin, UserMinus, UserPlus, Check, X, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INCIDENT_TYPES,
  SEVERITIES,
  type AttendanceLog,
  type IncidentLog,
  type Site,
} from "@/lib/silverline";
import {
  removeUser,
  updateRequest,
  upsertUser,
  useTeamStore,
  type Role,
  type TeamUser,
} from "@/lib/team-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — ARN Security" },
      { name: "description", content: "Live operations metrics and incident trends." },
    ],
  }),
  component: OperationsDashboard,
});

const SEVERITY_COLORS: Record<string, string> = {
  Low: "oklch(0.72 0.16 160)",
  Medium: "oklch(0.78 0.16 85)",
  High: "oklch(0.62 0.22 25)",
};

function OperationsDashboard() {
  const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const navigate = useNavigate();
  const todayISO = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const sitesQ = useQuery({
    queryKey: ["sites", "active-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sites")
        .select("*", { count: "exact", head: true })
        .eq("active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const openIncQ = useQuery({
    queryKey: ["incidents", "open-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("incident_logs")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const replQ = useQuery({
    queryKey: ["attendance", "replacement-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "Replacement Required");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const incQ = useQuery({
    queryKey: ["incidents", "30d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_logs")
        .select("incident_type,severity,created_at")
        .gte("created_at", sinceISO);
      if (error) throw error;
      return data as Pick<IncidentLog, "incident_type" | "severity" | "created_at">[];
    },
  });

  const sitesQAll = useQuery({
    queryKey: ["sites", "overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("site_name");
      if (error) throw error;
      return data as Site[];
    },
  });

  const todayAttQ = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("site_id,status,created_at")
        .gte("created_at", todayISO);
      if (error) throw error;
      return data as Pick<AttendanceLog, "site_id" | "status" | "created_at">[];
    },
  });

  const openIncBySiteQ = useQuery({
    queryKey: ["incidents", "open-by-site"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_logs")
        .select("site_id")
        .eq("resolved", false);
      if (error) throw error;
      return data as { site_id: string }[];
    },
  });

  const byType = INCIDENT_TYPES.map((t) => ({
    type: t,
    count: incQ.data?.filter((i) => i.incident_type === t).length ?? 0,
  }));
  const bySeverity = SEVERITIES.map((s) => ({
    name: s,
    value: incQ.data?.filter((i) => i.severity === s).length ?? 0,
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live security operations overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Active Sites" value={sitesQ.data ?? 0} icon={MapPin} tone="ok" />
        <MetricCard label="Open Incidents" value={openIncQ.data ?? 0} icon={AlertTriangle} tone="danger" />
        <MetricCard
          label="Replacement Required"
          value={replQ.data ?? 0}
          icon={UserMinus}
          tone="warn"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidents by Type (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
                <XAxis
                  dataKey="type"
                  stroke="oklch(0.68 0.02 250)"
                  fontSize={10}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={60}
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
                <Bar dataKey="count" fill="oklch(0.78 0.13 220)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidents by Severity (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {bySeverity.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                No incidents in the last 30 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bySeverity}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {bySeverity.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} stroke="oklch(0.21 0.014 250)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.21 0.014 250)",
                      border: "1px solid oklch(0.3 0.015 250)",
                      borderRadius: 8,
                      color: "oklch(0.96 0.005 250)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sites Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Site Name</th>
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Guards Today</th>
                  <th className="px-3 py-2 text-right">Open Incidents</th>
                </tr>
              </thead>
              <tbody>
                {(sitesQAll.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No sites yet.
                    </td>
                  </tr>
                ) : (
                  (sitesQAll.data ?? []).map((s) => {
                    const guardsToday = (todayAttQ.data ?? []).filter(
                      (a) => a.site_id === s.id && a.status === "Present",
                    ).length;
                    const openInc = (openIncBySiteQ.data ?? []).filter(
                      (i) => i.site_id === s.id,
                    ).length;
                    return (
                      <tr
                        key={s.id}
                        className="cursor-pointer border-t border-border transition hover:bg-muted/40"
                        onClick={() =>
                          navigate({ to: "/sites/$siteId", params: { siteId: s.id } })
                        }
                      >
                        <td className="px-3 py-2 font-medium text-primary">{s.site_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.company_name}</td>
                        <td className="px-3 py-2">
                          <Badge variant={s.active ? "default" : "secondary"}>
                            {s.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{guardsToday}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {openInc > 0 ? (
                            <span className="font-semibold text-destructive">{openInc}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
