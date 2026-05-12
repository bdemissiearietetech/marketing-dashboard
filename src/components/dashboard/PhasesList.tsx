"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { getPhaseMeta } from "@/lib/constants";
import type { PhaseGroup } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { AirtableClient, PhaseBucket } from "@/types/airtable";

// Sequential ramp by pipeline depth. pre-loi → slate, post-loi → amber, terminal → no hue.
const GROUP_BORDER: Record<PhaseGroup, string> = {
  "pre-loi": "border-l-2 border-slate-400/70 dark:border-slate-500/70",
  "post-loi": "border-l-2 border-amber-500/70 dark:border-amber-400/70",
  terminal: "border-l-2 border-transparent",
};

const GROUP_NUMBER: Record<PhaseGroup, string> = {
  "pre-loi": "text-slate-500 dark:text-slate-400",
  "post-loi": "text-amber-600 dark:text-amber-400",
  terminal: "text-muted-foreground/60",
};

interface PhasesListProps {
  buckets: PhaseBucket[];
  total: number;
  locale: string;
}

export function PhasesList({ buckets, total, locale }: PhasesListProps) {
  const t = useTranslations("phasesList");
  const [openPhase, setOpenPhase] = useState<string | null>(null);

  if (buckets.length === 0) return null;

  return (
    <ul className="divide-y divide-border rounded-md border bg-card">
      {buckets.map((b) => {
        const meta = getPhaseMeta(b.phase);
        const pct = total > 0 ? (b.count / total) * 100 : 0;
        const num = meta?.number ?? null;
        const group: PhaseGroup = meta?.group ?? "terminal";
        const isTerminal = group === "terminal";
        const hasClients = (b.clients?.length ?? 0) > 0;
        const isOpen = openPhase === b.phase;

        return (
          <li key={b.phase} className={GROUP_BORDER[group]}>
            <button
              type="button"
              onClick={() => setOpenPhase(isOpen ? null : b.phase)}
              disabled={!hasClients}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left disabled:cursor-default disabled:hover:bg-transparent"
            >
              <ChevronRight
                className={`flex-shrink-0 size-3.5 text-muted-foreground/50 transition-transform ${
                  isOpen ? "rotate-90" : ""
                } ${hasClients ? "" : "invisible"}`}
              />
              <span
                className={`flex-shrink-0 w-9 text-center font-mono text-xs tabular-nums ${GROUP_NUMBER[group]}`}
              >
                {num !== null ? String(num).padStart(2, "0") : "—"}
              </span>
              <span
                className={`flex-1 truncate ${
                  isTerminal ? "text-muted-foreground italic" : "text-foreground"
                }`}
              >
                {b.phase}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                {pct.toFixed(0)}%
              </span>
              <span className="font-semibold tabular-nums w-12 text-right">
                {formatNumber(b.count, locale)}
              </span>
            </button>

            {isOpen && hasClients && (
              <ClientList clients={b.clients!} locale={locale} emptyLabel={t("noClients")} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ClientList({
  clients,
  locale,
  emptyLabel,
}: {
  clients: AirtableClient[];
  locale: string;
  emptyLabel: string;
}) {
  if (clients.length === 0) {
    return (
      <div className="px-12 py-2 text-xs text-muted-foreground italic">{emptyLabel}</div>
    );
  }
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return (
    <ul className="bg-muted/20 border-t border-border">
      {clients.map((c) => {
        let dateLabel = "";
        try {
          dateLabel = fmt.format(new Date(c.createdAt));
        } catch {
          dateLabel = c.createdAt.slice(0, 10);
        }
        return (
          <li
            key={c.id}
            className="flex items-center gap-3 pl-16 pr-4 py-1.5 text-xs"
          >
            <span className="flex-1 truncate text-foreground">{c.name}</span>
            {c.owner && (
              <span className="text-muted-foreground truncate max-w-[40%]">{c.owner}</span>
            )}
            <span className="text-muted-foreground tabular-nums whitespace-nowrap">
              {dateLabel}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
