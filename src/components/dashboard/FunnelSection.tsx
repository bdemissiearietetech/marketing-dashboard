import { getTranslations, getLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionError } from "./SectionError";
import { getFunnel, type FunnelStage } from "@/server/queries/funnel";
import { formatNumber, formatPercent } from "@/lib/format";
import type { DateRange } from "@/lib/date-range";

interface FunnelSectionProps {
  range: DateRange;
}

export async function FunnelSection({ range }: FunnelSectionProps) {
  const t = await getTranslations("funnel");
  const tErr = await getTranslations("errors");
  const locale = await getLocale();

  let data;
  try {
    data = await getFunnel(range);
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

  const stagesWithRates = computeRates(data.stages);

  return (
    <section className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <div className="rounded-md border bg-card p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
          {stagesWithRates.map((s, i) => (
            <FunnelStageBlock
              key={s.key}
              label={t(`stages.${s.key}`)}
              count={s.count}
              convFromPrev={s.convFromPrev}
              convFromTop={s.convFromTop}
              convFromTopLabel={s.convFromTopLabel}
              locale={locale}
              isFirst={i === 0}
              borderClass={STAGE_BORDER[s.key]}
            />
          ))}
        </div>
      </div>

      {data.warnings.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {data.warnings.map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface StageWithRates extends FunnelStage {
  convFromPrev: number | null;
  convFromTop: number | null;
  convFromTopLabel: string;
}

// Sequential ramp: cool (slate) at the top of funnel → warm (amber) → emerald at the bottom.
// Encodes "how far down" so the operator parses the funnel left-to-right by hue.
const STAGE_BORDER: Record<FunnelStage["key"], string> = {
  metaLeads: "border-l-2 border-slate-400/70 dark:border-slate-500/70",
  booked: "border-l-2 border-slate-500/70 dark:border-slate-400/70",
  attended: "border-l-2 border-violet-400/70 dark:border-violet-300/70",
  loi: "border-l-2 border-amber-400/70 dark:border-amber-300/70",
  onboardingFee: "border-l-2 border-amber-500/80 dark:border-amber-400/80",
  investmentExecuted: "border-l-2 border-emerald-500/80 dark:border-emerald-400/80",
};

function computeRates(stages: FunnelStage[]): StageWithRates[] {
  const top = stages[0]?.count ?? null;
  const booked = stages.find((s) => s.key === "booked")?.count ?? null;
  return stages.map((s, i) => {
    const prev = i > 0 ? stages[i - 1].count : null;
    const convFromPrev =
      s.count !== null && prev !== null && prev > 0 ? s.count / prev : null;
    // attended is compared against booked, not top of funnel
    const denominator = s.key === "attended" ? booked : top;
    const convFromTop =
      i === 0
        ? null
        : s.count !== null && denominator !== null && denominator > 0
          ? s.count / denominator
          : null;
    const convFromTopLabel = s.key === "attended" ? "of booked" : "of top";
    return { ...s, convFromPrev, convFromTop, convFromTopLabel };
  });
}

interface StageProps {
  label: string;
  count: number | null;
  convFromPrev: number | null;
  convFromTop: number | null;
  convFromTopLabel: string;
  locale: string;
  isFirst: boolean;
  borderClass: string;
}

function FunnelStageBlock({
  label,
  count,
  convFromPrev,
  convFromTop,
  convFromTopLabel,
  locale,
  isFirst,
  borderClass,
}: StageProps) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {!isFirst && (
        <div className="flex flex-col items-center text-[10px] text-muted-foreground tabular-nums whitespace-nowrap px-1">
          <ChevronRight className="size-3 hidden lg:block" />
          <span>
            {convFromPrev !== null ? formatPercent(convFromPrev, locale, { digits: 0 }) : "—"}
          </span>
        </div>
      )}
      <div className={`flex-1 min-w-0 rounded-md border bg-background px-3 py-2 ${borderClass}`}>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </div>
        <div className="text-xl font-semibold tabular-nums">
          {count !== null ? formatNumber(count, locale) : "—"}
        </div>
        {convFromTop !== null && (
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {formatPercent(convFromTop, locale, { digits: 1 })} {convFromTopLabel}
          </div>
        )}
      </div>
    </div>
  );
}
