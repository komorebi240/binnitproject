"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/useAuth";

const LEVEL_LABELS: Record<string, string> = {
  EXECUTIVE: "Điều hành",
  DEPARTMENT_HEAD: "Trưởng phòng",
  TEAM_LEAD: "Trưởng nhóm",
  EMPLOYEE: "Nhân viên",
};

/**
 * Shared shell for every /dashboard/* page: auth gate (redirect to /login on a 401), header,
 * and the Sidebar nav. Individual pages just render their own panel — see
 * CLAUDE.md section 46.2 (feature components, not pages, own the actual UI logic).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="animate-pulse p-4 sm:p-8">
        <div className="mb-6 h-6 w-48 rounded bg-gray-200" />
        <div className="h-40 rounded bg-gray-100" />
      </div>
    );
  }

  if (!currentUser) {
    return null; // redirecting to /login
  }

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-8">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{currentUser.companyName}</h1>
          <p className="text-sm text-gray-500">
            {currentUser.fullName} — {currentUser.title ?? LEVEL_LABELS[currentUser.authorityLevel]}
            {currentUser.departmentName ? ` · ${currentUser.departmentName}` : ""}
            {currentUser.teamName ? ` · ${currentUser.teamName}` : ""}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout} loading={logout.isPending}>
          Đăng xuất
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 px-4 py-6 sm:px-8">
          {/* key={pathname} replays the fade-in on every page change — motion for
              navigation feedback (CLAUDE.md section 25), not decoration. */}
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
