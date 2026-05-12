import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";

export function Header() {
  const t = useTranslations("app");
  const showLogout = Boolean(process.env.DASHBOARD_PASSWORD);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">{t("title")}</span>
          <span className="text-xs text-muted-foreground">{t("subtitle")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {showLogout && <LogoutButton />}
        </div>
      </div>
    </header>
  );
}
