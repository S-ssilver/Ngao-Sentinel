import { useEffect, useState } from "react";
import { ChevronDown, HardDrive, Smartphone } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const USED_GB = 45;
const TOTAL_GB = 500;
const RECENT_GB = 40;
const ARCHIVE_GB = 5;

/** Small storage summary card. Intentionally quiet: muted surface, no flashing. */
export function StorageCard({ className = "" }: { className?: string }) {
  const pct = Math.round((USED_GB / TOTAL_GB) * 100);
  return (
    <div
      className={`rounded-lg border border-border bg-muted/40 p-3 text-xs ${className}`}
    >
      <div className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        Storage Used: {USED_GB} GB of {TOTAL_GB} GB available
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-2.5 space-y-1 text-muted-foreground">
        <li className="flex items-start gap-1.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          <span>
            Recent Footage (Last 7 Days): {RECENT_GB} GB —{" "}
            <span className="text-emerald-400">Instant Playback</span>
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
          <span>
            Archive (8–365 Days): {ARCHIVE_GB} GB —{" "}
            <span className="text-sky-400">Request Retrieval</span>
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
          <span>Auto-Delete After 365 Days: Your data stays secure</span>
        </li>
      </ul>
      <BandwidthIndicator />
    </div>
  );
}

/** Collapsible, plain-language explanation of how footage is kept. */
export function DataLifecycleInfo() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground">
        How your footage is stored
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <li>
            <span className="text-emerald-400">🟢 Recent Footage (0–7 Days):</span> Instant
            access, stored locally
          </li>
          <li>
            <span className="text-sky-400">🔵 Archive (8–365 Days):</span> Slow retrieval,
            stored safely
          </li>
          <li>
            🗑️ Auto-Delete: After 365 days, footage is automatically deleted for compliance
          </li>
          <li className="pt-1 text-foreground/80">
            All your data stays in Kenya. No international servers.
          </li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Shows a quiet hint only when the device appears to be on a cellular connection. */
export function BandwidthIndicator() {
  const [cellular, setCellular] = useState(false);

  useEffect(() => {
    const conn = (navigator as Navigator & {
      connection?: { type?: string; effectiveType?: string; addEventListener?: (e: string, cb: () => void) => void; removeEventListener?: (e: string, cb: () => void) => void };
    }).connection;
    if (!conn) return;
    const check = () =>
      setCellular(
        conn.type === "cellular" ||
          (!conn.type && ["2g", "3g", "4g"].includes(conn.effectiveType ?? "") === true && false),
      );
    check();
    conn.addEventListener?.("change", check);
    return () => conn.removeEventListener?.("change", check);
  }, []);

  if (!cellular) return null;
  return (
    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-400">
      <Smartphone className="h-3 w-3" />
      On Cellular: Videos restricted to Wi-Fi for full playback
    </div>
  );
}
