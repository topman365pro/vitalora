import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("super-secret-123");

    expect(hash).not.toBe("super-secret-123");
    await expect(verifyPassword(hash, "super-secret-123")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });
});
