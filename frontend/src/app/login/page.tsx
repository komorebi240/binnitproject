import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <OrbitWordmark width={182} height={64} />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Đăng nhập hệ thống</h1>
          <p className="text-sm text-gray-500">Dùng tài khoản được cấp bởi quản lý của bạn.</p>
        </div>
      </div>
      <LoginForm />
    </AuthPageShell>
  );
}
