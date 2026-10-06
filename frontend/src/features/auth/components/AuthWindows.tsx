"use client";

import { AuthWindow } from "@/components/layout/AuthWindow";
import { StepTransition } from "@/components/ui/StepTransition";
import { RegisterWizard } from "@/features/onboarding/components/RegisterWizard";
import type { AuthView } from "../authView";
import { LoginForm } from "./LoginForm";

function SwitchLink({
  prompt,
  action,
  onClick,
}: {
  prompt: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <p className="mt-6 text-center text-sm text-fg-muted">
      {prompt}{" "}
      <button
        type="button"
        onClick={onClick}
        className="font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {action}
      </button>
    </p>
  );
}

/**
 * The sign-in and registration windows of the landing page. Kept in a module of its own so the landing can load it on
 * demand (see AuthLanding): the forms and the registration wizard are not needed to show the logo and the two buttons.
 */
export function AuthWindows({
  view,
  onViewChange,
  onClose,
}: {
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  onClose: () => void;
}) {
  return (
    <AuthWindow label={view === "login" ? "Đăng nhập" : "Đăng ký doanh nghiệp"} onClose={onClose}>
      <StepTransition stepKey={view} index={view === "login" ? 0 : 1}>
        {view === "login" ? (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-fg">Đăng nhập hệ thống</h2>
              <p className="mt-1 text-sm text-fg-muted">Dùng tài khoản được cấp bởi quản lý của bạn.</p>
            </div>
            <LoginForm onRegisterClick={() => onViewChange("register")} />
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-fg">Đăng ký doanh nghiệp</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Tạo không gian làm việc và tài khoản quản trị viên đầu tiên.
              </p>
            </div>
            <RegisterWizard />
            <SwitchLink prompt="Đã có tài khoản?" action="Đăng nhập" onClick={() => onViewChange("login")} />
          </div>
        )}
      </StepTransition>
    </AuthWindow>
  );
}
