"use client";

import { useMemo, useState } from "react";
import { useQueryStates, parseAsString } from "nuqs";
import { useTranslations } from "next-intl";
import { format, parse, startOfDay, startOfMonth, subDays, subMonths, endOfMonth, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DEFAULT_RANGE_DAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DATE_FORMAT = "yyyy-MM-dd";

function fmt(d: Date): string {
  return format(d, DATE_FORMAT);
}
function parseDate(s: string): Date | null {
  const d = parse(s, DATE_FORMAT, new Date());
  return isValid(d) ? d : null;
}
function defaults() {
  const today = startOfDay(new Date());
  return { from: fmt(subDays(today, DEFAULT_RANGE_DAYS - 1)), to: fmt(today) };
}

interface Preset {
  key: string;
  build: () => { from: string; to: string };
}

function buildPresets(): Preset[] {
  const today = startOfDay(new Date());
  return [
    { key: "7d", build: () => ({ from: fmt(subDays(today, 6)), to: fmt(today) }) },
    { key: "30d", build: () => ({ from: fmt(subDays(today, 29)), to: fmt(today) }) },
    { key: "90d", build: () => ({ from: fmt(subDays(today, 89)), to: fmt(today) }) },
    {
      key: "thisMonth",
      build: () => ({ from: fmt(startOfMonth(today)), to: fmt(today) }),
    },
    {
      key: "lastMonth",
      build: () => {
        const lastMonth = subMonths(today, 1);
        return { from: fmt(startOfMonth(lastMonth)), to: fmt(endOfMonth(lastMonth)) };
      },
    },
  ];
}

export function DateRangePicker() {
  const t = useTranslations("filters");
  const def = defaults();
  const today = startOfDay(new Date());

  const [{ from, to }, setRange] = useQueryStates(
    {
      from: parseAsString.withDefault(def.from),
      to: parseAsString.withDefault(def.to),
    },
    { shallow: false, throttleMs: 200 },
  );

  const [open, setOpen] = useState(false);

  const presets = useMemo(() => buildPresets(), []);

  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const selected: DateRange | undefined =
    fromDate && toDate ? { from: fromDate, to: toDate } : undefined;

  const buttonLabel = (() => {
    if (!fromDate || !toDate) return t("dateRange");
    return `${format(fromDate, "MMM d, yyyy")} — ${format(toDate, "MMM d, yyyy")}`;
  })();

  const apply = (next: { from: string; to: string }) => {
    // clamp + reorder to keep things coherent (no future, from <= to)
    const f = parseDate(next.from) ?? today;
    const tt = parseDate(next.to) ?? today;
    const clampedFrom = f > today ? today : f;
    const clampedTo = tt > today ? today : tt;
    const [start, end] = clampedFrom <= clampedTo ? [clampedFrom, clampedTo] : [clampedTo, clampedFrom];
    setRange({ from: fmt(start), to: fmt(end) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "h-9 justify-start gap-2 font-normal",
                !fromDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="h-4 w-4 opacity-70" />
              <span className="tabular-nums">{buttonLabel}</span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-row sm:flex-col gap-1 p-3 border-b sm:border-b-0 sm:border-r border-border min-w-[140px]">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 hidden sm:block">
                {t("presets") /* fallback handled by translation file */}
              </div>
              {presets.map((p) => (
                <Button
                  key={p.key}
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal h-8"
                  onClick={() => {
                    apply(p.build());
                    setOpen(false);
                  }}
                >
                  {t(`preset.${p.key}`)}
                </Button>
              ))}
            </div>
            <Calendar
              mode="range"
              selected={selected}
              defaultMonth={fromDate ?? new Date()}
              numberOfMonths={2}
              disabled={{ after: today }}
              onSelect={(r) => {
                if (r?.from && r?.to) {
                  apply({ from: fmt(r.from), to: fmt(r.to) });
                  setOpen(false);
                } else if (r?.from) {
                  // partial selection — update from but keep to until full range chosen
                  apply({ from: fmt(r.from), to });
                }
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => apply(def)}
        className="h-9 text-muted-foreground hover:text-foreground"
      >
        {t("reset")}
      </Button>
    </div>
  );
}
