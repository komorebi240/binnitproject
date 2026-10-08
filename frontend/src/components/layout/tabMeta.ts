import { AddressBook, Briefcase, Buildings, GearSix, Handshake } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { NAV_ITEMS } from "./Sidebar";

/** Derives a tab's label/icon from its virtual path - checks the exact Sidebar destinations
 * first, then a couple of known sub-routes (department detail) that aren't literal nav entries. */
export function describeTab(path: string): { labelKey: TranslationKey; icon: Icon } {
  const [pathname] = path.split("?");
  const exact = NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return { labelKey: exact.labelKey, icon: exact.icon };

  if (pathname?.startsWith("/dashboard/departments/")) {
    return { labelKey: "common.departments", icon: Buildings };
  }

  if (pathname?.startsWith("/dashboard/projects/")) {
    return { labelKey: "common.projects", icon: Handshake };
  }

  if (pathname?.startsWith("/dashboard/crm/")) {
    return { labelKey: "crm.nav.label", icon: AddressBook };
  }

  // The company page is reached from the company badge in the header.
  if (pathname === "/dashboard/company") {
    return { labelKey: "layout.featureSearch.company", icon: Briefcase };
  }

  // Settings is reached from the avatar menu, so it has no Sidebar entry of its own.
  if (pathname === "/dashboard/settings") {
    return { labelKey: "common.settings", icon: GearSix };
  }

  // Fallback - Home itself ("/dashboard") is also covered by the NAV_ITEMS match above.
  const home = NAV_ITEMS.find((item) => item.href === "/dashboard")!;
  return { labelKey: home.labelKey, icon: home.icon };
}
