import { AuthLanding } from "@/features/auth/components/AuthLanding";
import { parseAuthView } from "@/features/auth/authView";

/** `?open=login` (e.g. back from the forgot-password page) skips the intro and opens the sign-in window at once. */
export default function LoginPage({ searchParams }: { searchParams: { open?: string | string[] } }) {
  return <AuthLanding initialView={parseAuthView(searchParams.open)} />;
}
