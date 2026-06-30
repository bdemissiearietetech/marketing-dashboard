import { getMetaInsights } from "@/server/queries/meta-ads";
import { getBookedCalls } from "@/server/queries/calendly";
import { getNoShowCount } from "@/server/queries/airtable-clients";
import { defaultRange } from "@/lib/date-range";
import { NotificationsTab } from "./NotificationsTab";

export async function NotificationsSection() {
  const range = defaultRange();

  const [meta, calendar, noShowCount] = await Promise.allSettled([
    getMetaInsights(range),
    getBookedCalls(range),
    getNoShowCount(range),
  ]);

  const cpl = meta.status === "fulfilled" ? meta.value.cpl : null;
  const currency = meta.status === "fulfilled" ? meta.value.currency : null;

  let showRate: number | null = null;
  if (calendar.status === "fulfilled" && noShowCount.status === "fulfilled") {
    const cal = calendar.value;
    const attended = Math.max(0, cal.pastBooked - noShowCount.value);
    showRate = cal.pastBooked > 0 ? attended / cal.pastBooked : null;
  }

  return <NotificationsTab cpl={cpl} showRate={showRate} currency={currency} />;
}
