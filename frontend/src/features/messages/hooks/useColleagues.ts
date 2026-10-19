import type { PresenceStatus, UserProfile } from "@/features/auth/types";
import { useDepartmentMembers, useUsers } from "@/features/organization/hooks/useOrganization";

export interface Colleague {
  userId: number;
  fullName: string;
  title: string | null;
  email: string | null;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus;
}

/**
 * People the current user can start a chat with: their own department, or - for an executive, who belongs to no
 * department - everyone active in the company. Never includes the user themselves. `companyWide` tells which list it is;
 * `available` is false for someone with neither (no department and not an executive).
 */
export function useColleagues(currentUser: UserProfile): { colleagues: Colleague[]; companyWide: boolean; available: boolean } {
  const companyWide = currentUser.departmentId == null && currentUser.authorityLevel === "EXECUTIVE";
  const { data: members } = useDepartmentMembers(currentUser.departmentId);
  const { data: users } = useUsers(companyWide);

  const people: Colleague[] = companyWide
    ? (users ?? [])
        .filter((u) => u.active)
        .map((u) => ({ userId: u.id, fullName: u.fullName, title: u.title, email: null, avatarUrl: u.avatarUrl, presenceStatus: u.presenceStatus }))
    : (members ?? []);

  return {
    colleagues: people.filter((person) => person.userId !== currentUser.userId),
    companyWide,
    available: currentUser.departmentId != null || companyWide,
  };
}
