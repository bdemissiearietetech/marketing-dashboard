import "server-only";
import { env } from "@/lib/env";

export interface AppSettings {
  targetCac: number | null;
}

export async function getSettings(): Promise<AppSettings> {
  return { targetCac: env.TARGET_CAC ?? null };
}
