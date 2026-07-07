import { useMemo } from "react";

export function ParticleField({ count = 22 }: { count?: number }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const size = 4 + Math.random() * 10;
        const hue = Math.random() > 0.5 ? 295 : 230;
        return {
          key: i,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${size}px`,
            height: `${size}px`,
            background: `radial-gradient(circle, oklch(0.85 0.18 ${hue} / 0.9), transparent 70%)`,
            animationDelay: `${Math.random() * -14}s`,
            animationDuration: `${10 + Math.random() * 14}s`,
            opacity: 0.35 + Math.random() * 0.4,
          } as React.CSSProperties,
        };
      }),
    [count],
  );
  return (
    <div className="particle-field" aria-hidden="true">
      {dots.map((d) => (
        <span key={d.key} style={d.style} />
      ))}
    </div>
  );
}