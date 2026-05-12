import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),

    META_ACCESS_TOKEN: z.string().min(1),
    META_AD_ACCOUNT_ID: z.string().min(1),
    META_API_VERSION: z.string().default("v22.0"),

    // Calendly disabled until token is available — keep optional so the app boots.
    CALENDLY_API_TOKEN: z.string().min(1).optional(),
    CALENDLY_USER_URI: z.string().url().optional(),

    AIRTABLE_API_KEY: z.string().min(1),
    AIRTABLE_BASE_ID: z.string().min(1),
    AIRTABLE_CLIENTS_TABLE: z.string().default("Clients"),
    AIRTABLE_LEADS_TABLE: z.string().default("Leads"),

    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
    META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
    META_API_VERSION: process.env.META_API_VERSION,
    CALENDLY_API_TOKEN: process.env.CALENDLY_API_TOKEN,
    CALENDLY_USER_URI: process.env.CALENDLY_USER_URI,
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_CLIENTS_TABLE: process.env.AIRTABLE_CLIENTS_TABLE,
    AIRTABLE_LEADS_TABLE: process.env.AIRTABLE_LEADS_TABLE,
    NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
