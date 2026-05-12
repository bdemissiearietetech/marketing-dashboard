export function formatMoney(value: number, currency: string | null, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency ?? "EUR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCpl(
  value: number | null,
  currency: string | null,
  locale: string,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return formatMoney(value, currency, locale);
}

export function computeDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / previous;
}

export function formatPercent(
  value: number | null,
  locale: string,
  options: { signed?: boolean; digits?: number } = {},
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const { signed = false, digits = 1 } = options;
  const formatted = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value);
  return formatted;
}
