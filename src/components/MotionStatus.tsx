import { useEffect, useState } from "react";

/**
 * Small overlay indicator for a live feed:
 * green = motion detected (30 fps), light blue = idle (5 fps).
 */
export function MotionStatus({ seed = 0 }: { seed?: number }) {
  const [active, setActive] = useState(seed % 2 === 0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((a) => !a);
    }, active ? 12000 : 10000);
    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-sky-300"}`}
      />
      {active ? "Recording at 30 fps" : "Idle Recording at 5 fps"}
    </div>
  );
}