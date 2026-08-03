import { useState } from "react";
import { ChevronDown, HardDrive, Smartphone } from "lucide-react";

import { useOnCellular } from "@/lib/video-store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const USED_GB = 45;
const TOTAL_GB = 500;

export function StorageCard() {
  const [open, setOpen] = useState(false);
  const cellular = useOnCellular();
  const pct = Math.round((USED_GB / TOTAL_GB) * 100);

  return (
    <div className="w-full rounded-xl border border-border bg-muted/40 p-3 text-xs sm:max-w-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium">
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
          Storage Used
        </div>
        <span className="tabular-nums text-muted-foreground">
          {USED_GB} GB of {TOTAL_GB} GB available
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1.5 text-muted-foreground">
        <li className="flex items-start gap-1.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span>
            <span className="text-foreground">Recent Footage (Last 7 Days):</span> 40 GB —
            Instant Playback
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
          <span>
            <span className="text-foreground">Archive (8–365 Days):</span> 5 GB — Request
            Retrieval
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>Auto-Delete After 365 Days: Your data stays secure</span>
        </li>
      </ul>

      {cellular ? (
        <div className="mt-3 flex items-start gap-1.5 rounded-md border border-border bg-background/60 p-2 text-muted-foreground">
          <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>On Cellular: Videos restricted to Wi-Fi for full playback</span>
        </div>
      ) : null}

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="mt-3 flex w-full items-center justify-between text-muted-foreground transition hover:text-foreground">
          How your footage is kept
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5 text-muted-foreground">
          <p className="flex items-start gap-1.5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            Recent Footage (0–7 Days): Instant access, stored locally
          </p>
          <p className="flex items-start gap-1.5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
            Archive (8–365 Days): Slow retrieval, stored safely
          </p>
          <p className="flex items-start gap-1.5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
            Auto-Delete: After 365 days, footage is automatically deleted for compliance
          </p>
          <p className="pt-1 text-foreground/80">
            All your data stays in Kenya. No international servers.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}