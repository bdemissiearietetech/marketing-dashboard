"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="border-destructive/30">
        <CardContent className="py-8 flex flex-col items-center text-center gap-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <div className="font-semibold">{t("fetchFailed")}</div>
            <div className="text-sm text-muted-foreground mt-1 break-all">{error.message}</div>
          </div>
          <Button onClick={reset}>{t("tryAgain")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
