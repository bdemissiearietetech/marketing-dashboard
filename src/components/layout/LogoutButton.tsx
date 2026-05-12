"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { logoutAction } from "@/app/[locale]/login/logout";

export function LogoutButton() {
  const t = useTranslations("header");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await logoutAction();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-md px-2 h-8 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
      aria-label={t("logout")}
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">{t("logout")}</span>
    </button>
  );
}
