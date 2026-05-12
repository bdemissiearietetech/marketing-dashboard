import "server-only";
import { prisma } from "@/db/client";

const SETTINGS_ID = "default";

export interface AppSettings {
  targetCac: number | null;
}

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return { targetCac: row?.targetCac ?? null };
}

export async function updateTargetCac(value: number | null): Promise<AppSettings> {
  const row = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, targetCac: value },
    update: { targetCac: value },
  });
  return { targetCac: row.targetCac ?? null };
}
