import type { AuthorityLevel } from "@/features/auth/types";

/** Mirrors UserManagementServiceImpl.assertCallerCanGrant on the backend - for UX only, the
 * backend re-checks independently (CLAUDE.md section 9). Used by both "add user" and "invite by email". */
export function allowedLevelsFor(callerLevel: AuthorityLevel): AuthorityLevel[] {
  switch (callerLevel) {
    case "EXECUTIVE":
      return ["EXECUTIVE", "DEPARTMENT_HEAD", "TEAM_LEAD", "EMPLOYEE"];
    case "DEPARTMENT_HEAD":
      return ["TEAM_LEAD", "EMPLOYEE"];
    case "TEAM_LEAD":
      return ["EMPLOYEE"];
    default:
      return [];
  }
}
