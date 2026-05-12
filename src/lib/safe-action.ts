import { createSafeActionClient } from "next-safe-action";
import { logger } from "@/lib/logger";

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    logger.error({ err: error }, "Server action error");
    return error.message;
  },
});
