import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark, no benefit from next/image's resize pipeline */}
        <img src="/orbit-wordmark.svg" alt="Orbit" width={200} height={56} />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Đăng nhập hệ thống</h1>
          <p className="text-sm text-gray-500">Dùng tài khoản được cấp bởi quản lý của bạn.</p>
        </div>
      </div>
      <LoginForm />
    </main>
  );
}
