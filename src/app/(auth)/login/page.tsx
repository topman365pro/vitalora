import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return <AuthForm mode="login" />;
}
