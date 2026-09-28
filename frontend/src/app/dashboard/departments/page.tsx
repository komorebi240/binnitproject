"use client";

import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { DepartmentManager } from "@/features/organization/components/DepartmentManager";

export default function DepartmentsPage() {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;
  return <DepartmentManager currentUser={currentUser} />;
}
