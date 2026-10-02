import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Quên mật khẩu</h1>
        <p className="text-sm text-gray-500">Nhập tên đăng nhập để nhận mã OTP qua email đã bind.</p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="text-sm text-gray-500 hover:underline">
        Quay lại đăng nhập
      </Link>
    </main>
  );
}
