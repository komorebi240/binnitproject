import { AuthLanding } from "@/features/auth/components/AuthLanding";
import { parseAuthView } from "@/features/auth/authView";

/** `?open=login` (e.g. back from the forgot-password page) skips the intro and opens the sign-in window at once. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string | string[] }>;
}) {
  const query = await searchParams;
  return <AuthLanding initialView={parseAuthView(query.open)} />;
}
