import { getTranslations, getLocale } from "next-intl/server";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionError } from "./SectionError";
import { getCohortAnalysis, type CohortRow } from "@/server/queries/cohorts";
import { getSettings } from "@/server/queries/settings";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";

const MONTHS_BACK = 6;

export async function CohortSection() {
  const t = await getTranslations("cohorts");
  const tErr = await getTranslations("errors");
  const locale = await getLocale();

  let data, settings;
  try {
    [data, settings] = await Promise.all([getCohortAnalysis(MONTHS_BACK), getSettings()]);
  } catch (err) {
    return (
      <section className="space-y-3">
        <CardHeader className="px-0">
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <SectionError title={tErr("fetchFailed")} message={(err as Error).message} />
      </section>
    );
  }

  const monthFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short" });

  return (
    <section className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{t("col.month")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("col.cohort")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("col.loi")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("col.onboarding")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("col.invested")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("col.spend")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("col.realizedCac")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.rows.map((r) => (
              <CohortTableRow
                key={r.month}
                row={r}
                monthLabel={formatMonth(r.month, monthFmt)}
                currency={data.currency}
                targetCac={settings.targetCac}
                locale={locale}
                pctOf={t("of")}
              />
            ))}
          </tbody>
        </table>
      </div>

      {data.warnings.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {data.warnings.map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground italic">{t("maturationNote")}</p>
    </section>
  );
}

interface RowProps {
  row: CohortRow;
  monthLabel: string;
  currency: string | null;
  targetCac: number | null;
  locale: string;
  pctOf: string;
}

function CohortTableRow({ row, monthLabel, currency, targetCac, locale }: RowProps) {
  const loiPct = row.cohortSize > 0 ? row.loiCount / row.cohortSize : null;
  const onbPct = row.cohortSize > 0 ? row.onboardingCount / row.cohortSize : null;
  const invPct = row.cohortSize > 0 ? row.investedCount / row.cohortSize : null;

  const realizedCacClass = pickCacClass(row.realizedCac, targetCac);

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-2 font-medium tabular-nums whitespace-nowrap">{monthLabel}</td>
      <td className="px-4 py-2 text-right tabular-nums">{formatNumber(row.cohortSize, locale)}</td>
      <td className="px-4 py-2 text-right tabular-nums">
        <PctCell count={row.loiCount} pct={loiPct} locale={locale} />
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        <PctCell count={row.onboardingCount} pct={onbPct} locale={locale} />
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        <PctCell count={row.investedCount} pct={invPct} locale={locale} />
      </td>
      <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">
        {row.spend > 0 ? formatMoney(row.spend, currency, locale) : "—"}
      </td>
      <td className={`px-4 py-2 text-right tabular-nums whitespace-nowrap font-medium ${realizedCacClass}`}>
        {row.realizedCac !== null ? formatMoney(row.realizedCac, currency, locale) : "—"}
      </td>
    </tr>
  );
}

function PctCell({
  count,
  pct,
  locale,
}: {
  count: number;
  pct: number | null;
  locale: string;
}) {
  return (
    <span>
      {formatNumber(count, locale)}
      {pct !== null && count > 0 && (
        <span className="ml-1 text-xs text-muted-foreground">
          ({formatPercent(pct, locale, { digits: 0 })})
        </span>
      )}
    </span>
  );
}

function pickCacClass(realized: number | null, target: number | null): string {
  if (realized === null) return "text-muted-foreground";
  if (target === null || target <= 0) return "text-foreground";
  return realized <= target
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

function formatMonth(month: string, fmt: Intl.DateTimeFormat): string {
  // month is "YYYY-MM" — build a date at the 1st of that month for formatting.
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return fmt.format(new Date(y, m - 1, 1));
}
