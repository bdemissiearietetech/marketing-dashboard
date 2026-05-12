import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";

const ENTRIES = [
  { key: "leads", scope: "snapshot" },
  { key: "clientsDirect", scope: "snapshot" },
  { key: "clientsFromAgents", scope: "snapshot" },
  { key: "clientsAll", scope: "snapshot" },
  { key: "spend", scope: "hero" },
  { key: "metaLeads", scope: "hero" },
  { key: "cpl", scope: "hero" },
  { key: "cac", scope: "hero" },
] as const;

export async function MetricsLegend() {
  const t = await getTranslations("legend");
  const tHero = await getTranslations("hero");
  const tSnapshot = await getTranslations("snapshot");

  return (
    <details className="group rounded-md border bg-card">
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium select-none list-none [&::-webkit-details-marker]:hidden">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span>{t("title")}</span>
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">+</span>
        <span className="ml-auto text-xs text-muted-foreground hidden group-open:inline">−</span>
      </summary>
      <dl className="border-t border-border divide-y divide-border text-sm">
        {ENTRIES.map(({ key, scope }) => (
          <div
            key={key}
            className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 px-4 py-3"
          >
            <dt className="font-medium text-foreground">
              {scope === "hero" ? tHero(key) : tSnapshot(key)}
            </dt>
            <dd className="text-muted-foreground">{t(key)}</dd>
          </div>
        ))}
        <div className="px-4 py-3 text-xs text-muted-foreground italic">{t("cohortNote")}</div>
      </dl>
    </details>
  );
}
