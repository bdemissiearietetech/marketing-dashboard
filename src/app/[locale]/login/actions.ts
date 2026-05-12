"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_MAX_AGE_SEC, hashPassword } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";

const schema = z.object({
  password: z.string().min(1),
});

export const loginAction = actionClient
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const expected = process.env.DASHBOARD_PASSWORD;
    if (!expected) {
      // Gate not configured — treat as success so a logged-in user can come back
      // after enabling it without being locked out mid-session.
      return { ok: true as const };
    }
    if (parsedInput.password !== expected) {
      return { ok: false as const, error: "invalid" as const };
    }
    const jar = await cookies();
    jar.set(AUTH_COOKIE, await hashPassword(expected), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_MAX_AGE_SEC,
      path: "/",
    });
    return { ok: true as const };
  });
