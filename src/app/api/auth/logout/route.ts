import { NextResponse } from "next/server";

import { logoutUser } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/http";

export async function POST() {
  try {
    await logoutUser();
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
