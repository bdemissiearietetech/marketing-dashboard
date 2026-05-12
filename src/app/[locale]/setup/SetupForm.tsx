"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTargetCacAction } from "./actions";

interface SetupFormProps {
  initialTargetCac: number | null;
}

export function SetupForm({ initialTargetCac }: SetupFormProps) {
  const t = useTranslations("setup");
  const [value, setValue] = useState(
    initialTargetCac !== null ? String(initialTargetCac) : "",
  );

  const { execute, isExecuting, result } = useAction(updateTargetCacAction);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      return;
    }
    execute({ targetCac: parsed });
  }

  const saved = result.data?.settings !== undefined;
  const errorMessage = result.serverError ?? result.validationErrors?._errors?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("targetCac.title")}</CardTitle>
        <CardDescription>{t("targetCac.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="targetCac">{t("targetCac.label")}</Label>
            <Input
              id="targetCac"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("targetCac.placeholder")}
            />
            <p className="text-xs text-muted-foreground">{t("targetCac.hint")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isExecuting}>
              {isExecuting ? t("saving") : t("save")}
            </Button>
            {saved && !errorMessage && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {t("saved")}
              </span>
            )}
            {errorMessage && (
              <span className="text-xs text-rose-600 dark:text-rose-400">{errorMessage}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
