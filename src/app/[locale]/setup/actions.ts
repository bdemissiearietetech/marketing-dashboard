"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actionClient } from "@/lib/safe-action";
import { updateTargetCac } from "@/server/queries/settings";
import { invalidateCache } from "@/lib/cache";

const schema = z.object({
  targetCac: z
    .union([z.number().nonnegative(), z.null()])
    .describe("Target CAC in account currency. Null clears the setting."),
});

export const updateTargetCacAction = actionClient
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const next = parsedInput.targetCac === 0 ? null : parsedInput.targetCac;
    const settings = await updateTargetCac(next);
    // The dashboard CAC card reads target from Settings; bust the hero cache so the new
    // value shows up immediately rather than after the next TTL window.
    await invalidateCache("meta-ads:");
    revalidatePath("/", "layout");
    return { settings };
  });
