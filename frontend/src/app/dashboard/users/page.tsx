"use client";

import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { UserManager } from "@/features/organization/components/UserManager";

export default function UsersPage() {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;
  return <UserManager currentUser={currentUser} />;
}
