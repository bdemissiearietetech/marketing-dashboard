import { getTranslations, getLocale } from "next-intl/server";
import { KpiCard } from "./KpiCard";
import { SectionError } from "./SectionError";
import { getClientsBreakdown, getLeadsByPhase } from "@/server/queries/airtable-clients";
import { formatNumber } from "@/lib/format";

export async function SnapshotStats() {
  const t = await getTranslations("snapshot");
  const tErr = await getTranslations("errors");
  const locale = await getLocale();

  let leads, clients;
  try {
    [leads, clients] = await Promise.all([getLeadsByPhase(), getClientsBreakdown()]);
  } catch (err) {
    return <SectionError title={tErr("fetchFailed")} message={(err as Error).message} />;
  }

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label={t("leads")} value={formatNumber(leads.total, locale)} />
      <KpiCard label={t("clientsDirect")} value={formatNumber(clients.direct, locale)} />
      <KpiCard label={t("clientsFromAgents")} value={formatNumber(clients.fromAgents, locale)} />
      <KpiCard label={t("clientsAll")} value={formatNumber(clients.total, locale)} />
    </section>
  );
}
