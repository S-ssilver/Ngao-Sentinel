import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Play, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MotionStatus } from "@/components/MotionStatus";
import {
  isHot,
  minutesLeft,
  markSeen,
  requestRetrieval,
  useOnCellular,
  useRetrieval,
} from "@/lib/video-store";
import { cn } from "@/lib/utils";

export interface VideoTarget {
  id: string;
  label: string;
  date: string; // ISO timestamp of the incident
}

export function IncidentVideoDialog({
  target,
  open,
  onOpenChange,
}: {
  target: VideoTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const cellular = useOnCellular();

  useEffect(() => {
    if (open && target) setDate(new Date(target.date));
  }, [open, target]);

  const dayKey = date ? format(date, "yyyy-MM-dd") : null;
  const retrieval = useRetrieval(target?.id ?? null, dayKey);
  const hot = date ? isHot(date) : false;

  useEffect(() => {
    if (retrieval && retrieval.status === "ready" && !retrieval.seen) markSeen(retrieval.id);
  }, [retrieval]);

  const playable = hot || retrieval?.status === "ready";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Incident video — {target?.label ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="justify-start font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {hot ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
              Instant Access
            </span>
          ) : (
            <span className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-400">
              Archived footage
            </span>
          )}
        </div>

        {playable ? (
          <div className="relative aspect-video overflow-hidden rounded-md bg-black">
            <img
              src="https://images.unsplash.com/photo-1557183050-52a5470b3c98?w=1000&q=60"
              alt={`Footage from ${date ? format(date, "PPP") : ""}`}
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black">
                <Play className="h-5 w-5" />
              </span>
            </div>
            <MotionStatus />
          </div>
        ) : (
          <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
            {retrieval?.status === "pending" ? (
              <>
                <p className="text-muted-foreground">
                  Retrieving from archive... You&apos;ll get a notification when ready
                  (usually 5–10 minutes).
                </p>
                <Button size="sm" variant="secondary" disabled className="text-muted-foreground">
                  Pending Retrieval
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  This footage is older than 7 days and stored in the archive.
                </p>
                <Button
                  size="sm"
                  onClick={() =>
                    target && dayKey && requestRetrieval(target.id, target.label, dayKey)
                  }
                >
                  Request Archive Footage
                </Button>
              </>
            )}
          </div>
        )}

        {retrieval?.status === "ready" ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Access expires in {minutesLeft(retrieval.expiresAt)} minutes
          </p>
        ) : null}

        {cellular ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            On Cellular: Videos restricted to Wi-Fi for full playback
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}