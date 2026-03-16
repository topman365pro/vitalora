import { NextResponse } from "next/server";

import { revokeCurrentSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/server/http";

export async function POST() {
  try {
    await revokeCurrentSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
