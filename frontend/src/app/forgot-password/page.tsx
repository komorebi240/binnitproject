import Link from "next/link";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { Tagline } from "@/components/brand/Tagline";
import { AuthCard } from "@/components/layout/AuthCard";
import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-2">
        <OrbitWordmark width={180} />
        <Tagline />
      </div>
      <AuthCard>
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-fg">Quên mật khẩu</h1>
          <p className="mt-1 text-sm text-fg-muted">Nhập tên đăng nhập hoặc email để nhận mã OTP qua email đã đăng ký.</p>
        </div>
        <ForgotPasswordForm />
      </AuthCard>
      <Link href="/login?open=login" className="text-sm text-fg-muted hover:text-fg hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        ← Quay lại đăng nhập
      </Link>
    </AuthPageShell>
  );
}
