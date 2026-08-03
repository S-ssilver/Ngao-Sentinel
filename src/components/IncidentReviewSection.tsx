import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Bell, Video } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IncidentVideoDialog, type VideoTarget } from "@/components/IncidentVideoDialog";
import { isHot, useRetrievals } from "@/lib/video-store";
import { severityTone, type IncidentLog, type Site } from "@/lib/silverline";

export function IncidentReviewSection({ sites }: { sites: Site[] }) {
  const [target, setTarget] = useState<VideoTarget | null>(null);
  const { retrievals, unseenReady } = useRetrievals();
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const r of retrievals) {
      if (r.status === "ready" && !notified.current.has(r.id)) {
        notified.current.add(r.id);
        toast.success(
          `Your archive footage from ${format(new Date(r.date), "PPP")} is ready. Access for 1 hour.`,
        );
      }
    }
  }, [retrievals]);

  const incQ = useQuery({
    queryKey: ["incidents", "review-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as IncidentLog[];
    },
  });

  const siteName = (id: string) => sites.find((s) => s.id === id)?.site_name ?? "—";

  function openReady() {
    const r = unseenReady[0];
    if (!r) return;
    setTarget({ id: r.incidentId, label: r.label, date: new Date(r.date).toISOString() });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          Incident Review
          {unseenReady.length > 0 ? (
            <button onClick={openReady} aria-label="Archive footage ready">
              <Badge className="gap-1 bg-sky-500 text-white hover:bg-sky-500/90">
                <Bell className="h-3 w-3" /> {unseenReady.length} new
              </Badge>
            </button>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date / Time</th>
                <th className="px-3 py-2 text-left">Site</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Severity</th>
                <th className="px-3 py-2 text-right">Footage</th>
              </tr>
            </thead>
            <tbody>
              {(incQ.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No incidents logged yet.
                  </td>
                </tr>
              ) : (
                (incQ.data ?? []).map((i) => {
                  const hot = isHot(new Date(i.created_at));
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {new Date(i.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{siteName(i.site_id)}</td>
                      <td className="px-3 py-2">{i.incident_type}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${severityTone(i.severity)}`}
                        >
                          {i.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`hidden rounded-full border px-2 py-0.5 text-[10px] sm:inline ${
                              hot
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
                                : "border-sky-500/40 bg-sky-500/15 text-sky-400"
                            }`}
                          >
                            {hot ? "Instant Access" : "Archive"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setTarget({
                                id: i.id,
                                label: `${i.incident_type} — ${siteName(i.site_id)}`,
                                date: i.created_at,
                              })
                            }
                          >
                            <Video className="mr-1 h-3.5 w-3.5" /> View Incident Video
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <IncidentVideoDialog
        target={target}
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
      />
    </Card>
  );
}