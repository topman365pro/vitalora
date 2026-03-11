import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/server/http";
import { getReadingHistory } from "@/lib/server/readings";
import { rangeSchema } from "@/lib/server/validation";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const range = rangeSchema.parse(searchParams.get("range") ?? "24h");
    const history = await getReadingHistory(session.userId, range);
    return NextResponse.json({ history });
  } catch (error) {
    return jsonError(error);
  }
}
