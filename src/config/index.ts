import { z } from "zod";

const configSchema = z
  .object({
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().default("auto"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET: z.string().default("agent-vault"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    TRANSPORT_MODE: z.enum(["stdio", "http"]).default("stdio"),
    HTTP_HOST: z.string().default("127.0.0.1"),
    HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    API_KEY: z.string().optional(),
    CORS_ORIGIN: z.string().default("*"),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60000),
  })
  .refine(
    (data) => {
      if (data.TRANSPORT_MODE === "http" && !data.API_KEY) {
        return false;
      }
      return true;
    },
    {
      message: "API_KEY is required when TRANSPORT_MODE is http",
      path: ["API_KEY"],
    },
  );

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
    TRANSPORT_MODE: source.TRANSPORT_MODE,
    HTTP_HOST: source.HTTP_HOST,
    HTTP_PORT: source.HTTP_PORT,
    API_KEY: source.API_KEY,
    CORS_ORIGIN: source.CORS_ORIGIN,
    RATE_LIMIT_MAX: source.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW: source.RATE_LIMIT_WINDOW,
  });
}
