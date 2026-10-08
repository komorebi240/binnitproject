import { Briefcase, GearSix } from "@phosphor-icons/react";
import type { AuthorityLevel } from "@/features/auth/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { matchesAllWords } from "@/lib/textMatch";
import { NAV_ITEMS, type NavItem } from "./Sidebar";

/** A smaller feature that lives inside a page (a button, a form, a setting). Opening it opens the parent page. */
export interface SubFeature {
  labelKey: TranslationKey;
  /** Extra words people may type for it (matched like the label, never shown). */
  keywords?: string;
  roles?: AuthorityLevel[];
}

export interface FeatureEntry extends NavItem {
  /** Extra words people may type for the page itself (never shown). */
  keywords?: string;
  children: SubFeature[];
}

const MANAGERS: AuthorityLevel[] = ["EXECUTIVE", "DEPARTMENT_HEAD", "TEAM_LEAD"];

/** Sub-features by page. When a page gains a feature, add it here (and to the tour in tourSteps) so search stays complete. */
const CHILDREN_BY_HREF: Record<string, SubFeature[]> = {
  "/dashboard": [
    { labelKey: "layout.featureSearch.workloadThisMonth", keywords: "thong ke" },
    { labelKey: "common.completionRate", keywords: "thong ke" },
    { labelKey: "common.thisMonthSKpi", keywords: "diem" },
    { labelKey: "layout.featureSearch.tasksCompletedLast7Days", keywords: "thong ke bieu do" },
    { labelKey: "layout.featureSearch.taskBoardToDoInProgress", keywords: "kanban cot" },
    { labelKey: "common.viewTasksAsColumns", keywords: "board bang" },
  ],
  "/dashboard/departments": [
    { labelKey: "common.createADepartment", keywords: "them moi", roles: ["EXECUTIVE"] },
    { labelKey: "layout.featureSearch.changeADepartmentSColorAnd", keywords: "ca nhan hoa tuy chinh giao dien", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "layout.featureSearch.departmentStaffDirectory", keywords: "thanh vien" },
    { labelKey: "layout.featureSearch.teamsInADepartment", keywords: "team" },
    { labelKey: "layout.featureSearch.messageAMemberDirectly", keywords: "chat" },
    { labelKey: "common.sendADriveRequest", keywords: "xin quyen thu muc" },
  ],
  "/dashboard/users": [
    { labelKey: "common.addStaff", keywords: "tao tai khoan" },
    { labelKey: "common.inviteStaffByEmail", keywords: "loi moi invite" },
    { labelKey: "layout.featureSearch.changeAPersonSDepartmentAnd", keywords: "chuyen dieu chuyen" },
    { labelKey: "layout.featureSearch.aPersonSKpi", keywords: "diem danh gia" },
    { labelKey: "layout.featureSearch.addACalendarEventForA", keywords: "su kien" },
    { labelKey: "layout.featureSearch.resetAPersonSPassword", keywords: "quen mat khau reset" },
    { labelKey: "layout.featureSearch.changeAPersonSEmail", keywords: "otp" },
    { labelKey: "layout.featureSearch.lockOrUnlockAnAccount", keywords: "vo hieu hoa" },
    { labelKey: "common.deleteAPerson", keywords: "xoa" },
  ],
  "/dashboard/tasks": [
    { labelKey: "common.assignANewTask", keywords: "tao cong viec", roles: MANAGERS },
    { labelKey: "layout.featureSearch.createATaskForYourself", keywords: "ca nhan" },
    { labelKey: "layout.featureSearch.checklistInATask", keywords: "danh sach tick" },
    { labelKey: "layout.featureSearch.attachFilesWhenAssigningATask", keywords: "file tai lieu" },
    { labelKey: "layout.featureSearch.acceptOrDeclineATask", keywords: "chap nhan" },
    { labelKey: "layout.featureSearch.completeATask", keywords: "xong" },
    { labelKey: "layout.featureSearch.filterByPriorityAndDeadline", keywords: "deadline" },
  ],
  "/dashboard/projects": [
    { labelKey: "layout.featureSearch.createACrossDepartmentProject", keywords: "project phoi hop", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "common.inviteASupportingDepartment", keywords: "phoi hop cheo", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "layout.featureSearch.acceptOrDeclineAProjectInvitation", keywords: "chap nhan", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "layout.featureSearch.addPeopleFromYourDepartmentTo", keywords: "thanh vien", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "common.projectTasks", keywords: "giao viec" },
    { labelKey: "layout.featureSearch.projectTeamChat", keywords: "chat nhom" },
    { labelKey: "layout.featureSearch.aProjectSSharedDriveFolder", keywords: "chia se tep" },
    { labelKey: "layout.featureSearch.projectMemberDirectory", keywords: "lien he nhan tin" },
  ],
  "/dashboard/crm": [
    { labelKey: "crm.search.createDataset", keywords: "khach hang nguon", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "crm.search.importFile", keywords: "excel word csv nhap", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "crm.search.templates", keywords: "mau file", roles: ["EXECUTIVE", "DEPARTMENT_HEAD"] },
    { labelKey: "crm.search.addCustomer", keywords: "them khach" },
    { labelKey: "crm.search.editCells", keywords: "sua o bang" },
    { labelKey: "crm.search.export", keywords: "xuat excel", roles: ["EXECUTIVE"] },
    { labelKey: "crm.search.auditLog", keywords: "nhat ky", roles: ["EXECUTIVE"] },
  ],
  "/dashboard/messages": [
    { labelKey: "common.directMessages", keywords: "chat" },
    { labelKey: "common.findColleaguesInYourDepartment", keywords: "nguoi" },
    { labelKey: "layout.featureSearch.sendImagesAndFiles", keywords: "dinh kem hinh" },
    { labelKey: "layout.featureSearch.recallAMessage", keywords: "xoa" },
    { labelKey: "layout.featureSearch.archiveAConversation", keywords: "archive" },
  ],
  "/dashboard/calendar": [
    { labelKey: "common.addAnEvent", keywords: "hop lich" },
    { labelKey: "layout.featureSearch.multiDayBusinessTripFromDate", keywords: "di cong tac keo dai" },
    { labelKey: "common.upcomingEvents", keywords: "lich sap toi" },
    { labelKey: "layout.featureSearch.acceptOrDeclineAnEvent", keywords: "xac nhan" },
  ],
  "/dashboard/notes": [
    { labelKey: "layout.featureSearch.createANewNote", keywords: "ghi chu" },
    { labelKey: "layout.featureSearch.expandANote", keywords: "xem lon" },
    { labelKey: "layout.featureSearch.pinANoteToTheScreen", keywords: "pin" },
  ],
  "/dashboard/drive": [
    { labelKey: "common.connectGoogleDrive", keywords: "lien ket" },
    { labelKey: "layout.featureSearch.requestFolderAccess", keywords: "xin quyen" },
    { labelKey: "layout.featureSearch.approveAnAccessRequest", keywords: "phe duyet", roles: MANAGERS },
  ],
};

const SETTINGS_ENTRY: FeatureEntry = {
  href: "/dashboard/settings",
  labelKey: "common.settings",
  icon: GearSix,
  children: [
    { labelKey: "common.changePassword", keywords: "bao mat" },
    { labelKey: "layout.featureSearch.profilePhoto", keywords: "avatar hinh" },
    { labelKey: "layout.featureSearch.recoveryEmail", keywords: "quen mat khau" },
    { labelKey: "layout.featureSearch.lightDarkModeAndThemeColor", keywords: "theme dark light" },
  ],
};

const COMPANY_ENTRY: FeatureEntry = {
  href: "/dashboard/company",
  labelKey: "layout.featureSearch.company",
  icon: Briefcase,
  keywords: "gioi thieu doanh nghiep",
  children: [
    { labelKey: "layout.featureSearch.companyOverview", keywords: "mo ta" },
    { labelKey: "layout.featureSearch.theCompanySDepartmentList", keywords: "co cau" },
    { labelKey: "layout.featureSearch.editCompanyDetails", keywords: "ten email gioi thieu", roles: ["EXECUTIVE"] },
    { labelKey: "layout.featureSearch.changeTheCompanyLogo", keywords: "hinh anh", roles: ["EXECUTIVE"] },
    { labelKey: "layout.featureSearch.changeTheCompanyCoverImage", keywords: "banner hinh anh", roles: ["EXECUTIVE"] },
  ],
};

export const FEATURES: FeatureEntry[] = [
  ...NAV_ITEMS.map((item) => ({ ...item, children: CHILDREN_BY_HREF[item.href] ?? [] })),
  COMPANY_ENTRY,
  SETTINGS_ENTRY,
];

export interface FeatureGroup {
  entry: FeatureEntry;
  /** True when the page itself matched (or no query was typed). */
  pageMatches: boolean;
  /** The sub-features that matched, shown under their page. */
  children: SubFeature[];
}

function canSee(roles: AuthorityLevel[] | undefined, level: AuthorityLevel): boolean {
  return !roles || roles.includes(level);
}

/**
 * Pages whose own name matches, plus pages that contain a matching sub-feature (listed first, with the
 * matching sub-features underneath). With no query every page is returned, collapsed. Names are matched in the
 * language of `t`; the hidden `keywords` are plain unaccented words that work in either language.
 */
export function searchFeatures(
  query: string,
  level: AuthorityLevel,
  t: (key: TranslationKey) => string,
  features: FeatureEntry[] = FEATURES,
): FeatureGroup[] {
  const trimmed = query.trim();
  const groups: FeatureGroup[] = [];
  for (const entry of features) {
    if (!canSee(entry.roles, level)) continue;
    if (!trimmed) {
      groups.push({ entry, pageMatches: true, children: [] });
      continue;
    }
    const pageMatches = matchesAllWords(`${t(entry.labelKey)} ${entry.keywords ?? ""}`, trimmed);
    const children = entry.children.filter(
      (child) => canSee(child.roles, level) && matchesAllWords(`${t(child.labelKey)} ${child.keywords ?? ""}`, trimmed),
    );
    if (pageMatches || children.length > 0) groups.push({ entry, pageMatches, children });
  }
  return groups;
}
