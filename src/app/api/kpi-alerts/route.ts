import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getMetaInsights } from "@/server/queries/meta-ads";
import { getBookedCalls } from "@/server/queries/calendly";
import { getNoShowCount } from "@/server/queries/airtable-clients";
import { defaultRange } from "@/lib/date-range";
import { KPI_THRESHOLDS } from "@/lib/constants";

interface KpiAlert {
  kpi: string;
  value: number;
  threshold: number;
  direction: "above" | "below";
  unit: string;
  message: string;
}

export async function GET(req: Request) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!env.N8N_KPI_ALERT_WEBHOOK_URL) {
    return NextResponse.json({ error: "KPI alert webhook not configured." }, { status: 503 });
  }

  const range = defaultRange();
  const alerts: KpiAlert[] = [];

  const [meta, calendar, noShowCount] = await Promise.allSettled([
    getMetaInsights(range),
    getBookedCalls(range),
    getNoShowCount(range),
  ]);

  if (meta.status === "fulfilled") {
    const cpl = meta.value.cpl;
    if (cpl !== null && cpl > KPI_THRESHOLDS.cplMax) {
      alerts.push({
        kpi: "CPL",
        value: Math.round(cpl * 100) / 100,
        threshold: KPI_THRESHOLDS.cplMax,
        direction: "above",
        unit: meta.value.currency ?? "EUR",
        message: `CPL is ${meta.value.currency ?? "EUR"} ${cpl.toFixed(2)} — above the ${KPI_THRESHOLDS.cplMax} threshold`,
      });
    }
  } else {
    logger.warn({ err: meta.reason }, "kpi-alerts: meta-ads fetch failed");
  }

  if (calendar.status === "fulfilled" && noShowCount.status === "fulfilled") {
    const cal = calendar.value;
    const attended = Math.max(0, cal.pastBooked - noShowCount.value);
    const showRate = cal.pastBooked > 0 ? attended / cal.pastBooked : null;
    if (showRate !== null && showRate < KPI_THRESHOLDS.showRateMin) {
      alerts.push({
        kpi: "Show Rate",
        value: Math.round(showRate * 1000) / 10,
        threshold: KPI_THRESHOLDS.showRateMin * 100,
        direction: "below",
        unit: "%",
        message: `Show-up rate is ${(showRate * 100).toFixed(0)}% — below the ${KPI_THRESHOLDS.showRateMin * 100}% threshold`,
      });
    }
  } else {
    logger.warn(
      {
        calErr: calendar.status === "rejected" ? calendar.reason : undefined,
        noShowErr: noShowCount.status === "rejected" ? noShowCount.reason : undefined,
      },
      "kpi-alerts: calendly/airtable fetch failed",
    );
  }

  if (alerts.length === 0) {
    logger.info({ range }, "kpi-alerts: all KPIs healthy, no alert sent");
    return NextResponse.json({ ok: true, alerts: [] });
  }

  const recipients = env.ALERT_RECIPIENT_EMAILS
    ? env.ALERT_RECIPIENT_EMAILS.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  const payload = {
    alerts,
    recipients,
    rangeFrom: range.from,
    rangeTo: range.to,
    summary: alerts.map((a) => a.message).join("\n"),
  };

  try {
    const res = await fetch(env.N8N_KPI_ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error({ status: res.status, body: body.slice(0, 200) }, "kpi-alerts: N8N webhook failed");
      return NextResponse.json({ error: `Webhook returned ${res.status}` }, { status: 502 });
    }
  } catch (err) {
    logger.error({ err }, "kpi-alerts: N8N webhook threw");
    return NextResponse.json({ error: (err as Error).message ?? "Webhook unreachable." }, { status: 502 });
  }

  logger.info({ alertCount: alerts.length, kpis: alerts.map((a) => a.kpi) }, "kpi-alerts: sent");
  return NextResponse.json({ ok: true, alerts });
}
