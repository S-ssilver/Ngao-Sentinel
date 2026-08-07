import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MotionStatus } from "@/components/MotionStatus";
import { BandwidthIndicator, DataLifecycleInfo } from "@/components/StorageCard";

const STILL = "https://images.unsplash.com/photo-1557183050-52a5470b3c98?w=1200&q=60";

export const isHot = (d: Date) =>
  Date.now() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;

export type ReadyArchive = { date: Date; expiresAt: number };

export function IncidentVideoDialog({
  open,
  onOpenChange,
  siteName,
  initialDate,
  unlocked,
  onArchiveReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteName?: string;
  initialDate?: Date;
  /** A retrieved archive clip that is temporarily accessible. */
  unlocked?: ReadyArchive | null;
  onArchiveReady?: (ready: ReadyArchive) => void;
}) {
  const [date, setDate] = useState<Date | undefined>(initialDate ?? new Date());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(initialDate ?? new Date());
      setPending(false);
    }
  }, [open, initialDate]);

  const unlockedMatch =
    !!date && !!unlocked && unlocked.date.toDateString() === date.toDateString();
  const playable = !!date && (isHot(date) || unlockedMatch);

  const requestArchive = () => {
    if (!date) return;
    setPending(true);
    toast("Retrieving from archive…", {
      description: "You'll get a notification when ready (usually 5–10 minutes).",
    });
    const target = date;
    setTimeout(() => {
      const ready = { date: target, expiresAt: Date.now() + 60 * 60 * 1000 };
      onArchiveReady?.(ready);
      toast.success(
        `Your archive footage from ${format(target, "PPP")} is ready. Access for 1 hour.`,
      );
    }, 6000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Incident Video</DialogTitle>
          <DialogDescription>
            {siteName ? `${siteName} — ` : ""}Pick the day you want to review.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setPending(false);
                }}
                disabled={{ after: new Date() }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {playable ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Instant Access
            </span>
          ) : null}
        </div>

        {playable ? (
          <>
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
              <img src={STILL} alt="Incident footage frame" className="h-full w-full object-cover opacity-90" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white">
                  <Play className="h-6 w-6" />
                </span>
              </div>
              <MotionStatus />
            </div>
            {unlockedMatch && unlocked ? <AccessTimer expiresAt={unlocked.expiresAt} /> : null}
          </>
        ) : (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4 text-sm">
            <p className="text-muted-foreground">
              This day is in the archive. Retrieval takes a few minutes.
            </p>
            <Button
              className="mt-3"
              variant={pending ? "secondary" : "default"}
              disabled={pending}
              onClick={requestArchive}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pending Retrieval
                </>
              ) : (
                "Request Archive Footage"
              )}
            </Button>
          </div>
        )}

        <BandwidthIndicator />
        <DataLifecycleInfo />
      </DialogContent>
    </Dialog>
  );
}

function AccessTimer({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.max(0, Math.round((expiresAt - now) / 60000));
  return (
    <p className="text-xs text-muted-foreground">
      Access expires in {mins} minute{mins === 1 ? "" : "s"}
    </p>
  );
}
