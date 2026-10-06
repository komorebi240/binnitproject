"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { onboardingErrorMessage } from "../errors";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/useAuth";
import { useAcceptInvitation, useInvitationPreview } from "../hooks/useOnboarding";
import { LEVEL_LABELS } from "../types";

/**
 * Invitee side of an email invitation. The company, role and email come from the invitation (shown
 * read-only); the person only chooses a username, their name and a password. An invalid, used,
 * revoked or expired link all look the same on purpose (the backend answers them identically).
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const { data: preview, isLoading, isError } = useInvitationPreview(token);
  const acceptInvitation = useAcceptInvitation(token);
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return <Skeleton rows={3} />;
  }

  // Accepting would replace the session of whoever is signed in here, so ask them to sign out first.
  if (currentUser) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <p className="text-sm text-fg-soft">
          Bạn đang đăng nhập bằng tài khoản <strong>{currentUser.fullName}</strong> ({currentUser.companyName}).
        </p>
        <p className="text-sm text-fg-muted">Hãy đăng xuất để tạo tài khoản mới từ lời mời này.</p>
        <Button loading={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => window.location.reload() })}>
          Đăng xuất và tiếp tục
        </Button>
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <p role="alert" className="text-sm text-danger">
          Lời mời này không hợp lệ hoặc đã hết hạn.
        </p>
        <p className="text-sm text-fg-muted">Hãy nhờ người mời gửi lại lời mời mới.</p>
        <Link href="/login" className="text-sm text-primary-text hover:underline">
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu nhập lại không khớp");
      return;
    }
    try {
      await acceptInvitation.mutateAsync({ username: username.trim(), fullName: fullName.trim(), password });
      router.push("/dashboard");
    } catch (err) {
      setErrorMessage(onboardingErrorMessage(err, "Không tạo được tài khoản"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="rounded-lg glass-card p-3 text-sm">
        <p className="text-fg-muted">
          <span className="font-medium text-fg">{preview.inviterName}</span> mời bạn tham gia
        </p>
        <p className="mt-0.5 text-base font-semibold text-fg">{preview.companyName}</p>
        <p className="mt-1 text-fg-muted">Vai trò: {LEVEL_LABELS[preview.authorityLevel]}</p>
      </div>
      <Input label="Email" type="email" value={preview.email} readOnly disabled />
      <Input
        label="Tên đăng nhập"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        pattern="[A-Za-z0-9._\-]{3,100}"
        title="3-100 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang"
        required
      />
      <Input label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={200} required />
      <Input
        label="Mật khẩu (8-72 ký tự)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
      />
      <Input
        label="Nhập lại mật khẩu"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
      />
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <Button type="submit" loading={acceptInvitation.isPending}>
        Tạo tài khoản và vào Orbit
      </Button>
    </form>
  );
}
