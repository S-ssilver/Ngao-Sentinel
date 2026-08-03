import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Eye, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import {
  INCIDENT_TYPES,
  SEVERITIES,
  type IncidentLog,
  type IncidentType,
  type Severity,
  type Site,
  severityTone,
} from "@/lib/silverline";
import { getSession } from "@/lib/team-store";

export const Route = createFileRoute("/guard")({
  head: () => ({
    meta: [
      { title: "Guard Mode — NGAO" },
      { name: "description", content: "Simplified field guard interface." },
    ],
  }),
  component: GuardMode,
});

type Screen = "home" | "incident" | "site";

function GuardMode() {
  const [screen, setScreen] = useState<Screen>("home");
  const session = getSession();
  const guardName = session?.name ?? "Field Guard";
  const assignedSiteId = session?.siteIds?.[0];

  const siteQ = useQuery({
    queryKey: ["guard-site", assignedSiteId],
    queryFn: async () => {
      if (!assignedSiteId) {
        const { data } = await supabase.from("sites").select("*").limit(1).maybeSingle();
        return data as Site | null;
      }
      const { data } = await supabase.from("sites").select("*").eq("id", assignedSiteId).maybeSingle();
      return data as Site | null;
    },
  });
  const site = siteQ.data;

  return (
    <div className="min-h-[70vh]">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-accent-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">NGAO — Guard</h1>
        <p className="text-sm text-muted-foreground">
          {guardName} · {site?.site_name ?? "Assigned site"}
        </p>
      </div>

      {screen === "home" ? (
        <div className="mx-auto grid max-w-md gap-4">
          <button
            onClick={() => setScreen("incident")}
            className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-8 text-destructive transition hover:bg-destructive/20"
          >
            <AlertTriangle className="h-10 w-10" />
            <span className="text-lg font-bold tracking-wide">LOG AN INCIDENT</span>
          </button>
          <button
            onClick={() => setScreen("site")}
            className="flex flex-col items-center gap-3 rounded-2xl border border-accent/50 bg-accent/10 p-8 text-accent transition hover:bg-accent/20"
          >
            <Eye className="h-10 w-10" />
            <span className="text-lg font-bold tracking-wide">VIEW MY SITE</span>
          </button>
        </div>
      ) : screen === "incident" ? (
        <IncidentForm
          site={site}
          guardName={guardName}
          onDone={() => setScreen("home")}
        />
      ) : (
        <SiteView site={site} guardName={guardName} onBack={() => setScreen("home")} />
      )}
    </div>
  );
}

function IncidentForm({
  site,
  guardName,
  onDone,
}: {
  site: Site | null | undefined;
  guardName: string;
  onDone: () => void;
}) {
  const [type, setType] = useState<IncidentType>("Trespassing");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [description, setDescription] = useState("");
  const [otherType, setOtherType] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timestamp = new Date().toLocaleString();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!site) return;
    setSaving(true);
    const { error } = await supabase.from("incident_logs").insert({
      site_id: site.id,
      incident_type: type,
      other_type: type === "Other" ? otherType || null : null,
      severity,
      description: description || null,
      reported_by: `${guardName} (Guard)`,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Incident logged. Operations Manager notified.");
    onDone();
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Log an Incident</h2>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <Label>Incident Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as IncidentType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {type === "Other" ? (
        <div>
          <Label>Specify</Label>
          <Input value={otherType} onChange={(e) => setOtherType(e.target.value)} />
        </div>
      ) : null}
      <div>
        <Label>Severity</Label>
        <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <Label>Photo</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
        />
        {photoName ? (
          <p className="mt-1 text-xs text-muted-foreground">Attached: {photoName}</p>
        ) : null}
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <div>Location: <span className="text-foreground">{site?.site_name ?? "—"}</span></div>
        <div>Timestamp: <span className="text-foreground">{timestamp}</span></div>
      </div>
      <Button
        type="submit"
        disabled={saving}
        className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {saving ? "Submitting..." : "Submit Incident"}
      </Button>
    </form>
  );
}

function SiteView({
  site,
  guardName,
  onBack,
}: {
  site: Site | null | undefined;
  guardName: string;
  onBack: () => void;
}) {
  const sinceISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const incQ = useQuery({
    queryKey: ["guard-inc", site?.id],
    enabled: !!site,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_logs")
        .select("*")
        .eq("site_id", site!.id)
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as IncidentLog[];
    },
  });
  const attQ = useQuery({
    queryKey: ["guard-att", site?.id, guardName],
    enabled: !!site,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("site_id", site!.id)
        .eq("guard_name", guardName)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Site — {site?.site_name}</h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-accent">Recent incidents (7 days)</h3>
        <div className="space-y-2">
          {(incQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents recorded.</p>
          ) : (
            (incQ.data ?? []).map((i) => (
              <div key={i.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {i.incident_type === "Other" && i.other_type ? i.other_type : i.incident_type}
                  </span>
                  <span className={`rounded border px-2 py-0.5 text-xs ${severityTone(i.severity)}`}>
                    {i.severity}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(i.created_at).toLocaleString()}
                </div>
                {i.description ? <p className="mt-1 text-xs">{i.description}</p> : null}
              </div>
            ))
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-accent">My attendance</h3>
        <div className="space-y-1">
          {(attQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records.</p>
          ) : (
            (attQ.data ?? []).map((a) => (
              <div key={a.id} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{new Date(a.created_at).toLocaleString()}</span>
                <span className="text-muted-foreground">{a.shift_type} · {a.status}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}