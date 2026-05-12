import { getTranslations, getLocale } from "next-intl/server";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "./KpiCard";
import { PhasesList } from "./PhasesList";
import { SectionError } from "./SectionError";
import { getLeadsByPhase } from "@/server/queries/airtable-clients";
import { formatNumber } from "@/lib/format";

export async function LeadsPhasesSection() {
  const t = await getTranslations("leads");
  const tErr = await getTranslations("errors");
  const locale = await getLocale();

  let data;
  try {
    data = await getLeadsByPhase();
  } catch (err) {
    return (
      <section className="space-y-3">
        <CardHeader className="px-0">
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <SectionError title={tErr("fetchFailed")} message={(err as Error).message} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label={t("kpis.total")} value={formatNumber(data.total, locale)} />
      </div>

      {data.buckets.length === 0 ? (
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          {t("chart.noData")}
        </div>
      ) : (
        <PhasesList buckets={data.buckets} total={data.total} locale={locale} />
      )}
    </section>
  );
}
