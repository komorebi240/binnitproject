import { AuthLanding } from "@/features/auth/components/AuthLanding";

/** The register link opens the same landing page with the registration window already showing. */
export default function RegisterPage() {
  return <AuthLanding initialView="register" />;
}
