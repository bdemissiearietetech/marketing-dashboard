import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCached } from "@/lib/cache";
import { CACHE_TTL, CALENDLY_TRACKED_EVENT_TYPE_URIS } from "@/lib/constants";
import type { CalendarResult } from "@/types/calendar";
import type { DateRange } from "@/lib/date-range";

const CALENDLY_API = "https://api.calendly.com";
const INVITEE_CONCURRENCY = 5;

interface CalendlyEvent {
  uri: string;
  status: string;
  start_time: string;
  event_type: string;
}

const TRACKED_EVENT_TYPES = new Set<string>(CALENDLY_TRACKED_EVENT_TYPE_URIS);

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

/**
 * Determine attendance for a past Calendly event.
 *
 *   true  → at least one active invitee was NOT flagged no-show (attended)
 *   false → all active invitees were flagged no-show, or there were none
 *   null  → could not determine (API error / network) — caller surfaces this
 *           rather than guessing, so silent failures don't inflate "attended".
 */
async function fetchInviteesAttended(eventUri: string): Promise<boolean | null> {
  const url = `${eventUri}/invitees?status=active&count=100`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.CALENDLY_API_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) {
      logger.warn({ status: res.status, eventUri }, "Calendly invitees fetch failed");
      return null;
    }
    const data = (await res.json()) as CalendlyInviteesPage;
    if (data.collection.length === 0) return false;
    return data.collection.some((i) => i.no_show === null);
  } catch (err) {
    logger.warn({ err, eventUri }, "Calendly invitees fetch threw");
    return null;
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
    // Drop event types we don't track (internal meetings, deprecated booking pages, etc.)
    // before doing any downstream work — including the per-event invitees lookup.
    for (const ev of data.collection) {
      if (TRACKED_EVENT_TYPES.has(ev.event_type)) events.push(ev);
    }
    nextUrl = data.pagination?.next_page ?? null;
    pageCount += 1;
  }

  const now = Date.now();
  const pastEvents = events.filter((e) => {
    const t = Date.parse(e.start_time);
    return Number.isFinite(t) && t < now;
  });

  const flags = await mapWithConcurrency(pastEvents, INVITEE_CONCURRENCY, (e) =>
    fetchInviteesAttended(e.uri),
  );

  const booked = events.length;
  const pastBooked = pastEvents.length;
  const attended = flags.filter((f) => f === true).length;
  const attendanceUnknown = flags.filter((f) => f === null).length;

  logger.debug(
    { booked, pastBooked, attended, attendanceUnknown, range, pageCount },
    "fetched calendly events",
  );

  return { booked, pastBooked, attended, attendanceUnknown, range };
}

export async function getBookedCalls(range: DateRange): Promise<CalendarResult> {
  // Cache key includes a digest of the tracked event types so changing the
  // allow-list (constants.ts) invalidates existing payloads.
  const typesDigest = CALENDLY_TRACKED_EVENT_TYPE_URIS.join(",").slice(-12);
  const key = `calendly:${env.CALENDLY_USER_URI}:${range.from}:${range.to}:types:${typesDigest}`;
  return getCached(key, CACHE_TTL.calendly, () => fetchEvents(range));
}
