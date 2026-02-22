import { describe, it, expect, beforeEach } from "vitest";
import { HealthController } from "../health/health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it("should return status ok", () => {
    const result = controller.check();
    expect(result.status).toBe("ok");
  });

  it("should return version 0.1.0", () => {
    const result = controller.check();
    expect(result.version).toBe("0.1.0");
  });

  it("should return a valid ISO timestamp", () => {
    const result = controller.check();
    const parsed = new Date(result.timestamp);
    expect(parsed.toISOString()).toBe(result.timestamp);
  });

  it("should return all expected fields", () => {
    const result = controller.check();
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("version");
  });
});
