import "server-only";
import { getMetaInsights } from "./meta-ads";
import { getBookedCalls } from "./calendly";
import { getArieteFunnelStages } from "./airtable-clients";
import { logger } from "@/lib/logger";
import type { DateRange } from "@/lib/date-range";

export type FunnelStageKey =
  | "metaLeads"
  | "booked"
  | "attended"
  | "loi"
  | "onboardingFee"
  | "investmentExecuted";

export interface FunnelStage {
  key: FunnelStageKey;
  count: number | null;
}

export interface FunnelResult {
  stages: FunnelStage[];
  range: { from: string; to: string };
  warnings: string[];
}

export async function getFunnel(range: DateRange): Promise<FunnelResult> {
  // Stages from independent sources — if Calendly is misconfigured we still want Meta
  // and Airtable stages to render, with the missing ones shown as "—".
  const [metaRes, airtableRes, calendlyRes] = await Promise.allSettled([
    getMetaInsights(range),
    getArieteFunnelStages(range),
    getBookedCalls(range),
  ]);

  const warnings: string[] = [];
  if (metaRes.status === "rejected") {
    warnings.push(`Meta: ${(metaRes.reason as Error).message}`);
    logger.warn({ err: metaRes.reason }, "funnel: meta failed");
  }
  if (airtableRes.status === "rejected") {
    warnings.push(`Airtable: ${(airtableRes.reason as Error).message}`);
    logger.warn({ err: airtableRes.reason }, "funnel: airtable failed");
  }
  if (calendlyRes.status === "rejected") {
    warnings.push(`Calendly: ${(calendlyRes.reason as Error).message}`);
    logger.warn({ err: calendlyRes.reason }, "funnel: calendly failed");
  }

  const meta = metaRes.status === "fulfilled" ? metaRes.value : null;
  const airtable = airtableRes.status === "fulfilled" ? airtableRes.value : null;
  const calendly = calendlyRes.status === "fulfilled" ? calendlyRes.value : null;

  return {
    range,
    warnings,
    stages: [
      { key: "metaLeads", count: meta?.totalLeads ?? null },
      { key: "booked", count: calendly?.booked ?? null },
      { key: "attended", count: calendly?.attended ?? null },
      { key: "loi", count: airtable?.loiSigned ?? null },
      { key: "onboardingFee", count: airtable?.onboardingFeePaid ?? null },
      { key: "investmentExecuted", count: airtable?.investmentExecuted ?? null },
    ],
  };
}
