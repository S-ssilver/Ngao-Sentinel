import { useState } from "react";
import { format } from "date-fns";
import { Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IncidentVideoDialog,
  type ReadyArchive,
} from "@/components/IncidentVideoDialog";
import { DataLifecycleInfo } from "@/components/StorageCard";

export function IncidentReviewSection({ siteName }: { siteName?: string }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState<ReadyArchive | null>(null);
  const [unread, setUnread] = useState(0);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          Incident Review
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => {
                setUnread(0);
                setInitialDate(ready?.date);
                setOpen(true);
              }}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400"
            >
              {unread} new
            </button>
          ) : null}
        </CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setInitialDate(undefined);
            setOpen(true);
          }}
        >
          <Video className="mr-2 h-4 w-4" /> View Incident Video
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Your footage is safe. Old footage retrieves when you need it. After 1 year, it's gone.
        </p>
        {ready ? (
          <p className="text-xs text-sky-400">
            Archive footage from {format(ready.date, "PPP")} is available for 1 hour.
          </p>
        ) : null}
        <DataLifecycleInfo />
      </CardContent>

      <IncidentVideoDialog
        open={open}
        onOpenChange={setOpen}
        siteName={siteName}
        initialDate={initialDate}
        unlocked={ready}
        onArchiveReady={(r) => {
          setReady(r);
          setUnread((u) => u + 1);
        }}
      />
    </Card>
  );
}
