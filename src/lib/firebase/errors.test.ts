import { describe, expect, it } from "vitest";

import { mapFirebaseAuthError } from "@/lib/firebase/errors";

describe("mapFirebaseAuthError", () => {
  it("maps wrong password errors", () => {
    expect(
      mapFirebaseAuthError({
        code: "auth/wrong-password",
      }),
    ).toBe("Incorrect email or password.");
  });

  it("maps popup closed errors", () => {
    expect(
      mapFirebaseAuthError({
        code: "auth/popup-closed-by-user",
      }),
    ).toBe("Google sign-in was closed before completion.");
  });

  it("falls back to the original error message", () => {
    expect(mapFirebaseAuthError(new Error("custom failure"))).toBe("custom failure");
  });
});
