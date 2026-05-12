import { prisma } from "@/db/client";
import { logger } from "@/lib/logger";

export async function getCached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = await prisma.cacheEntry.findUnique({ where: { key } });

  if (entry) {
    const ageSec = (Date.now() - entry.fetchedAt.getTime()) / 1000;
    if (ageSec < entry.ttlSec) {
      logger.debug({ key, ageSec: Math.round(ageSec) }, "cache hit");
      return entry.payload as T;
    }
  }

  logger.debug({ key }, "cache miss, fetching fresh");
  const payload = await fetcher();

  await prisma.cacheEntry.upsert({
    where: { key },
    create: { key, payload: payload as never, ttlSec, fetchedAt: new Date() },
    update: { payload: payload as never, ttlSec, fetchedAt: new Date() },
  });

  return payload;
}

export async function invalidateCache(keyPrefix?: string): Promise<number> {
  if (!keyPrefix) {
    const result = await prisma.cacheEntry.deleteMany({});
    return result.count;
  }
  const result = await prisma.cacheEntry.deleteMany({
    where: { key: { startsWith: keyPrefix } },
  });
  return result.count;
}
