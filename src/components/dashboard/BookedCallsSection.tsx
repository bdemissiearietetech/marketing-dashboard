import { getTranslations, getLocale } from "next-intl/server";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "./KpiCard";
import { SectionError } from "./SectionError";
import { getBookedCalls } from "@/server/queries/calendly";
import { getMetaInsights } from "@/server/queries/meta-ads";
import { formatMoney, formatNumber } from "@/lib/format";
import type { DateRange } from "@/lib/date-range";

interface BookedCallsSectionProps {
  range: DateRange;
}

export async function BookedCallsSection({ range }: BookedCallsSectionProps) {
  const t = await getTranslations("calendar");
  const tErr = await getTranslations("errors");
  const locale = await getLocale();

  let calendar, meta;
  try {
    [calendar, meta] = await Promise.all([getBookedCalls(range), getMetaInsights(range)]);
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

  const costPerBooked = calendar.booked > 0 ? meta.totalSpend / calendar.booked : null;
  const upcoming = calendar.booked - calendar.pastBooked;

  const bookedHint =
    upcoming > 0
      ? t("hints.upcoming", { count: upcoming })
      : null;

  return (
    <section className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={t("kpis.booked")}
          value={formatNumber(calendar.booked, locale)}
          hint={bookedHint ?? undefined}
          tone="engagement"
        />
        <KpiCard
          label={t("kpis.attended")}
          value="—"
          tone="engagement"
        />
        <KpiCard
          label={t("kpis.costPerBooked")}
          value={costPerBooked !== null ? formatMoney(costPerBooked, meta.currency, locale) : "—"}
          tone="engagement"
        />
        <KpiCard
          label={t("kpis.costPerAttended")}
          value="—"
          tone="engagement"
        />
      </div>

    </section>
  );
}
