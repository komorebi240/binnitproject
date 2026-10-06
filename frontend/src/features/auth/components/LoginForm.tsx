"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiRequestError } from "@/lib/api/client";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { useLogin } from "../hooks/useAuth";

/** Only the user NAME is remembered on this device, never the password. */
const REMEMBERED_USERNAME_KEY = "orbit-login-username";

function readRememberedUsername(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? "";
  } catch {
    return ""; // storage blocked (private window...): behave as if nothing was saved
  }
}

function saveRememberedUsername(username: string | null) {
  try {
    if (username) window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
    else window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
  } catch {
    // Nothing else to do - the person just types the name again next time.
  }
}

/** Vietnamese text for a failed sign-in; a wrong user and a wrong password are deliberately indistinguishable. */
function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 401) return "Tên đăng nhập hoặc mật khẩu không đúng.";
    if (err.status === 429) return "Bạn thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
  }
  return "Đăng nhập thất bại, vui lòng thử lại.";
}

export function LoginForm({ onRegisterClick }: { onRegisterClick?: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const login = useLogin();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Read after mount (never during server rendering), so the page renders the same on the server and the client.
  useEffect(() => {
    const saved = readRememberedUsername();
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
  }, []);

  // A wrong password shakes the form once, so the failure is felt as well as read.
  useGSAP(
    () => {
      if (!errorMessage || !formRef.current || prefersReducedMotion()) return;
      gsap.fromTo(
        formRef.current,
        { x: 0 },
        {
          keyframes: { x: [-10, 10, -7, 7, -3, 3, 0], easeEach: "power1.inOut" },
          duration: 0.5,
          clearProps: "transform",
        },
      );
    },
    { dependencies: [errorMessage] },
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await login.mutateAsync({ username, password });
      saveRememberedUsername(remember ? username.trim() : null);
      router.push("/dashboard");
    } catch (err) {
      // Deliberately generic - the backend already collapses "wrong password" and "no such
      // user" into one message so this screen can't be used to enumerate usernames.
      setErrorMessage(loginErrorMessage(err));
      setPassword("");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <Input
        label="Tên đăng nhập"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
      <div className="flex flex-col gap-1.5">
        <Input
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
          onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
          onBlur={() => setCapsLock(false)}
          autoComplete="current-password"
          required
        />
        {capsLock && (
          <p role="status" className="animate-fade-in text-xs text-warning-text">
            Caps Lock đang bật - mật khẩu phân biệt chữ hoa và chữ thường.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-fg-soft">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong accent-primary"
          />
          Ghi nhớ tên đăng nhập
        </label>
        <Link
          href="/forgot-password"
          className="font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Quên mật khẩu?
        </Link>
      </div>

      {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

      <Button type="submit" loading={login.isPending} className="w-full py-2.5">
        {login.isPending ? "Đang đăng nhập" : "Đăng nhập"}
      </Button>

      <div className="mt-2 flex items-center gap-3 text-xs text-fg-faint" role="separator">
        <span className="h-px flex-1 bg-line" />
        Chưa có doanh nghiệp?
        <span className="h-px flex-1 bg-line" />
      </div>
      {onRegisterClick ? (
        <button type="button" onClick={onRegisterClick} className={buttonClassName("secondary", "w-full")}>
          Đăng ký doanh nghiệp
        </button>
      ) : (
        <Link href="/register" className={buttonClassName("secondary", "w-full")}>
          Đăng ký doanh nghiệp
        </Link>
      )}
    </form>
  );
}
