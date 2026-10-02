import Link from "next/link";
import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { RegisterWizard } from "@/features/onboarding/components/RegisterWizard";

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <OrbitWordmark width={137} height={48} />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Đăng ký doanh nghiệp</h1>
          <p className="text-sm text-gray-500">Tạo không gian làm việc và tài khoản quản trị viên đầu tiên.</p>
        </div>
      </div>
      <RegisterWizard />
      <Link href="/login" className="text-sm text-gray-500 hover:underline">
        Đã có tài khoản? Đăng nhập
      </Link>
    </AuthPageShell>
  );
}
