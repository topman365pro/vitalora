import { describe, expect, it } from "vitest";

import { normalizeFirebasePrivateKey } from "@/lib/firebase/admin";

describe("normalizeFirebasePrivateKey", () => {
  it("turns escaped newlines into real newlines", () => {
    expect(normalizeFirebasePrivateKey("line-1\\nline-2")).toBe("line-1\nline-2");
  });

  it("strips surrounding quotes", () => {
    expect(normalizeFirebasePrivateKey('"line-1\\nline-2"')).toBe("line-1\nline-2");
  });
});
