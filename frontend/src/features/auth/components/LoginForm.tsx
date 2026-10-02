"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiRequestError } from "@/lib/api/client";
import { useLogin } from "../hooks/useAuth";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const login = useLogin();
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await login.mutateAsync({ username, password });
      router.push("/dashboard");
    } catch (err) {
      // Deliberately generic — the backend already collapses "wrong password" and "no such
      // user" into one message so this screen can't be used to enumerate usernames.
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Đăng nhập thất bại");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <Input
        label="Tên đăng nhập"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        required
      />
      <Input
        label="Mật khẩu"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <Button type="submit" loading={login.isPending}>
        Đăng nhập
      </Button>

      <Link href="/forgot-password" className="text-center text-sm text-primary hover:underline">
        Quên mật khẩu?
      </Link>
    </form>
  );
}
