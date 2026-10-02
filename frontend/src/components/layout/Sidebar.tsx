"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChatCircle,
  ClipboardText,
  HardDrives,
  House,
  NotePencil,
  UsersThree,
  Buildings,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { AuthorityLevel } from "@/features/auth/types";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** Omit to show for every authenticated role; otherwise only these roles see the item. */
  roles?: AuthorityLevel[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/departments", label: "Phòng ban", icon: Buildings },
  // Mirrors UserManager's allowedLevelsFor(): an EMPLOYEE gets an empty allowed-levels list and
  // UserManager renders nothing for them — hiding the nav entry here avoids sending them to a
  // page that would just be blank (the backend's GET /users 403s EMPLOYEE too either way).
  { href: "/dashboard/users", label: "Nhân sự", icon: UsersThree, roles: ["EXECUTIVE", "DEPARTMENT_HEAD", "TEAM_LEAD"] },
  { href: "/dashboard/tasks", label: "Công việc", icon: ClipboardText },
  { href: "/dashboard/messages", label: "Tin nhắn", icon: ChatCircle },
  { href: "/dashboard/calendar", label: "Lịch của tôi", icon: CalendarBlank },
  { href: "/dashboard/notes", label: "Note của tôi", icon: NotePencil },
  { href: "/dashboard/drive", label: "Google Drive", icon: HardDrives },
];

const STORAGE_KEY = "sidebar-collapsed";

/**
 * Fixed left column on desktop, a horizontal scrollable bar on small screens — "don't break
 * layout on mobile" rather than a fully-optimized mobile nav (CLAUDE.md section 24; see the
 * UI meeting notes for why a hamburger/drawer wasn't built at this stage). The collapse toggle
 * only affects the desktop column (icon-only, `title` as a hover tooltip, same pattern as the
 * header's icon cluster) — the mobile bar is already compact, so collapsing it buys nothing.
 *
 * Icons are Phosphor SVGs, not emoji — emoji render inconsistently across OS/browser and read
 * as decorative rather than a real icon set in a professional/enterprise UI (UI/UX design
 * review pass referencing nextlevelbuilder/ui-ux-pro-max-skill's icon guidance).
 */
interface SidebarProps {
  currentUserAuthorityLevel: AuthorityLevel;
}

export function Sidebar({ currentUserAuthorityLevel }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(currentUserAuthorityLevel));

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Private browsing / blocked storage — default to expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Nothing else to do if storage is unavailable — the choice just won't persist.
      }
      return next;
    });
  }

  return (
    <nav
      aria-label="Điều hướng chính"
      className={`flex gap-1 overflow-x-auto border-b border-gray-200 bg-white p-2 md:flex-none md:flex-col md:border-b-0 md:border-r md:p-4
        ${collapsed ? "md:w-16" : "md:w-56"}`}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Mở rộng" : "Thu gọn"}
        aria-label={collapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"}
        className="mb-1 hidden items-center justify-center gap-1 rounded px-3 py-2 text-sm text-gray-500 transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:flex"
      >
        {collapsed ? <CaretRight size={16} /> : <><CaretLeft size={16} /> Thu gọn</>}
      </button>

      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-all duration-150
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
              ${collapsed ? "md:justify-center" : ""}
              ${isActive ? "gradient-surface bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground shadow-sm" : `text-gray-700 hover:bg-surface-muted ${collapsed ? "" : "hover:pl-4"}`}`}
          >
            <Icon size={18} weight={isActive ? "fill" : "regular"} aria-hidden className="shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
