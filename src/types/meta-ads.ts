export interface MetaCampaignRow {
  campaignId: string;
  campaignName: string;
  spend: number;
  leads: number;
  cpl: number | null;
}

export interface MetaInsightsResult {
  totalSpend: number;
  totalLeads: number;
  cpl: number | null;
  campaigns: MetaCampaignRow[];
  currency: string | null;
  range: { from: string; to: string };
}

export interface MetaDailyPoint {
  date: string;
  spend: number;
  leads: number;
}

export interface MetaDailyResult {
  points: MetaDailyPoint[];
  currency: string | null;
  range: { from: string; to: string };
}
