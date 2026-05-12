export interface AirtableClient {
  id: string;
  name: string;
  owner: string | null;
  createdAt: string;
}

export interface PhaseBucket {
  phase: string;
  count: number;
  clients?: AirtableClient[];
}

export interface ClientPhasesResult {
  total: number;
  buckets: PhaseBucket[];
}

export interface ArietePeriodSummary {
  leadsCount: number;
  clientsCount: number;
  closedCount: number;
  range: { from: string; to: string };
}

export interface ClientsBreakdown {
  total: number;
  direct: number;
  fromAgents: number;
}

// One cohort = all Ariete-sourced leads + clients introduced in a given month.
// Counts represent the cohort's current state (snapshot at query time).
export interface CohortBreakdownRow {
  /** ISO month "YYYY-MM" */
  month: string;
  /** Total cohort size (leads + clients introduced that month, Ariete-sourced). */
  total: number;
  /** Reached "LOI Signed" milestone (leads still at LOI Signed + every client). */
  loiCount: number;
  /** Reached the onboarding-fee-paid milestone or beyond (clients in CLOSED_PHASES). */
  onboardingCount: number;
  /** Reached the final "Investment executed" phase. */
  investedCount: number;
}

export interface CohortBreakdownResult {
  rows: CohortBreakdownRow[];
  range: { from: string; to: string };
}

