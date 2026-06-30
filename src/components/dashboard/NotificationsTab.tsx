"use client";

import { KPI_THRESHOLDS } from "@/lib/constants";

interface NotificationsTabProps {
  cpl: number | null;
  showRate: number | null;
  currency: string | null;
}

export function NotificationsTab({ cpl, showRate, currency }: NotificationsTabProps) {
  const cur = currency ?? "EUR";

  const cplBreached = cpl !== null && cpl > KPI_THRESHOLDS.cplMax;
  const showRateBreached = showRate !== null && showRate < KPI_THRESHOLDS.showRateMin;

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h2 className="text-base font-semibold">Alert Thresholds</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          The team receives an email notification when any of these KPIs cross their threshold.
          Checks run automatically every day at 09:00 UTC.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricRow
          label="Cost per Lead (CPL)"
          condition={`Above ${cur} ${KPI_THRESHOLDS.cplMax}`}
          currentValue={cpl !== null ? `${cur} ${cpl.toFixed(2)}` : "—"}
          breached={cplBreached}
          nullValue={cpl === null}
        />
        <MetricRow
          label="Show-up Rate"
          condition={`Below ${KPI_THRESHOLDS.showRateMin * 100}%`}
          currentValue={showRate !== null ? `${(showRate * 100).toFixed(0)}%` : "—"}
          breached={showRateBreached}
          nullValue={showRate === null}
        />
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  condition: string;
  currentValue: string;
  breached: boolean;
  nullValue: boolean;
}

function MetricRow({ label, condition, currentValue, breached, nullValue }: MetricRowProps) {
  const statusColor = nullValue
    ? "text-muted-foreground"
    : breached
      ? "text-rose-600 dark:text-rose-400"
      : "text-emerald-600 dark:text-emerald-400";

  const badgeClass = nullValue
    ? "bg-muted text-muted-foreground"
    : breached
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";

  const badgeLabel = nullValue ? "No data" : breached ? "Alert" : "OK";

  return (
    <div className="rounded-md border bg-card px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Current</div>
          <div className={`text-2xl font-semibold tabular-nums ${statusColor}`}>
            {currentValue}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Triggers when</div>
          <div className="text-sm text-muted-foreground">{condition}</div>
        </div>
      </div>
    </div>
  );
}
