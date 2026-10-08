import type { AuthorityLevel } from "@/features/auth/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";

export interface TourStep {
  id: string;
  /** Value of the `data-tour` attribute to spotlight; omitted = centered card. */
  target?: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const nav = (href: string) => `nav:${href}`;

const WELCOME_ADMIN: TourStep = {
  id: "welcome",
  titleKey: "onboarding.tourSteps.welcomeToOrbit",
  bodyKey: "onboarding.tourSteps.aFewQuickStepsToGet",
};

const WELCOME_STAFF: TourStep = {
  id: "welcome",
  titleKey: "onboarding.tourSteps.welcomeToOrbit",
  bodyKey: "onboarding.tourSteps.aShortTourOfThePlaces",
};

const TASKS: TourStep = {
  id: "tasks",
  target: nav("/dashboard/tasks"),
  titleKey: "common.tasks",
  bodyKey: "onboarding.tourSteps.acceptOrDeclineTheTasksYou",
};

const MESSAGES: TourStep = {
  id: "messages",
  target: nav("/dashboard/messages"),
  titleKey: "common.messages",
  bodyKey: "onboarding.tourSteps.oneToOneChatWithColleagues",
};

const CALENDAR: TourStep = {
  id: "calendar",
  target: nav("/dashboard/calendar"),
  titleKey: "common.myCalendar",
  bodyKey: "onboarding.tourSteps.seeTheMonthSCalendarAnd",
};

const SEARCH: TourStep = {
  id: "search",
  target: "search",
  titleKey: "common.quickSearch",
  bodyKey: "onboarding.tourSteps.clickOrPressCtrlKThen",
};

const PROJECTS: TourStep = {
  id: "projects",
  target: nav("/dashboard/projects"),
  titleKey: "onboarding.tourSteps.crossDepartmentProjects",
  bodyKey: "onboarding.tourSteps.whenAJobNeedsSeveralDepartments",
};

const CRM: TourStep = {
  id: "crm",
  target: nav("/dashboard/crm"),
  titleKey: "crm.tour.title",
  bodyKey: "crm.tour.body",
};

const NOTES: TourStep = {
  id: "notes",
  target: nav("/dashboard/notes"),
  titleKey: "common.myNotes",
  bodyKey: "onboarding.tourSteps.yourPrivateNotesShownAsCards",
};

const TIMER: TourStep = {
  id: "timer",
  target: "timer",
  titleKey: "common.focusTimer",
  bodyKey: "onboarding.tourSteps.aPomodoroTimerFocusedWorkIn",
};

const NOTIFICATIONS: TourStep = {
  id: "notifications",
  target: "notifications",
  titleKey: "common.notifications",
  bodyKey: "onboarding.tourSteps.newTasksPeopleAcceptingOrCompleting",
};

const BOARD_VIEW: TourStep = {
  id: "board-view",
  target: "board-view",
  titleKey: "onboarding.tourSteps.viewTasksAsColumns",
  bodyKey: "onboarding.tourSteps.switchTheHomePageBetweenThe",
};

const SPLIT_SCREEN: TourStep = {
  id: "split-screen",
  target: "split-screen",
  titleKey: "common.splitScreen",
  bodyKey: "onboarding.tourSteps.openTwoPagesSideBySide",
};

const COMPANY: TourStep = {
  id: "company-page",
  target: "company",
  titleKey: "onboarding.tourSteps.companyPage",
  bodyKey: "onboarding.tourSteps.clickTheLogoOrTheCompany",
};

const DEPARTMENTS: TourStep = {
  id: "departments-browse",
  target: nav("/dashboard/departments"),
  titleKey: "common.departments",
  bodyKey: "onboarding.tourSteps.seeTheDepartmentsAndEachDepartment",
};

const PROFILE: TourStep = {
  id: "profile",
  target: "profile",
  titleKey: "common.accountMenu",
  bodyKey: "onboarding.tourSteps.clickYourProfilePhotoToSwitch",
};

const ADMIN_STEPS: TourStep[] = [
  WELCOME_ADMIN,
  COMPANY,
  {
    id: "company",
    target: "profile",
    titleKey: "onboarding.tourSteps.setUpYourCompany",
    bodyKey: "onboarding.tourSteps.clickYourProfilePhotoSettingsOr",
  },
  {
    id: "departments",
    target: nav("/dashboard/departments"),
    titleKey: "onboarding.tourSteps.departmentsTeams",
    bodyKey: "onboarding.tourSteps.buildTheStructureFirstClickCreate",
  },
  {
    id: "users",
    target: nav("/dashboard/users"),
    titleKey: "onboarding.tourSteps.inviteStaff",
    bodyKey: "onboarding.tourSteps.inStaffClickInviteByEmail",
  },
  TASKS,
  PROJECTS,
  CRM,
  MESSAGES,
  CALENDAR,
  NOTES,
  {
    id: "drive",
    target: nav("/dashboard/drive"),
    titleKey: "layout.sidebar.googleDrive",
    bodyKey: "onboarding.tourSteps.connectDriveAndManageFolderAccess",
  },
  SEARCH,
  NOTIFICATIONS,
  TIMER,
  BOARD_VIEW,
  SPLIT_SCREEN,
  {
    id: "done",
    titleKey: "onboarding.tourSteps.youReReady",
    bodyKey: "onboarding.tourSteps.firstThingsToDoCreateA",
  },
];

const MANAGER_STEPS: TourStep[] = [
  WELCOME_STAFF,
  COMPANY,
  {
    id: "users",
    target: nav("/dashboard/users"),
    titleKey: "onboarding.tourSteps.yourStaff",
    bodyKey: "onboarding.tourSteps.seeTheStaffYouManageClick",
  },
  DEPARTMENTS,
  TASKS,
  PROJECTS,
  CRM,
  MESSAGES,
  CALENDAR,
  NOTES,
  SEARCH,
  NOTIFICATIONS,
  TIMER,
  SPLIT_SCREEN,
  PROFILE,
  {
    id: "done",
    titleKey: "onboarding.tourSteps.youReReady",
    bodyKey: "onboarding.tourSteps.youCanWatchThisGuideAgain",
  },
];

const EMPLOYEE_STEPS: TourStep[] = [
  WELCOME_STAFF,
  COMPANY,
  DEPARTMENTS,
  TASKS,
  PROJECTS,
  CRM,
  MESSAGES,
  CALENDAR,
  NOTES,
  SEARCH,
  NOTIFICATIONS,
  TIMER,
  BOARD_VIEW,
  SPLIT_SCREEN,
  {
    id: "priority",
    target: "priority",
    titleKey: "common.prioritySuggestions",
    bodyKey: "onboarding.tourSteps.yourToDoListGroupedBy",
  },
  PROFILE,
  {
    id: "done",
    titleKey: "onboarding.tourSteps.youReReady",
    bodyKey: "onboarding.tourSteps.youCanWatchThisGuideAgain",
  },
];

export function tourStepsFor(level: AuthorityLevel): TourStep[] {
  switch (level) {
    case "EXECUTIVE":
      return ADMIN_STEPS;
    case "DEPARTMENT_HEAD":
    case "TEAM_LEAD":
      return MANAGER_STEPS;
    default:
      return EMPLOYEE_STEPS;
  }
}
