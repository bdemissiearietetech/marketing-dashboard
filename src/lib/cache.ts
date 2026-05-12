import { unstable_cache } from "next/cache";

// Drop-in replacement for the previous Postgres-backed cache. Uses Next.js's
// per-instance Data Cache: cached for `ttlSec` seconds, scoped by `key`.
export async function getCached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(fetcher, [key], { revalidate: ttlSec, tags: [key] });
  return cached();
}
