"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { MetaDailyPoint } from "@/types/meta-ads";

interface TrendChartProps {
  points: MetaDailyPoint[];
  spendLabel: string;
  leadsLabel: string;
  currency: string | null;
  locale: string;
}

export function TrendChart({ points, spendLabel, leadsLabel, currency, locale }: TrendChartProps) {
  const data = points.map((p) => ({ date: p.date.slice(5), spend: p.spend, leads: p.leads }));

  const moneyFmt = (v: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency ?? "EUR",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tick={{ fontSize: 11 }}
            tickFormatter={moneyFmt}
            className="fill-muted-foreground"
            width={70}
          />
          <YAxis
            yAxisId="leads"
            orientation="right"
            tick={{ fontSize: 11 }}
            allowDecimals={false}
            className="fill-muted-foreground"
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === spendLabel) return [moneyFmt(v), name];
              return [new Intl.NumberFormat(locale).format(v), name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="spend"
            type="monotone"
            dataKey="spend"
            name={spendLabel}
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="leads"
            type="monotone"
            dataKey="leads"
            name={leadsLabel}
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
