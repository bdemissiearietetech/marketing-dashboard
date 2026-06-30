export type PhaseGroup = "pre-loi" | "post-loi" | "terminal";

export interface PhaseMeta {
  name: string;
  number: number | null; // user-facing "Phase XX" number; null for terminal/unspecified
  group: PhaseGroup;
}

// Phase metadata, in pipeline order. Numbers come from the user's canonical spec
// (gaps where placeholder phases — e.g. Phase 02 "Introduction email received" — don't exist as records).
export const PHASES: ReadonlyArray<PhaseMeta> = [
  // Stage 01 — Pre-LOI (Leads table)
  { name: "Wating agent for introduction email", number: 1, group: "pre-loi" },
  { name: "Contact the lead", number: 3, group: "pre-loi" },
  { name: "Waiting lead to set the call", number: 4, group: "pre-loi" },
  { name: "Set Meeting", number: 5, group: "pre-loi" },
  { name: "Meeting set", number: 6, group: "pre-loi" },
  { name: "Meeting held waiting for feedback", number: 7, group: "pre-loi" },
  { name: "No show - re-engaging the lead", number: null, group: "pre-loi" },
  { name: "Converted - Prepare LOI", number: 8, group: "pre-loi" },
  { name: "LOI Sent - Waiting for signature", number: 9, group: "pre-loi" },
  { name: "LOI Signed", number: 10, group: "pre-loi" },
  // Stage 02 — Post-LOI (Clients table)
  { name: "KYC Sent", number: 12, group: "post-loi" },
  { name: "Invoice Sent - Waiting for payment", number: 14, group: "post-loi" },
  { name: "Onboarding fee paid", number: 15, group: "post-loi" },
  { name: "Fee at Nulla osta", number: 16, group: "post-loi" },
  { name: "Investment executed", number: 17, group: "post-loi" },
  // Terminal states
  { name: "No fee", number: null, group: "terminal" },
  { name: "Lost", number: null, group: "terminal" },
];

export const PHASE_ORDER: ReadonlyArray<string> = PHASES.map((p) => p.name);

const PHASE_META_BY_NAME = new Map(PHASES.map((p) => [p.name.toLowerCase(), p]));

export function getPhaseMeta(name: string): PhaseMeta | undefined {
  return PHASE_META_BY_NAME.get(name.toLowerCase());
}

// "Closed" = onboarding fee paid (Phase 15) and beyond — fee collected = revenue recognized.
export const CLOSED_PHASES: ReadonlyArray<string> = [
  "Onboarding fee paid",
  "Fee at Nulla osta",
  "Investment executed",
];

// Ariete-owned introduction sources. The Airtable base also tracks leads/clients introduced
// by external agents; we only count records whose `source` (Clients) / `introduction_source` (Leads)
// linked record's primary name matches one of these. Names are compared because Airtable formulas
// cannot match linked record IDs — ARRAYJOIN returns primary values, not IDs.
// Source IDs (for reference): recyF7vRsDZiW1G7u, recSpiDZJORwUzBGk, recjZwTPOxkx1RAUz.
export const ARIETE_SOURCE_NAMES: ReadonlyArray<string> = [
  "Ariete Capital",
  "Ariete Capital - Meta ads",
  "Ariete Capital - Website",
];

export const DEFAULT_RANGE_DAYS = 30;

// Onboarding-fee-paid threshold: records that have paid the onboarding fee
// (and beyond) — same as CLOSED_PHASES today but kept separate semantically.
export const ONBOARDING_FEE_PAID_PHASES: ReadonlyArray<string> = [
  "Onboarding fee paid",
  "Fee at Nulla osta",
  "Investment executed",
];

export const INVESTMENT_EXECUTED_PHASE = "Investment executed";
export const NO_SHOW_PHASE = "No show - re-engaging the lead";

export const CACHE_TTL = {
  metaAds: 600,
  calendly: 600,
  calendlyEventTypes: 3600,
  airtable: 300,
} as const;

// Exclusion list: scheduled_events whose event_type name matches one of these
// (case-insensitive, trimmed) are NOT counted as booked calls. Internal meetings,
// generic "30 min" pages, partner-specific pages, etc. Everything else counts.
// We avoid /event_types?organization=… for the allow-list because non-admin PATs
// don't see team event types there; instead each scheduled event's event_type URI
// is resolved directly via GET /event_types/{uuid}, which works for any PAT.
export const CALENDLY_IGNORED_EVENT_TYPE_NAMES: ReadonlyArray<string> = [
  "30 Minute Meeting",
  "Ariete Capital x Vancis",
  "Meet with Dario Montagnese",
];

export const KPI_THRESHOLDS = {
  cplMax: 30,       // CPL above this → red alert
  showRateMin: 0.4, // show-up rate below this → red alert
} as const;
