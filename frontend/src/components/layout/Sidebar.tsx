"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/departments", label: "Phòng ban" },
  { href: "/dashboard/users", label: "Nhân sự" },
  { href: "/dashboard/tasks", label: "Công việc" },
  { href: "/dashboard/drive", label: "Google Drive" },
] as const;

/**
 * Fixed left column on desktop, a horizontal scrollable bar on small screens — "don't break
 * layout on mobile" rather than a fully-optimized mobile nav (CLAUDE.md section 24; see the
 * UI meeting notes for why a hamburger/drawer wasn't built at this stage).
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white p-2 md:w-56 md:flex-none md:flex-col md:border-b-0 md:border-r md:p-4"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-all duration-150
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
              ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-700 hover:bg-surface-muted hover:pl-4"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
