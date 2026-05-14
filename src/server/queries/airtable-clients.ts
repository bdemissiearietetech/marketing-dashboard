import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCached } from "@/lib/cache";
import {
  ARIETE_SOURCE_NAMES,
  CACHE_TTL,
  CLOSED_PHASES,
  INVESTMENT_EXECUTED_PHASE,
  NO_SHOW_PHASE,
  ONBOARDING_FEE_PAID_PHASES,
  PHASE_ORDER,
} from "@/lib/constants";
import type {
  AirtableClient,
  ArietePeriodSummary,
  ClientPhasesResult,
  ClientsBreakdown,
  PhaseBucket,
} from "@/types/airtable";
import type { DateRange } from "@/lib/date-range";

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

const PHASE_FIELD = "phase";
const DATE_FIELD = "introduction_date";
const MEETING_DATE_FIELD = "meeting_date";
const LEADS_SOURCE_FIELD = "introduction_source";
const CLIENTS_SOURCE_FIELD = "source";
const UNKNOWN = "Unknown";

// Per-table display field mapping. Airtable returns 422 if fields[] lists an unknown
// column, so we can't merge candidates — we must request only the columns that exist
// on each table.
interface DisplayFields {
  name: string;
  owner: string;
}
const CLIENTS_DISPLAY_FIELDS: DisplayFields = { name: "client", owner: "client Manager" };
const LEADS_DISPLAY_FIELDS: DisplayFields = { name: "lead", owner: "Owner" };

const CLOSED_SET = new Set(CLOSED_PHASES.map((p) => p.toLowerCase()));

function extractPhase(record: AirtableRecord): string {
  const raw = record.fields[PHASE_FIELD];
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0]);
  if (typeof raw === "string" && raw.trim().length > 0) return raw;
  return UNKNOWN;
}

// Linked-record fields return arrays of record IDs (e.g. "recABC123…") unless paired
// with an Airtable Lookup field. We don't want to display raw IDs in the UI, so detect
// and discard them.
const AIRTABLE_RECORD_ID = /^rec[A-Za-z0-9]{14,17}$/;

function isUsableString(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const trimmed = v.trim();
  if (trimmed.length === 0) return false;
  if (AIRTABLE_RECORD_ID.test(trimmed)) return false;
  return true;
}

function extractStringField(record: AirtableRecord, key: string): string | null {
  const raw = record.fields[key];
  if (isUsableString(raw)) return raw.trim();
  if (Array.isArray(raw) && raw.length > 0 && isUsableString(raw[0])) return raw[0].trim();
  return null;
}

function toClient(record: AirtableRecord, fields: DisplayFields): AirtableClient {
  return {
    id: record.id,
    name: extractStringField(record, fields.name) ?? record.id,
    owner: extractStringField(record, fields.owner),
    createdAt: record.createdTime,
  };
}

function sortBuckets(buckets: PhaseBucket[]): PhaseBucket[] {
  const orderIndex = new Map(PHASE_ORDER.map((p, i) => [p.toLowerCase(), i]));
  return [...buckets].sort((a, b) => {
    const ai = orderIndex.get(a.phase.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.get(b.phase.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.phase.localeCompare(b.phase);
  });
}

function rangeFormula(range: DateRange): string {
  return `AND(DATESTR({${DATE_FIELD}}) >= '${range.from}', DATESTR({${DATE_FIELD}}) <= '${range.to}')`;
}

// For the Leads table: "No show - re-engaging the lead" records are dated by meeting_date,
// all other phases by introduction_date.
function rangeFormulaLeads(range: DateRange): string {
  const regular = `AND({${PHASE_FIELD}} != "${NO_SHOW_PHASE}", DATESTR({${DATE_FIELD}}) >= '${range.from}', DATESTR({${DATE_FIELD}}) <= '${range.to}')`;
  const noShow = `AND({${PHASE_FIELD}} = "${NO_SHOW_PHASE}", DATESTR({${MEETING_DATE_FIELD}}) >= '${range.from}', DATESTR({${MEETING_DATE_FIELD}}) <= '${range.to}')`;
  return `OR(${regular}, ${noShow})`;
}

function arieteSourceFormula(sourceField: string): string {
  // Match on linked-record primary name (Airtable formulas can't compare linked record IDs).
  // Wrap with commas so prefix collisions ("Ariete Capital" vs "Ariete Capital - Meta ads") don't false-match.
  const joined = `(',' & ARRAYJOIN({${sourceField}}, ',') & ',')`;
  const checks = ARIETE_SOURCE_NAMES.map((name) => `FIND(',${name},', ${joined})`).join(", ");
  return `OR(${checks})`;
}

function combineFormulas(...formulas: Array<string | undefined>): string | undefined {
  const parts = formulas.filter((f): f is string => Boolean(f));
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return `AND(${parts.join(", ")})`;
}

async function fetchByPhase(
  tableName: string,
  filterByFormula?: string,
  includeRecords: DisplayFields | false = false,
): Promise<ClientPhasesResult> {
  const baseUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
  const counts = new Map<string, number>();
  const records = new Map<string, AirtableClient[]>();
  let total = 0;
  let offset: string | undefined;
  let pageCount = 0;

  do {
    const params = new URLSearchParams();
    params.append("fields[]", PHASE_FIELD);
    if (includeRecords) {
      params.append("fields[]", includeRecords.name);
      params.append("fields[]", includeRecords.owner);
    }
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);

    const res = await fetch(`${baseUrl}?${params}`, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error(
        { status: res.status, table: tableName, formula: filterByFormula, body },
        "Airtable API error",
      );
      throw new Error(`Airtable API ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as AirtableListResponse;
    for (const r of json.records) {
      const phase = extractPhase(r);
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
      total += 1;
      if (includeRecords) {
        const list = records.get(phase) ?? [];
        list.push(toClient(r, includeRecords));
        records.set(phase, list);
      }
    }

    offset = json.offset;
    pageCount += 1;
  } while (offset && pageCount < 50);

  const buckets: PhaseBucket[] = Array.from(counts.entries()).map(([phase, count]) => {
    const list = records.get(phase);
    if (includeRecords && list) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { phase, count, clients: list };
    }
    return { phase, count };
  });

  return { total, buckets: sortBuckets(buckets) };
}

// Pipeline-tab queries: full data, no source filter, snapshot (current state, ignores date range).
// Returns per-phase client records so the UI can render a drill-down list.
export async function getClientsByPhase(): Promise<ClientPhasesResult> {
  return getCached("airtable:clients-by-phase:v3", CACHE_TTL.airtable, () =>
    fetchByPhase(env.AIRTABLE_CLIENTS_TABLE, undefined, CLIENTS_DISPLAY_FIELDS),
  );
}

export async function getLeadsByPhase(): Promise<ClientPhasesResult> {
  return getCached("airtable:leads-by-phase:v3", CACHE_TTL.airtable, () =>
    fetchByPhase(env.AIRTABLE_LEADS_TABLE, undefined, LEADS_DISPLAY_FIELDS),
  );
}

// Dashboard-tab summary: counts in period, filtered to Ariete-owned sources only.
async function fetchArieteSummary(range: DateRange): Promise<ArietePeriodSummary> {
  const leadsFilter = combineFormulas(rangeFormulaLeads(range), arieteSourceFormula(LEADS_SOURCE_FIELD));
  const clientsFilter = combineFormulas(rangeFormula(range), arieteSourceFormula(CLIENTS_SOURCE_FIELD));
  const [leads, clients] = await Promise.all([
    fetchByPhase(env.AIRTABLE_LEADS_TABLE, leadsFilter),
    fetchByPhase(env.AIRTABLE_CLIENTS_TABLE, clientsFilter),
  ]);

  let closedCount = 0;
  for (const b of clients.buckets) {
    if (CLOSED_SET.has(b.phase.toLowerCase())) closedCount += b.count;
  }

  return {
    leadsCount: leads.total,
    clientsCount: clients.total,
    closedCount,
    range,
  };
}

export async function getArieteSummary(range: DateRange): Promise<ArietePeriodSummary> {
  const key = `airtable:ariete-summary:${range.from}:${range.to}`;
  return getCached(key, CACHE_TTL.airtable, () => fetchArieteSummary(range));
}

// Snapshot count of all clients split by whether the linked `source` primary name
// matches one of the Ariete-owned sources. Not date-filtered.
const SOURCE_LOOKUP_FIELD = "source (from source)";
const ARIETE_SOURCE_SET = new Set(ARIETE_SOURCE_NAMES.map((s) => s.toLowerCase()));

async function fetchClientsBreakdown(): Promise<ClientsBreakdown> {
  const baseUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(env.AIRTABLE_CLIENTS_TABLE)}`;
  let total = 0;
  let direct = 0;
  let offset: string | undefined;
  let pageCount = 0;

  do {
    const params = new URLSearchParams();
    params.append("fields[]", SOURCE_LOOKUP_FIELD);
    params.set("pageSize", "100");
    if (offset) params.set("offset", offset);

    const res = await fetch(`${baseUrl}?${params}`, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error(
        { status: res.status, table: env.AIRTABLE_CLIENTS_TABLE, body },
        "Airtable API error (clients breakdown)",
      );
      throw new Error(`Airtable API ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as AirtableListResponse;
    for (const r of json.records) {
      total += 1;
      const raw = r.fields[SOURCE_LOOKUP_FIELD];
      if (Array.isArray(raw)) {
        const isDirect = raw.some(
          (v) => typeof v === "string" && ARIETE_SOURCE_SET.has(v.trim().toLowerCase()),
        );
        if (isDirect) direct += 1;
      }
    }

    offset = json.offset;
    pageCount += 1;
  } while (offset && pageCount < 50);

  return { total, direct, fromAgents: total - direct };
}

export async function getClientsBreakdown(): Promise<ClientsBreakdown> {
  return getCached("airtable:clients-breakdown", CACHE_TTL.airtable, fetchClientsBreakdown);
}

// Per-stage milestone counts for the end-to-end funnel, Ariete-source-filtered, in range.
//   loiSigned: leads currently at "LOI Signed" + every client (being in Clients table
//              means LOI was already signed at some point)
//   onboardingFeePaid: clients at phases [Onboarding fee paid, Fee at Nulla osta,
//                       Investment executed]
//   investmentExecuted: clients at "Investment executed"
export interface ArieteFunnelStages {
  loiSigned: number;
  onboardingFeePaid: number;
  investmentExecuted: number;
}

async function fetchArieteFunnelStages(range: DateRange): Promise<ArieteFunnelStages> {
  const leadsFilter = combineFormulas(rangeFormulaLeads(range), arieteSourceFormula(LEADS_SOURCE_FIELD));
  const clientsFilter = combineFormulas(rangeFormula(range), arieteSourceFormula(CLIENTS_SOURCE_FIELD));
  const [leads, clients] = await Promise.all([
    fetchByPhase(env.AIRTABLE_LEADS_TABLE, leadsFilter),
    fetchByPhase(env.AIRTABLE_CLIENTS_TABLE, clientsFilter),
  ]);

  const leadsAtLoi = leads.buckets.find((b) => b.phase === "LOI Signed")?.count ?? 0;
  const onboardingSet = new Set(ONBOARDING_FEE_PAID_PHASES);
  const onboardingFeePaid = clients.buckets
    .filter((b) => onboardingSet.has(b.phase))
    .reduce((sum, b) => sum + b.count, 0);
  const investmentExecuted =
    clients.buckets.find((b) => b.phase === INVESTMENT_EXECUTED_PHASE)?.count ?? 0;

  return {
    loiSigned: leadsAtLoi + clients.total,
    onboardingFeePaid,
    investmentExecuted,
  };
}

export async function getArieteFunnelStages(range: DateRange): Promise<ArieteFunnelStages> {
  const key = `airtable:ariete-funnel:${range.from}:${range.to}`;
  return getCached(key, CACHE_TTL.airtable, () => fetchArieteFunnelStages(range));
}

export async function getNoShowCount(range: DateRange): Promise<number> {
  const key = `airtable:no-show-count:${range.from}:${range.to}`;
  return getCached(key, CACHE_TTL.airtable, async () => {
    const formula = combineFormulas(
      `AND({${PHASE_FIELD}} = "${NO_SHOW_PHASE}", DATESTR({${MEETING_DATE_FIELD}}) >= '${range.from}', DATESTR({${MEETING_DATE_FIELD}}) <= '${range.to}')`,
      arieteSourceFormula(LEADS_SOURCE_FIELD),
    );
    const result = await fetchByPhase(env.AIRTABLE_LEADS_TABLE, formula);
    return result.total;
  });
}

