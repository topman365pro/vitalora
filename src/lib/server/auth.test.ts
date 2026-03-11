import { describe, expect, it } from "vitest";

import { resolveFirebaseUserAction } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";

function classifySessionError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status;
  }

  return 500;
}

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

describe("session error classification", () => {
  it("keeps firebase auth failures as 401", () => {
    const error = new ApiError("Unable to establish Firebase session", 401);
    expect(classifySessionError(error)).toBe(401);
  });

  it("treats unexpected server issues as 500", () => {
    const error = new ApiError("Unexpected server error", 500);
    expect(classifySessionError(error)).toBe(500);
  });
});
