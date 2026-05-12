"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction } from "./actions";

interface LoginFormProps {
  from?: string;
}

export function LoginForm({ from }: LoginFormProps) {
  const t = useTranslations("login");
  const router = useRouter();
  const [password, setPassword] = useState("");

  const { execute, isExecuting, result } = useAction(loginAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        const next = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
        router.replace(next);
        router.refresh();
      }
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password) return;
    execute({ password });
  }

  const invalid = result.data?.ok === false;
  const serverError = result.serverError ?? result.validationErrors?._errors?.[0];

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("label")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isExecuting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isExecuting || !password}>
            {isExecuting ? t("submitting") : t("submit")}
          </Button>
          {invalid && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{t("invalid")}</p>
          )}
          {serverError && !invalid && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{serverError}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
