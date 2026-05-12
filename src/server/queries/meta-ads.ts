import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCached } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";
import type {
  MetaCampaignRow,
  MetaDailyPoint,
  MetaDailyResult,
  MetaInsightsResult,
} from "@/types/meta-ads";
import type { DateRange } from "@/lib/date-range";

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  spend?: string;
  actions?: MetaAction[];
  account_currency?: string;
}

interface MetaDailyRow {
  date_start: string;
  spend?: string;
  actions?: MetaAction[];
  account_currency?: string;
}

interface MetaInsightsResponse<T> {
  data: T[];
  paging?: { next?: string };
}

const LEAD_ACTION_TYPES = new Set([
  "lead",
  "leadgen.other",
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.lead_grouped",
]);

function sumLeads(actions?: MetaAction[]): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (LEAD_ACTION_TYPES.has(a.action_type)) {
      const v = Number(a.value);
      if (Number.isFinite(v)) total += v;
    }
  }
  return total;
}

async function fetchInsights(range: DateRange): Promise<MetaInsightsResult> {
  const params = new URLSearchParams({
    level: "campaign",
    fields: "campaign_id,campaign_name,spend,actions,account_currency",
    time_range: JSON.stringify({ since: range.from, until: range.to }),
    limit: "100",
    access_token: env.META_ACCESS_TOKEN,
  });

  const accountId = env.META_AD_ACCOUNT_ID.replace(/^act_/, "");
  let url: string | undefined =
    `https://graph.facebook.com/${env.META_API_VERSION}/act_${accountId}/insights?${params}`;

  const rows: MetaInsightRow[] = [];
  let currency: string | null = null;
  let pageCount = 0;

  while (url && pageCount < 20) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Meta Ads API error");
      throw new Error(`Meta Ads API ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as MetaInsightsResponse<MetaInsightRow>;
    rows.push(...json.data);
    if (!currency && json.data[0]?.account_currency) currency = json.data[0].account_currency;
    url = json.paging?.next;
    pageCount += 1;
  }

  const campaigns: MetaCampaignRow[] = rows.map((r) => {
    const spend = Number(r.spend ?? "0");
    const leads = sumLeads(r.actions);
    return {
      campaignId: r.campaign_id,
      campaignName: r.campaign_name,
      spend: Number.isFinite(spend) ? spend : 0,
      leads,
      cpl: leads > 0 ? spend / leads : null,
    };
  });

  campaigns.sort((a, b) => b.spend - a.spend);

  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, 0);

  return {
    totalSpend,
    totalLeads,
    cpl: totalLeads > 0 ? totalSpend / totalLeads : null,
    campaigns,
    currency,
    range,
  };
}

export async function getMetaInsights(range: DateRange): Promise<MetaInsightsResult> {
  const key = `meta-ads:${range.from}:${range.to}`;
  return getCached(key, CACHE_TTL.metaAds, () => fetchInsights(range));
}

async function fetchDaily(range: DateRange): Promise<MetaDailyResult> {
  const params = new URLSearchParams({
    level: "account",
    fields: "spend,actions,account_currency",
    time_range: JSON.stringify({ since: range.from, until: range.to }),
    time_increment: "1",
    limit: "500",
    access_token: env.META_ACCESS_TOKEN,
  });

  const accountId = env.META_AD_ACCOUNT_ID.replace(/^act_/, "");
  let url: string | undefined =
    `https://graph.facebook.com/${env.META_API_VERSION}/act_${accountId}/insights?${params}`;

  const rows: MetaDailyRow[] = [];
  let currency: string | null = null;
  let pageCount = 0;

  while (url && pageCount < 20) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Meta Ads daily API error");
      throw new Error(`Meta Ads API ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as MetaInsightsResponse<MetaDailyRow>;
    rows.push(...json.data);
    if (!currency && json.data[0]?.account_currency) currency = json.data[0].account_currency;
    url = json.paging?.next;
    pageCount += 1;
  }

  const points: MetaDailyPoint[] = rows
    .map((r) => {
      const spend = Number(r.spend ?? "0");
      return {
        date: r.date_start,
        spend: Number.isFinite(spend) ? spend : 0,
        leads: sumLeads(r.actions),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { points, currency, range };
}

export async function getMetaInsightsDaily(range: DateRange): Promise<MetaDailyResult> {
  const key = `meta-ads-daily:${range.from}:${range.to}`;
  return getCached(key, CACHE_TTL.metaAds, () => fetchDaily(range));
}
