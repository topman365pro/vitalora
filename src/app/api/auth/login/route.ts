import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { loginUser } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/http";
import { loginSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const headerStore = await headers();
    const input = loginSchema.parse(await request.json());
    const user = await loginUser(input, {
      userAgent: headerStore.get("user-agent"),
      ipAddress: headerStore.get("x-forwarded-for"),
    });
    return NextResponse.json({ userId: user.id });
  } catch (error) {
    return jsonError(error);
  }
}
