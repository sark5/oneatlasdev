import { z } from "zod";

const postgresUrl = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return (
      protocol === "postgres:" || protocol === "postgresql:"
    );
  }, "Must be a valid PostgreSQL URL");

const envSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_URL_UNPOOLED: postgresUrl,
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  LITELLM_MODEL_PRICES_URL: z.string().url().optional(),
  INGESTION_DEFAULT_LIMIT: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(60),
  CRON_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional()
  ),
  INGESTION_STALE_AFTER_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(720)
    .default(36),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const names = [
    ...new Set(
      parsed.error.issues.map((issue) => issue.path.join(".")
      )
    ),
  ];

  throw new Error(
    `Invalid environment variables: ${names.join(", ")}`
  );
}

export const env = parsed.data;
