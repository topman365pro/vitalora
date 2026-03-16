import { describe, expect, it } from "vitest";

import { getFirebaseAuthErrorMessage } from "@/lib/firebase/client";

describe("getFirebaseAuthErrorMessage", () => {
  it("maps common Firebase auth errors to UI copy", () => {
    expect(
      getFirebaseAuthErrorMessage({
        code: "auth/email-already-in-use",
        message: "raw",
      }),
    ).toBe("That email is already in use.");

    expect(
      getFirebaseAuthErrorMessage({
        code: "auth/popup-closed-by-user",
        message: "raw",
      }),
    ).toBe("Google sign-in was closed before it finished.");
  });
});
