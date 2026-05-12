import "server-only";
import { logger } from "@/lib/logger";
import { getArieteCohortBreakdown } from "./airtable-clients";
import { getMetaInsightsDaily } from "./meta-ads";

export interface CohortRow {
  /** "YYYY-MM" */
  month: string;
  cohortSize: number;
  loiCount: number;
  onboardingCount: number;
  investedCount: number;
  /** Meta spend in that calendar month (0 if no data). */
  spend: number;
  /** spend ÷ onboardingCount — null when no closed clients yet (cohort still maturing). */
  realizedCac: number | null;
}

export interface CohortResult {
  rows: CohortRow[];
  currency: string | null;
  warnings: string[];
}

/**
 * Cohort-correct CAC: cohorts grouped by introduction month, with realized CAC
 * computed as the month's Meta spend ÷ that cohort's closed (onboarding-fee-paid) count.
 * Newer cohorts will look expensive — they haven't matured. That's expected and is
 * exactly the signal a long-cycle financial-services funnel needs.
 */
export async function getCohortAnalysis(monthsBack: number = 6): Promise<CohortResult> {
  const warnings: string[] = [];

  // Airtable first so we know the exact date window — Meta spend has to match.
  const airtable = await getArieteCohortBreakdown(monthsBack);

  let currency: string | null = null;
  const spendByMonth = new Map<string, number>();
  try {
    const meta = await getMetaInsightsDaily(airtable.range);
    currency = meta.currency;
    for (const p of meta.points) {
      const key = p.date.slice(0, 7);
      spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + p.spend);
    }
  } catch (err) {
    warnings.push(`Meta: ${(err as Error).message}`);
    logger.warn({ err }, "cohorts: meta failed");
  }

  const rows: CohortRow[] = airtable.rows.map((r) => {
    const spend = spendByMonth.get(r.month) ?? 0;
    const realizedCac = r.onboardingCount > 0 ? spend / r.onboardingCount : null;
    return {
      month: r.month,
      cohortSize: r.total,
      loiCount: r.loiCount,
      onboardingCount: r.onboardingCount,
      investedCount: r.investedCount,
      spend,
      realizedCac,
    };
  });

  return { rows, currency, warnings };
}
