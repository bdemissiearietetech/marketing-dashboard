import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    META_ACCESS_TOKEN: z.string().min(1),
    META_AD_ACCOUNT_ID: z.string().min(1),
    META_API_VERSION: z.string().default("v22.0"),

    // Calendly disabled until token is available — keep optional so the app boots.
    CALENDLY_API_TOKEN: z.string().min(1).optional(),
    CALENDLY_ORGANIZATION_URI: z.string().url().optional(),

    AIRTABLE_API_KEY: z.string().min(1),
    AIRTABLE_BASE_ID: z.string().min(1),
    AIRTABLE_CLIENTS_TABLE: z.string().default("Clients"),
    AIRTABLE_LEADS_TABLE: z.string().default("Leads"),

    // Reference CAC shown next to the actual CAC. Optional.
    TARGET_CAC: z.coerce.number().nonnegative().optional(),

    // Frontend login gate. When set, /login is required.
    DASHBOARD_PASSWORD: z.string().min(1).optional(),

    // n8n webhook that receives feedback submissions (multipart/form-data:
    // `text` + optional `image`). Optional — when unset, the API route returns 503.
    N8N_FEEDBACK_WEBHOOK_URL: z.string().url().optional(),

    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
    META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
    META_API_VERSION: process.env.META_API_VERSION,
    CALENDLY_API_TOKEN: process.env.CALENDLY_API_TOKEN,
    CALENDLY_ORGANIZATION_URI: process.env.CALENDLY_ORGANIZATION_URI,
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_CLIENTS_TABLE: process.env.AIRTABLE_CLIENTS_TABLE,
    AIRTABLE_LEADS_TABLE: process.env.AIRTABLE_LEADS_TABLE,
    TARGET_CAC: process.env.TARGET_CAC,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD,
    N8N_FEEDBACK_WEBHOOK_URL: process.env.N8N_FEEDBACK_WEBHOOK_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
