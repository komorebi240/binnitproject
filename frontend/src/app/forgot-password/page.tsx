import Link from "next/link";
import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Quên mật khẩu</h1>
        <p className="text-sm text-gray-500">Nhập tên đăng nhập để nhận mã OTP qua email đã đăng ký.</p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="text-sm text-gray-500 hover:underline">
        Quay lại đăng nhập
      </Link>
    </AuthPageShell>
  );
}
