import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCached } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";
import type { CalendarResult } from "@/types/calendar";
import type { DateRange } from "@/lib/date-range";

const CALENDLY_API = "https://api.calendly.com";
const INVITEE_CONCURRENCY = 5;

interface CalendlyEvent {
  uri: string;
  status: string;
  start_time: string;
}

interface CalendlyEventsPage {
  collection: CalendlyEvent[];
  pagination: { next_page: string | null };
}

interface CalendlyInvitee {
  status: string;
  no_show: { uri: string; created_at: string } | null;
}

interface CalendlyInviteesPage {
  collection: CalendlyInvitee[];
  pagination: { next_page: string | null };
}

async function fetchInviteesAttended(eventUri: string): Promise<boolean> {
  // event URI ends with /scheduled_events/{uuid}. The invitees endpoint sits under it.
  const url = `${eventUri}/invitees?status=active&count=100`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.CALENDLY_API_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) {
      logger.warn({ status: res.status, eventUri }, "Calendly invitees fetch failed, counting as attended");
      return true;
    }
    const data = (await res.json()) as CalendlyInviteesPage;
    if (data.collection.length === 0) return true;
    // If every invitee was marked no_show, the event was not attended.
    return data.collection.some((i) => i.no_show === null);
  } catch (err) {
    logger.warn({ err, eventUri }, "Calendly invitees fetch threw, counting as attended");
    return true;
  }
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchEvents(range: DateRange): Promise<CalendarResult> {
  if (!env.CALENDLY_API_TOKEN || !env.CALENDLY_USER_URI) {
    throw new Error("Calendly is not configured: set CALENDLY_API_TOKEN and CALENDLY_USER_URI in .env.local");
  }

  const initial = new URL(`${CALENDLY_API}/scheduled_events`);
  initial.searchParams.set("user", env.CALENDLY_USER_URI);
  initial.searchParams.set("min_start_time", `${range.from}T00:00:00Z`);
  initial.searchParams.set("max_start_time", `${range.to}T23:59:59Z`);
  initial.searchParams.set("status", "active");
  initial.searchParams.set("count", "100");
  initial.searchParams.set("sort", "start_time:asc");

  const events: CalendlyEvent[] = [];
  let nextUrl: string | null = initial.toString();
  let pageCount = 0;

  while (nextUrl && pageCount < 10) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${env.CALENDLY_API_TOKEN}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Calendly API ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as CalendlyEventsPage;
    events.push(...data.collection);
    nextUrl = data.pagination?.next_page ?? null;
    pageCount += 1;
  }

  const booked = events.length;
  const now = Date.now();
  const pastEvents = events.filter((e) => {
    const t = Date.parse(e.start_time);
    return Number.isFinite(t) && t < now;
  });

  const attendedFlags = await mapWithConcurrency(pastEvents, INVITEE_CONCURRENCY, (e) =>
    fetchInviteesAttended(e.uri),
  );
  const attended = attendedFlags.filter(Boolean).length;

  logger.debug(
    { booked, attended, pastCount: pastEvents.length, range, pageCount },
    "fetched calendly events",
  );

  return { total: booked, booked, attended, range };
}

export async function getBookedCalls(range: DateRange): Promise<CalendarResult> {
  const key = `calendly:${env.CALENDLY_USER_URI}:${range.from}:${range.to}:v2`;
  return getCached(key, CACHE_TTL.calendly, () => fetchEvents(range));
}
