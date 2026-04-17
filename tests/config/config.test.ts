import { describe, it, expect } from "vitest";
import { loadConfig } from "../../../src/config/index.js";

describe("loadConfig", () => {
  it("should load valid configuration from env", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
      S3_BUCKET: "test-bucket",
      LOG_LEVEL: "debug",
    });

    expect(config.S3_ENDPOINT).toBe("https://r2.example.com");
    expect(config.S3_REGION).toBe("auto");
    expect(config.S3_ACCESS_KEY_ID).toBe("test-key");
    expect(config.S3_BUCKET).toBe("test-bucket");
    expect(config.LOG_LEVEL).toBe("debug");
  });

  it("should apply defaults for optional fields", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
    });

    expect(config.S3_REGION).toBe("auto");
    expect(config.S3_BUCKET).toBe("agent-vault");
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("should throw on missing required fields", () => {
    expect(() => loadConfig({})).toThrow();
  });

  it("should throw on invalid endpoint URL", () => {
    expect(() =>
      loadConfig({
        S3_ENDPOINT: "not-a-url",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
      }),
    ).toThrow();
  });
});
