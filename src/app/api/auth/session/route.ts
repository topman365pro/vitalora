import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeFirebaseSession } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/http";
import { sanitizeForwardedIp } from "@/lib/server/request";
import { firebaseSessionSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const headerStore = await headers();
    const input = firebaseSessionSchema.parse(await request.json());
    const user = await exchangeFirebaseSession(input.idToken, {
      userAgent: headerStore.get("user-agent"),
      ipAddress: sanitizeForwardedIp(headerStore.get("x-forwarded-for")),
    });

    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
