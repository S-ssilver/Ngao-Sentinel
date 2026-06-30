import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "ok";
}

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-primary/15 text-primary",
  warn: "bg-[oklch(0.78_0.16_85/0.18)] text-[oklch(0.85_0.16_85)]",
  danger: "bg-destructive/20 text-destructive",
  ok: "bg-[oklch(0.72_0.16_160/0.18)] text-[oklch(0.82_0.16_160)]",
};

export function MetricCard({ label, value, icon: Icon, hint, tone = "default" }: MetricCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${toneStyles[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold tabular-nums">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}