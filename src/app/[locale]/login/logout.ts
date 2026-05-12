"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}
