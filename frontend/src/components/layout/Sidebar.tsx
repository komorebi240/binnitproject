"use client";

import { useEffect, useState } from "react";
import { useTabs } from "./TabsContext";
import {
  AddressBook,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChatCircle,
  ClipboardText,
  HardDrives,
  Handshake,
  House,
  NotePencil,
  UsersThree,
  Buildings,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { AuthorityLevel } from "@/features/auth/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";

import { useI18n } from "@/lib/i18n/useI18n";
export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: Icon;
  /** Omit to show for every authenticated role; otherwise only these roles see the item. */
  roles?: AuthorityLevel[];
}

/** Exported so QuickSearch.tsx can search the same destinations instead of duplicating this list. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "layout.sidebar.home", icon: House },
  { href: "/dashboard/departments", labelKey: "common.departments", icon: Buildings },
  // Mirrors UserManager's allowedLevelsFor(): an EMPLOYEE gets an empty allowed-levels list and
  // UserManager renders nothing for them - hiding the nav entry here avoids sending them to a
  // page that would just be blank (the backend's GET /users 403s EMPLOYEE too either way).
  { href: "/dashboard/users", labelKey: "common.staff", icon: UsersThree, roles: ["EXECUTIVE", "DEPARTMENT_HEAD", "TEAM_LEAD"] },
  { href: "/dashboard/tasks", labelKey: "common.tasks", icon: ClipboardText },
  { href: "/dashboard/projects", labelKey: "common.projects", icon: Handshake },
  { href: "/dashboard/crm", labelKey: "crm.nav.label", icon: AddressBook },
  { href: "/dashboard/messages", labelKey: "common.messages", icon: ChatCircle },
  { href: "/dashboard/calendar", labelKey: "common.myCalendar", icon: CalendarBlank },
  { href: "/dashboard/notes", labelKey: "common.myNotes", icon: NotePencil },
  { href: "/dashboard/drive", labelKey: "layout.sidebar.googleDrive", icon: HardDrives },
];

const STORAGE_KEY = "sidebar-collapsed";

/**
 * Fixed left column on desktop, a horizontal scrollable bar on small screens - "don't break
 * layout on mobile" rather than a fully-optimized mobile nav (CLAUDE.md section 24; see the
 * UI meeting notes for why a hamburger/drawer wasn't built at this stage). The collapse toggle
 * only affects the desktop column (icon-only, `title` as a hover tooltip, same pattern as the
 * header's icon cluster) - the mobile bar is already compact, so collapsing it buys nothing.
 *
 * Icons are Phosphor SVGs, not emoji - emoji render inconsistently across OS/browser and read
 * as decorative rather than a real icon set in a professional/enterprise UI (UI/UX design
 * review pass referencing nextlevelbuilder/ui-ux-pro-max-skill's icon guidance).
 */
interface SidebarProps {
  currentUserAuthorityLevel: AuthorityLevel;
}

// Labels fade and shrink to zero width (rather than toggling display) so collapsing animates.
const LABEL_TRANSITION = "overflow-hidden whitespace-nowrap md:transition-[max-width,opacity] md:duration-300 md:ease-in-out";

export function Sidebar({ currentUserAuthorityLevel }: SidebarProps) {
  const { t } = useI18n();
  const { activeTab, navigateActiveTab } = useTabs();
  const pathname = activeTab.path.split("?")[0];
  const [collapsed, setCollapsed] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(currentUserAuthorityLevel));

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Private browsing / blocked storage - default to expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Nothing else to do if storage is unavailable - the choice just won't persist.
      }
      return next;
    });
  }

  return (
    <nav
      aria-label={t("layout.sidebar.mainNavigation")}
      className={`glass-bar flex gap-1 overflow-x-auto border-b p-2 md:flex-none md:flex-col md:overflow-x-hidden md:border-b-0 md:border-r md:transition-[width,padding] md:duration-300 md:ease-in-out
        ${collapsed ? "md:w-16 md:p-2" : "md:w-56 md:p-4"}`}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? t("layout.sidebar.expand") : t("common.collapse")}
        aria-label={collapsed ? t("layout.sidebar.expandNavigation") : t("layout.sidebar.collapseNavigation")}
        className="mb-1 hidden items-center justify-center gap-1 rounded px-3 py-2 text-sm text-fg-muted transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:flex"
      >
        {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
        <span className={`${LABEL_TRANSITION} ${collapsed ? "md:max-w-0 md:opacity-0" : "md:max-w-24 md:opacity-100"}`}>{t("common.collapse")}</span>
      </button>

      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => navigateActiveTab(item.href)}
            data-tour={`nav:${item.href}`}
            title={collapsed ? t(item.labelKey) : undefined}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-left text-sm font-medium transition-all duration-150
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
              ${collapsed ? "md:justify-center" : ""}
              ${isActive ? "glass-button bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground" : `text-fg-soft hover:bg-surface-muted ${collapsed ? "" : "hover:pl-4"}`}`}
          >
            <Icon size={18} weight={isActive ? "fill" : "regular"} aria-hidden className="shrink-0" />
            <span className={`${LABEL_TRANSITION} ${collapsed ? "md:max-w-0 md:opacity-0" : "md:max-w-40 md:opacity-100"}`}>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
