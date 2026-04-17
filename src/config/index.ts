import { z } from "zod";

const configSchema = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().default("agent-vault"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(
  env?: Record<string, string | undefined>,
): Config {
  const source = env ?? process.env;
  return configSchema.parse({
    S3_ENDPOINT: source.S3_ENDPOINT,
    S3_REGION: source.S3_REGION,
    S3_ACCESS_KEY_ID: source.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: source.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: source.S3_BUCKET,
    LOG_LEVEL: source.LOG_LEVEL,
  });
}
