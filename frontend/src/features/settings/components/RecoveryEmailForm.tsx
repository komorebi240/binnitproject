"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useUpdateProfile } from "../hooks/useSettings";

interface RecoveryEmailFormProps {
  currentUser: UserProfile;
}

/** "bind gmail" - the email used both for account contact and forgot-password OTP delivery. */
export function RecoveryEmailForm({ currentUser }: RecoveryEmailFormProps) {
  const [email, setEmail] = useState(currentUser.email ?? "");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updateProfile = useUpdateProfile();
  const { showToast } = useToast();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await updateProfile.mutateAsync({ email, phone: phone || undefined });
      showToast("success", "Đã cập nhật email khôi phục");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không cập nhật được email");
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-gray-900">Email khôi phục mật khẩu</h2>
      <p className="text-sm text-gray-500">
        Email này nhận mã OTP khi bạn dùng chức năng &quot;Quên mật khẩu&quot; ở màn hình đăng nhập.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input label="Số điện thoại (tuỳ chọn)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <Button type="submit" loading={updateProfile.isPending}>
          Lưu
        </Button>
      </form>
    </section>
  );
}
