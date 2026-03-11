import { describe, expect, it } from "vitest";

import { normalizeFirebasePrivateKey } from "@/lib/firebase/admin";

describe("normalizeFirebasePrivateKey", () => {
  it("converts escaped newlines", () => {
    expect(normalizeFirebasePrivateKey("line1\\nline2")).toBe("line1\nline2");
  });

  it("removes surrounding quotes before unescaping", () => {
    expect(normalizeFirebasePrivateKey('"line1\\nline2"')).toBe("line1\nline2");
  });

  it("preserves an already multiline key", () => {
    expect(normalizeFirebasePrivateKey("line1\nline2")).toBe("line1\nline2");
  });
});
