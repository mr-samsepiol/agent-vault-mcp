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

describe("HTTP configuration", () => {
  it("should load HTTP config with defaults", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
      API_KEY: "my-secret-api-key",
    });

    expect(config.HTTP_HOST).toBe("127.0.0.1");
    expect(config.HTTP_PORT).toBe(3000);
    expect(config.API_KEY).toBe("my-secret-api-key");
    expect(config.CORS_ORIGIN).toBe("*");
    expect(config.RATE_LIMIT_MAX).toBe(100);
    expect(config.RATE_LIMIT_WINDOW).toBe(60000);
    expect(config.TRANSPORT_MODE).toBe("stdio");
  });

  it("should load HTTP mode config from env", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      HTTP_HOST: "0.0.0.0",
      HTTP_PORT: "8080",
      API_KEY: "vault-key-123",
      CORS_ORIGIN: "https://app.example.com",
      RATE_LIMIT_MAX: "50",
      RATE_LIMIT_WINDOW: "30000",
      TRANSPORT_MODE: "http",
    });

    expect(config.HTTP_HOST).toBe("0.0.0.0");
    expect(config.HTTP_PORT).toBe(8080);
    expect(config.API_KEY).toBe("vault-key-123");
    expect(config.CORS_ORIGIN).toBe("https://app.example.com");
    expect(config.RATE_LIMIT_MAX).toBe(50);
    expect(config.RATE_LIMIT_WINDOW).toBe(30000);
    expect(config.TRANSPORT_MODE).toBe("http");
  });

  it("should require API_KEY when transport mode is http", () => {
    expect(() =>
      loadConfig({
        S3_ENDPOINT: "https://r2.example.com",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        TRANSPORT_MODE: "http",
      }),
    ).toThrow();
  });

  it("should not require API_KEY in stdio mode", () => {
    const config = loadConfig({
      S3_ENDPOINT: "https://r2.example.com",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      TRANSPORT_MODE: "stdio",
    });
    expect(config.API_KEY).toBeUndefined();
  });

  it("should reject invalid transport mode", () => {
    expect(() =>
      loadConfig({
        S3_ENDPOINT: "https://r2.example.com",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        TRANSPORT_MODE: "grpc",
      }),
    ).toThrow();
  });
});
