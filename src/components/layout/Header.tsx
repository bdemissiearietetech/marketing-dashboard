import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const t = useTranslations("app");
  const tHeader = useTranslations("header");

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">{t("title")}</span>
          <span className="text-xs text-muted-foreground">{t("subtitle")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/setup"
            className="inline-flex items-center gap-1.5 rounded-md px-2 h-8 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label={tHeader("setup")}
          >
            <Settings className="size-4" />
            <span className="hidden sm:inline">{tHeader("setup")}</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
