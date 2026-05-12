import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionError } from "./SectionError";
import { TrendChart } from "./TrendChart";
import { getMetaInsightsDaily } from "@/server/queries/meta-ads";
import type { DateRange } from "@/lib/date-range";

interface TrendSectionProps {
  range: DateRange;
}

export async function TrendSection({ range }: TrendSectionProps) {
  const t = await getTranslations("trend");
  const tErr = await getTranslations("errors");
  const locale = await getLocale();

  let data;
  try {
    data = await getMetaInsightsDaily(range);
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
      <Card>
        <CardContent className="p-4">
          {data.points.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">{t("noData")}</div>
          ) : (
            <TrendChart
              points={data.points}
              spendLabel={t("spend")}
              leadsLabel={t("leads")}
              currency={data.currency}
              locale={locale}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
