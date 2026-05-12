import { getTranslations } from "next-intl/server";
import { getSettings } from "@/server/queries/settings";
import { SetupForm } from "./SetupForm";

export default async function SetupPage() {
  const t = await getTranslations("setup");
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <SetupForm initialTargetCac={settings.targetCac} />
    </div>
  );
}
