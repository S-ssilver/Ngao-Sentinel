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
import { AlertTriangle, MapPin, UserMinus, UserPlus, Trash2 } from "lucide-react";

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
  upsertUser,
  useTeamStore,
  type Role,
  type TeamUser,
} from "@/lib/team-store";
import { OpReportsSection } from "@/components/OpReportsSection";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — NGAO" },
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

      <OpReportsSection sites={sitesQAll.data ?? []} />

      <TeamManagement sites={sitesQAll.data ?? []} />

      <SentinelCamTeaser />
    </div>
  );
}

const ROLE_OPTIONS: Role[] = ["Operations Manager", "Supervisor", "Client", "Guard (Field)"];

function SentinelCamTeaser() {
  return (
    <Card className="border-accent/60 bg-primary/40">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Coming Soon
          </div>
          <div className="text-base font-semibold text-primary-foreground">
            SentinelCam Integration
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            AI-powered assault detection body cameras, designed for offline
            deployment. SentinelCam will integrate directly with this dashboard —
            automatically logging incidents, attaching video evidence, and
            sending real-time alerts when a threat is detected.
          </p>
        </div>
        <a
          href="/#sentinelcam"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-accent/60 px-3 text-xs font-medium text-accent transition hover:bg-accent hover:text-accent-foreground"
        >
          Learn More
        </a>
      </CardContent>
    </Card>
  );
}

function TeamManagement({ sites }: { sites: Site[] }) {
  const { users } = useTeamStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [invited, setInvited] = useState<TeamUser | null>(null);

  function siteNames(ids: string[]) {
    if (!ids.length) return "All sites";
    return ids
      .map((id) => sites.find((s) => s.id === id)?.site_name ?? "—")
      .join(", ");
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Team Management</CardTitle>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" /> Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Assigned Site(s)</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Last Login</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No users yet.</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2 text-muted-foreground">{siteNames(u.siteIds)}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          u.status === "Active" ? "default"
                          : u.status === "Suspended" ? "destructive"
                          : "secondary"
                        }
                      >
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>Edit</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            upsertUser({
                              ...u,
                              status: u.status === "Suspended" ? "Active" : "Suspended",
                            })
                          }
                        >
                          {u.status === "Suspended" ? "Reactivate" : "Suspend"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeUser(u.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <UserFormDialog
        open={addOpen || !!editing}
        user={editing}
        sites={sites}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        onSaved={(u, isNew) => { if (isNew) setInvited(u); }}
      />

      <Dialog open={!!invited} onOpenChange={(o) => !o && setInvited(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitation sent</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Simulated email</div>
            <div className="font-medium">To: {invited?.email}</div>
            <div className="mt-2">Subject: You've been invited to NGAO</div>
            <p className="mt-3 text-muted-foreground">
              Hi {invited?.name}, your Operations Manager has invited you to join
              the NGAO Sentinel Platform as <b>{invited?.role}</b>. Click
              the link below to set your password and sign in.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Powered by Silverline Tech
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserFormDialog({
  open, user, sites, onClose, onSaved,
}: {
  open: boolean;
  user: TeamUser | null;
  sites: Site[];
  onClose: () => void;
  onSaved: (u: TeamUser, isNew: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Supervisor");
  const [siteIds, setSiteIds] = useState<string[]>([]);

  // reset on open
  useMemo(() => {
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setRole(user?.role ?? "Supervisor");
      setSiteIds(user?.siteIds ?? []);
    }
  }, [open, user]);

  function toggleSite(id: string) {
    setSiteIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  function save() {
    const isNew = !user;
    const record: TeamUser = {
      id: user?.id ?? crypto.randomUUID(),
      name, email, role, siteIds,
      status: user?.status ?? "Pending",
      lastLogin: user?.lastLogin ?? null,
    };
    upsertUser(record);
    onSaved(record, isNew);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned Site(s)</Label>
            <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border p-2 text-sm">
              {sites.length === 0 ? (
                <div className="text-muted-foreground">No sites available.</div>
              ) : sites.map((s) => (
                <label key={s.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={siteIds.includes(s.id)}
                    onChange={() => toggleSite(s.id)}
                  />
                  {s.site_name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={save}>
              {user ? "Save" : "Send invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
