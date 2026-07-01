import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, ShieldAlert, UserCog, FileWarning } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ATTENDANCE_STATUSES,
  INCIDENT_TYPES,
  SEVERITIES,
  SHIFT_TYPES,
  type AttendanceStatus,
  type IncidentLog,
  type IncidentType,
  type Severity,
  type ShiftType,
  type Site,
  severityTone,
} from "@/lib/silverline";
import { INCIDENT_PROTOCOLS } from "@/lib/incident-protocols";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supervisor")({
  head: () => ({
    meta: [
      { title: "Supervisor Console — Silverline Station" },
      { name: "description", content: "Log attendance and incidents." },
    ],
  }),
  component: SupervisorConsole,
});

const SUPERVISOR_STORAGE_KEY = "silverline.supervisor";

function SupervisorConsole() {
  const [supervisor, setSupervisor] = useState("");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(SUPERVISOR_STORAGE_KEY) : null;
    if (stored) setSupervisor(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (supervisor.trim()) window.localStorage.setItem(SUPERVISOR_STORAGE_KEY, supervisor.trim());
  }, [supervisor]);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id,site_name,company_name,active")
        .eq("active", true)
        .order("site_name");
      if (error) throw error;
      return data as Pick<Site, "id" | "site_name" | "company_name" | "active">[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Supervisor Console</h1>
          <p className="text-sm text-muted-foreground">Log attendance and incidents from the field.</p>
        </div>
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-muted-foreground" />
          <div className="space-y-1">
            <Label htmlFor="supervisor" className="text-xs text-muted-foreground">
              Supervisor on duty
            </Label>
            <Input
              id="supervisor"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              placeholder="e.g. Sgt. Morales"
              className="w-56"
            />
          </div>
        </div>
      </div>

      <MyIncidentsPanel supervisor={supervisor.trim()} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AttendanceForm sites={sites} supervisor={supervisor.trim()} />
        <IncidentForm sites={sites} supervisor={supervisor.trim()} />
      </div>
    </div>
  );
}

type SiteOpt = Pick<Site, "id" | "site_name" | "company_name">;

function AttendanceForm({ sites, supervisor }: { sites: SiteOpt[]; supervisor: string }) {
  const qc = useQueryClient();
  const [siteId, setSiteId] = useState("");
  const [guard, setGuard] = useState("");
  const [shift, setShift] = useState<ShiftType | "">("");
  const [status, setStatus] = useState<AttendanceStatus | "">("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance_logs").insert({
        site_id: siteId,
        guard_name: guard.trim(),
        shift_type: shift as ShiftType,
        status: status as AttendanceStatus,
        notes: notes.trim() || null,
        reported_by: supervisor || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance logged");
      setGuard("");
      setNotes("");
      setStatus("");
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <CardTitle>Log Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!supervisor) {
              toast.error("Enter your supervisor name at the top of the page first");
              return;
            }
            if (!siteId || !guard.trim() || !shift || !status) {
              toast.error("Please complete all required fields");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.site_name} — {s.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Guard Name / ID</Label>
            <Input value={guard} onChange={(e) => setGuard(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Shift Type</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as ShiftType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Day / Night" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Logging..." : "Log Attendance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function IncidentForm({ sites, supervisor }: { sites: SiteOpt[]; supervisor: string }) {
  const qc = useQueryClient();
  const [siteId, setSiteId] = useState("");
  const [type, setType] = useState<IncidentType | "">("");
  const [otherType, setOtherType] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("incident_logs").insert({
        site_id: siteId,
        incident_type: type as IncidentType,
        other_type: type === "Other" ? otherType.trim() || null : null,
        severity: severity as Severity,
        description: description.trim() || null,
        reported_by: supervisor || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Incident logged");
      setType("");
      setOtherType("");
      setSeverity("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["my-incidents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <CardTitle>Log Incident</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!supervisor) {
              toast.error("Enter your supervisor name at the top of the page first");
              return;
            }
            if (!siteId || !type || !severity) {
              toast.error("Please complete all required fields");
              return;
            }
            if (type === "Other" && !otherType.trim()) {
              toast.error("Please specify the incident type");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.site_name} — {s.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Incident Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as IncidentType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "Other" ? (
            <div className="space-y-1.5">
              <Label>Other Incident Type</Label>
              <Input
                value={otherType}
                onChange={(e) => setOtherType(e.target.value)}
                placeholder="Specify..."
                required
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger>
                <SelectValue placeholder="Low / Medium / High" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Logging..." : "Log Incident"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
function MyIncidentsPanel({ supervisor }: { supervisor: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: incidents = [] } = useQuery({
    queryKey: ["my-incidents", supervisor],
    enabled: !!supervisor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_logs")
        .select("*, sites(site_name, company_name)")
        .eq("reported_by", supervisor)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (IncidentLog & { sites: { site_name: string; company_name: string } | null })[];
    },
  });

  const selected = incidents.find((i) => i.id === openId) ?? null;
  const protocol = selected ? INCIDENT_PROTOCOLS[selected.incident_type] : null;

  if (!supervisor) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
          <FileWarning className="h-4 w-4" />
          Enter your supervisor name above to see your reported incidents.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <CardTitle>My Reported Incidents</CardTitle>
        </div>
        <Badge variant="secondary" className="text-sm">
          Total: {incidents.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents reported yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {incidents.slice(0, 10).map((inc) => (
              <li key={inc.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(inc.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {inc.incident_type === "Other" ? inc.other_type || "Other" : inc.incident_type}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", severityTone(inc.severity))}>
                        {inc.severity}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {inc.sites?.site_name ?? "—"} · {new Date(inc.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs text-primary">View protocol →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected && protocol ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  {protocol.title}
                </DialogTitle>
                <DialogDescription>
                  {selected.sites?.site_name ?? "Site"} ·{" "}
                  <span className={cn("ml-1 rounded-full border px-2 py-0.5 text-xs", severityTone(selected.severity))}>
                    {selected.severity} severity
                  </span>
                </DialogDescription>
              </DialogHeader>

              {selected.description ? (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  {selected.description}
                </div>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">Immediate actions</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {protocol.immediate.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">Follow-up</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {protocol.followUp.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <span className="font-semibold text-destructive">Escalation: </span>
                {protocol.escalate}
              </section>

              <p className="text-xs text-muted-foreground">
                General guidance based on standard security protocols. Always follow site-specific post orders and local laws.
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
