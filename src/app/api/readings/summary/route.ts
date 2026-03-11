import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/server/http";
import { getReadingSummary } from "@/lib/server/readings";
import { rangeSchema } from "@/lib/server/validation";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const range = rangeSchema.parse(searchParams.get("range") ?? "24h");
    const summary = await getReadingSummary(session.userId, range);
    return NextResponse.json(summary);
  } catch (error) {
    return jsonError(error);
  }
}
