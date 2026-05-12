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


