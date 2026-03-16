import { NextResponse } from "next/server";

import { createSessionFromIdToken } from "@/lib/auth/session";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { upsertUserProfile } from "@/lib/server/firebase-store";
import { jsonError } from "@/lib/server/http";
import { firebaseSessionSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const input = firebaseSessionSchema.parse(await request.json());
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(input.idToken);
    const user = await upsertUserProfile(decodedToken);

    await createSessionFromIdToken(input.idToken);

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
