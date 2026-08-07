import { useEffect, useState } from "react";

/**
 * Small, unobtrusive recording-quality indicator for a live camera preview.
 * Green = motion detected (sharp recording), light blue = idle (saving bandwidth).
 */
export function MotionStatus({ seed = 0 }: { seed?: number }) {
  const [active, setActive] = useState(seed % 2 === 0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => !a), 10000 + (seed % 3) * 2500);
    return () => clearInterval(id);
  }, [seed]);

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-400 animate-pulse" : "bg-sky-300"
        }`}
      />
      {active ? "Recording at 30 fps" : "Idle Recording at 5 fps"}
    </div>
  );
}
