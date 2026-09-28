"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  leaving: boolean;
}

interface ToastContextValue {
  showToast: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "bg-green-600 text-white",
  error: "bg-danger text-danger-foreground",
};

const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 150;

/**
 * Design-system primitive (CLAUDE.md section 26) — the one place every feature reports
 * "it worked" / "it failed" instead of the page staying silent after a mutation. Slides/fades
 * in and out (CLAUDE.md section 25: motion for feedback, not decoration) — additive to, not a
 * replacement for, inline field errors that stay visible (e.g. form validation).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    // Mark as leaving first so the exit animation plays, then actually remove it.
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const showToast = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, message, leaving: false }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={`rounded px-4 py-2 text-left text-sm shadow-lg ${TONE_CLASSES[toast.tone]} ${
              toast.leaving ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
