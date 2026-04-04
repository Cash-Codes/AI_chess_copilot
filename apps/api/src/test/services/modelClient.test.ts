import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getVertexConfig } from "../../services/modelClient.js";

// generateStructuredResponse makes a real network call — test it via the
// orchestrator integration test instead. Here we only test the pure config logic.

describe("getVertexConfig", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    delete process.env.VERTEX_PROJECT;
    delete process.env.VERTEX_LOCATION;
    delete process.env.VERTEX_MODEL;
  });

  afterEach(() => {
    // Restore original env
    Object.assign(process.env, ORIGINAL_ENV);
    // Remove keys that were not in the original
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key];
    }
  });

  it("returns null when VERTEX_PROJECT is not set", () => {
    expect(getVertexConfig()).toBeNull();
  });

  it("returns null when VERTEX_PROJECT is an empty string", () => {
    process.env.VERTEX_PROJECT = "";
    expect(getVertexConfig()).toBeNull();
  });

  it("returns a config object when VERTEX_PROJECT is set", () => {
    process.env.VERTEX_PROJECT = "my-gcp-project";
    const config = getVertexConfig();
    expect(config).not.toBeNull();
    expect(config?.project).toBe("my-gcp-project");
  });

  it("uses default location 'us-central1' when VERTEX_LOCATION is not set", () => {
    process.env.VERTEX_PROJECT = "my-gcp-project";
    const config = getVertexConfig();
    expect(config?.location).toBe("us-central1");
  });

  it("uses VERTEX_LOCATION when provided", () => {
    process.env.VERTEX_PROJECT = "my-gcp-project";
    process.env.VERTEX_LOCATION = "europe-west4";
    const config = getVertexConfig();
    expect(config?.location).toBe("europe-west4");
  });

  it("uses default model 'gemini-2.5-flash' when VERTEX_MODEL is not set", () => {
    process.env.VERTEX_PROJECT = "my-gcp-project";
    const config = getVertexConfig();
    expect(config?.model).toBe("gemini-2.5-flash");
  });

  it("uses VERTEX_MODEL when provided", () => {
    process.env.VERTEX_PROJECT = "my-gcp-project";
    process.env.VERTEX_MODEL = "gemini-1.5-pro";
    const config = getVertexConfig();
    expect(config?.model).toBe("gemini-1.5-pro");
  });
});
