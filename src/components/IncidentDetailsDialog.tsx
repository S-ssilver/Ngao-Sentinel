import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ImageOff, RotateCcw, ShieldAlert } from "lucide-react";
import { INCIDENT_PROTOCOLS } from "@/lib/incident-protocols";
import { supabase } from "@/integrations/supabase/client";
import { type IncidentLog, severityTone } from "@/lib/silverline";
import { cn } from "@/lib/utils";

export type IncidentWithSite = IncidentLog & {
  sites?: { site_name: string; company_name: string } | null;
  site_name?: string;
};

export function IncidentDetailsDialog({
  incident,
  open,
  onOpenChange,
  showProtocol = true,
  allowStatusUpdate = false,
}: {
  incident: IncidentWithSite | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  showProtocol?: boolean;
  allowStatusUpdate?: boolean;
}) {
  const qc = useQueryClient();
  const protocol =
    incident && showProtocol ? INCIDENT_PROTOCOLS[incident.incident_type] : null;
  const siteName = incident?.sites?.site_name ?? incident?.site_name ?? "Site";

  const toggle = useMutation({
    mutationFn: async (resolve: boolean) => {
      if (!incident) return;
      const { error } = await supabase
        .from("incident_logs")
        .update({ resolved: resolve })
        .eq("id", incident.id);
      if (error) throw error;
    },
    onSuccess: (_d, resolve) => {
      toast.success(resolve ? "Marked resolved" : "Reopened");
      qc.invalidateQueries({ queryKey: ["incidents"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {incident ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                {incident.incident_type === "Other" && incident.other_type
                  ? incident.other_type
                  : incident.incident_type}
                <span
                  className={cn(
                    "ml-2 rounded-full border px-2 py-0.5 text-xs font-normal",
                    severityTone(incident.severity),
                  )}
                >
                  {incident.severity} severity
                </span>
              </DialogTitle>
              <DialogDescription>
                {siteName} · {new Date(incident.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-semibold">Reported by</div>
                <div className="text-muted-foreground">{incident.reported_by ?? "—"}</div>
              </div>
              <div>
                <div className="font-semibold">Status</div>
                <div className={incident.resolved ? "text-emerald-500" : "text-destructive"}>
                  {incident.resolved ? "Resolved" : "Open"}
                </div>
              </div>
            </div>

            <section className="space-y-1.5">
              <h4 className="text-sm font-bold">Incident Description</h4>
              <p className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                {incident.description?.trim() || "No description provided."}
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="text-sm font-bold">Evidence</h4>
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                <ImageOff className="h-4 w-4" />
                No evidence attached for this incident.
              </div>
            </section>

            {incident.resolved ? (
              <section className="space-y-1.5">
                <h4 className="text-sm font-bold text-emerald-600">Resolution Summary</h4>
                <div className="rounded-md border-2 border-emerald-500/60 bg-emerald-500/10 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                  </div>
                  <p>
                    Incident closed by Operations. Response actions completed per ARN
                    Security SOP. Full audit trail retained.
                  </p>
                </div>
              </section>
            ) : null}

            {protocol ? (
              <>
                <section className="space-y-2 border-t border-border pt-3">
                  <h3 className="text-sm font-semibold text-primary">
                    Recommended Security Protocol — {protocol.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Standard SOP for this incident type — internal reference.
                  </p>
                </section>
                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Immediate actions</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {protocol.immediate.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </section>
                <section className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Follow-up</h4>
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
              </>
            ) : null}

            {allowStatusUpdate ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                {incident.resolved ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggle.mutate(false)}
                    disabled={toggle.isPending}
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" /> Reopen incident
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => toggle.mutate(true)}
                    disabled={toggle.isPending}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark as Resolved
                  </Button>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
