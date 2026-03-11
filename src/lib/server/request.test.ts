import { describe, expect, it } from "vitest";

import { sanitizeForwardedIp } from "@/lib/server/request";

describe("sanitizeForwardedIp", () => {
  it("returns a valid single ip", () => {
    expect(sanitizeForwardedIp("203.0.113.8")).toBe("203.0.113.8");
  });

  it("extracts the first ip from a proxy chain", () => {
    expect(sanitizeForwardedIp("203.0.113.8, 10.0.0.1")).toBe("203.0.113.8");
  });

  it("returns null for invalid input", () => {
    expect(sanitizeForwardedIp("unknown")).toBeNull();
    expect(sanitizeForwardedIp("")).toBeNull();
    expect(sanitizeForwardedIp(null)).toBeNull();
  });
});
