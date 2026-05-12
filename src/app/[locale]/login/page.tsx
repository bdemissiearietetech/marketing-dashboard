import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const from =
    params.from && params.from.startsWith("/") && !params.from.startsWith("//")
      ? params.from
      : undefined;

  // If already authenticated, skip the form.
  const password = process.env.DASHBOARD_PASSWORD;
  if (password) {
    const jar = await cookies();
    const cookie = jar.get(AUTH_COOKIE)?.value;
    if (cookie === (await hashPassword(password))) {
      redirect(from ?? "/");
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <LoginForm from={from} />
    </div>
  );
}
