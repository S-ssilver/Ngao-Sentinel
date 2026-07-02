import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { INCIDENT_PROTOCOLS } from "@/lib/incident-protocols";
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
}: {
  incident: IncidentWithSite | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  showProtocol?: boolean;
}) {
  const protocol =
    incident && showProtocol ? INCIDENT_PROTOCOLS[incident.incident_type] : null;
  const siteName = incident?.sites?.site_name ?? incident?.site_name ?? "Site";

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
              </DialogTitle>
              <DialogDescription>
                {siteName} · {new Date(incident.created_at).toLocaleString()}
                <span
                  className={cn(
                    "ml-2 rounded-full border px-2 py-0.5 text-xs",
                    severityTone(incident.severity),
                  )}
                >
                  {incident.severity} severity
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Reported by:</span>{" "}
                {incident.reported_by ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Status:</span>{" "}
                {incident.resolved ? "Resolved" : "Open"}
              </div>
            </div>

            {incident.description ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                {incident.description}
              </div>
            ) : null}

            {protocol ? (
              <>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-primary">
                    Recommended Security Protocol — {protocol.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Standard worldwide SOP for this incident type.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">Immediate actions</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {protocol.immediate.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-2">
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

                <p className="text-xs text-muted-foreground">
                  General guidance based on standard security protocols. Always follow
                  site-specific post orders and local laws.
                </p>
              </>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}