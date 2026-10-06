import type { ReactNode } from "react";

/**
 * The frame shared by every sign-in page (login, register, forgot password): a raised card with a thin brand
 * stripe on top, so the form reads as one clear block over the decorative backdrop instead of floating on it.
 */
export function AuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`glass-window relative w-full max-w-md overflow-hidden rounded-xl px-6 pb-7 pt-9 sm:px-9 ${className}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primaryEnd" />
      {children}
    </div>
  );
}
