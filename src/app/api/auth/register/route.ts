import { NextResponse } from "next/server";

import { registerUser } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/http";
import { registerSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const user = await registerUser(input);
    return NextResponse.json({ userId: user.id });
  } catch (error) {
    return jsonError(error);
  }
}
