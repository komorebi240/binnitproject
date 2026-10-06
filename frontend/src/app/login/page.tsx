import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoginIntro } from "@/features/auth/components/LoginIntro";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <LoginIntro
        heading={
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Đăng nhập hệ thống</h1>
            <p className="text-sm text-gray-500">Dùng tài khoản được cấp bởi quản lý của bạn.</p>
          </div>
        }
      >
        <LoginForm />
      </LoginIntro>
    </AuthPageShell>
  );
}
