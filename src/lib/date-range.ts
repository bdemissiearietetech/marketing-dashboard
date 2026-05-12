import { differenceInCalendarDays, format, parse, subDays, isValid, startOfDay } from "date-fns";
import { DEFAULT_RANGE_DAYS } from "@/lib/constants";

export interface DateRange {
  from: string;
  to: string;
}

const DATE_FORMAT = "yyyy-MM-dd";

function parseDate(s: string): Date {
  return parse(s, DATE_FORMAT, new Date());
}

export function rangeDays(range: DateRange): number {
  return differenceInCalendarDays(parseDate(range.to), parseDate(range.from)) + 1;
}

export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  const from = parseDate(range.from);
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(prevTo, days - 1);
  return { from: format(prevFrom, DATE_FORMAT), to: format(prevTo, DATE_FORMAT) };
}

export function defaultRange(today: Date = new Date()): DateRange {
  const t = startOfDay(today);
  return {
    from: format(subDays(t, DEFAULT_RANGE_DAYS - 1), DATE_FORMAT),
    to: format(t, DATE_FORMAT),
  };
}

export function parseRange(
  raw: { from?: string | string[]; to?: string | string[] } | undefined,
): DateRange {
  const def = defaultRange();
  const fromRaw = Array.isArray(raw?.from) ? raw?.from[0] : raw?.from;
  const toRaw = Array.isArray(raw?.to) ? raw?.to[0] : raw?.to;

  const from = fromRaw && isValid(parse(fromRaw, DATE_FORMAT, new Date())) ? fromRaw : def.from;
  const to = toRaw && isValid(parse(toRaw, DATE_FORMAT, new Date())) ? toRaw : def.to;

  return { from, to };
}

export function formatDate(d: Date): string {
  return format(d, DATE_FORMAT);
}
