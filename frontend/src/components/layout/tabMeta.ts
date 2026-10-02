import { Buildings, GearSix } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { NAV_ITEMS } from "./Sidebar";

/** Derives a tab's label/icon from its virtual path - checks the exact Sidebar destinations
 * first, then a couple of known sub-routes (department detail) that aren't literal nav entries. */
export function describeTab(path: string): { label: string; icon: Icon } {
  const [pathname] = path.split("?");
  const exact = NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return { label: exact.label, icon: exact.icon };

  if (pathname?.startsWith("/dashboard/departments/")) {
    return { label: "Phòng ban", icon: Buildings };
  }

  // Settings is reached from the avatar menu, so it has no Sidebar entry of its own.
  if (pathname === "/dashboard/settings") {
    return { label: "Cài đặt", icon: GearSix };
  }

  // Fallback - Home itself ("/dashboard") is also covered by the NAV_ITEMS match above.
  const home = NAV_ITEMS.find((item) => item.href === "/dashboard")!;
  return { label: home.label, icon: home.icon };
}
