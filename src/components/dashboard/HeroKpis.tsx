import { getTranslations, getLocale } from "next-intl/server";
import { SectionError } from "./SectionError";
import { KpiCard } from "./KpiCard";
import { getMetaInsights } from "@/server/queries/meta-ads";
import { getArieteSummary } from "@/server/queries/airtable-clients";
import { getSettings } from "@/server/queries/settings";
import { previousRange, type DateRange } from "@/lib/date-range";
import { computeDelta, formatMoney, formatNumber, formatPercent } from "@/lib/format";

interface HeroKpisProps {
  range: DateRange;
}

export async function HeroKpis({ range }: HeroKpisProps) {
  const t = await getTranslations("hero");
  const tErr = await getTranslations("errors");
  const locale = await getLocale();
  const prev = previousRange(range);

  let metaCurrent, metaPrev, summaryCurrent, summaryPrev, settings;
  try {
    [metaCurrent, metaPrev, summaryCurrent, summaryPrev, settings] = await Promise.all([
      getMetaInsights(range),
      getMetaInsights(prev),
      getArieteSummary(range),
      getArieteSummary(prev),
      getSettings(),
    ]);
  } catch (err) {
    return <SectionError title={tErr("fetchFailed")} message={(err as Error).message} />;
  }

  const currency = metaCurrent.currency;

  const cacCurrent =
    summaryCurrent.closedCount > 0 ? metaCurrent.totalSpend / summaryCurrent.closedCount : null;
  const cacPrev =
    summaryPrev.closedCount > 0 ? metaPrev.totalSpend / summaryPrev.closedCount : null;

  const deltas = {
    spend: computeDelta(metaCurrent.totalSpend, metaPrev.totalSpend),
    metaLeads: computeDelta(metaCurrent.totalLeads, metaPrev.totalLeads),
    cpl:
      metaCurrent.cpl !== null && metaPrev.cpl !== null
        ? computeDelta(metaCurrent.cpl, metaPrev.cpl)
        : null,
    cac: cacCurrent !== null && cacPrev !== null ? computeDelta(cacCurrent, cacPrev) : null,
  };

  const deltaLabel = t("vsPrevious");

  const cacHint = renderCacHint({
    target: settings.targetCac,
    actual: cacCurrent,
    currency,
    locale,
    targetLabel: t("targetCac"),
    vsTargetLabel: t("vsCacTarget"),
  });

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label={t("spend")}
        value={formatMoney(metaCurrent.totalSpend, currency, locale)}
        delta={deltas.spend}
        deltaLabel={deltaLabel}
        locale={locale}
      />
      <KpiCard
        label={t("metaLeads")}
        value={formatNumber(metaCurrent.totalLeads, locale)}
        delta={deltas.metaLeads}
        deltaLabel={deltaLabel}
        locale={locale}
      />
      <KpiCard
        label={t("cpl")}
        value={metaCurrent.cpl !== null ? formatMoney(metaCurrent.cpl, currency, locale) : "—"}
        delta={deltas.cpl}
        deltaLabel={deltaLabel}
        invertDelta
        locale={locale}
      />
      <KpiCard
        label={t("cac")}
        value={cacCurrent !== null ? formatMoney(cacCurrent, currency, locale) : "—"}
        delta={cacHint ? undefined : deltas.cac}
        deltaLabel={cacHint ? undefined : deltaLabel}
        invertDelta
        hint={cacHint ?? undefined}
        locale={locale}
      />
    </section>
  );
}

interface CacHintArgs {
  target: number | null;
  actual: number | null;
  currency: string | null;
  locale: string;
  targetLabel: string;
  vsTargetLabel: string;
}

function renderCacHint({
  target,
  actual,
  currency,
  locale,
  targetLabel,
  vsTargetLabel,
}: CacHintArgs): React.ReactNode | null {
  if (target === null || target <= 0) return null;
  const targetStr = formatMoney(target, currency, locale);
  if (actual === null) {
    return (
      <span className="text-xs text-muted-foreground mt-1 block">
        {targetLabel}: {targetStr}
      </span>
    );
  }
  const delta = (actual - target) / target;
  const isFlat = Math.abs(delta) < 0.0005;
  const isUnder = delta < 0;
  const colorClass = isFlat
    ? "text-muted-foreground"
    : isUnder
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  return (
    <span className="text-xs mt-1 block tabular-nums">
      <span className="text-muted-foreground">{targetLabel}: </span>
      <span className="text-foreground">{targetStr}</span>
      <span className={`ml-2 ${colorClass}`}>
        {formatPercent(delta, locale, { signed: true })} {vsTargetLabel}
      </span>
    </span>
  );
}
