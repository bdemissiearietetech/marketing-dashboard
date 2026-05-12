import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  invertDelta?: boolean;
  locale?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  invertDelta,
  locale = "en",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("flex-1 min-w-[160px]", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {delta !== undefined ? (
          <DeltaRow delta={delta} label={deltaLabel} invert={invertDelta} locale={locale} />
        ) : hint ? (
          <div className="text-xs text-muted-foreground mt-1">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DeltaRow({
  delta,
  label,
  invert,
  locale,
}: {
  delta: number | null | undefined;
  label?: string;
  invert?: boolean;
  locale: string;
}) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) {
    return <div className="text-xs text-muted-foreground mt-1">{label ?? "—"}</div>;
  }

  const isFlat = Math.abs(delta) < 0.0005;
  const isUp = delta > 0;
  const positive = invert ? !isUp : isUp;
  const colorClass = isFlat
    ? "text-muted-foreground"
    : positive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("mt-1 flex items-center gap-1 text-xs tabular-nums", colorClass)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{formatPercent(delta, locale, { signed: true })}</span>
      {label ? <span className="text-muted-foreground ml-1">{label}</span> : null}
    </div>
  );
}
