import { describe, expect, it } from "vitest";

import { resolveFirebaseUserAction } from "@/lib/server/auth";

describe("resolveFirebaseUserAction", () => {
  it("prefers firebase uid matches", () => {
    expect(
      resolveFirebaseUserAction({
        existingFirebaseUid: "user-1",
        existingEmailUserId: "user-2",
      }),
    ).toBe("existing_firebase_uid");
  });

  it("links by email when uid does not exist", () => {
    expect(
      resolveFirebaseUserAction({
        existingFirebaseUid: null,
        existingEmailUserId: "user-2",
      }),
    ).toBe("link_by_email");
  });

  it("creates a new user when neither match exists", () => {
    expect(
      resolveFirebaseUserAction({
        existingFirebaseUid: null,
        existingEmailUserId: null,
      }),
    ).toBe("create_new");
  });
});
