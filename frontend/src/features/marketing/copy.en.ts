import type { MarketingCopy } from "./copy.types";

/** The English version of copy.vi.ts: same claims, same order, same lists. */
export const EN: MarketingCopy = {
  locale: "en",
  meta: {
    title: "Orbit - Bring your business back into orbit",
    description:
      "Orbit gathers work, people, projects and KPIs from across your company in one place: assign work, coordinate across departments, message colleagues, plan on a calendar and manage permissions by organization structure.",
    ogLocale: "en_US",
  },
  a11y: {
    skipToContent: "Skip to content",
    backToTop: "Orbit - back to the top",
    sections: "Sections of this page",
    footerLinks: "Footer links",
    glimpse: "Interface illustration",
  },
  nav: [
    { href: "#features", label: "Features" },
    { href: "#solutions", label: "Solutions" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#security", label: "Security" },
  ],
  header: { signIn: "Sign in", start: "Get started" },
  hero: {
    eyebrow: "The business operations platform",
    titleBefore: "Bring your business back into",
    titleEmphasis: "orbit.",
    text: "Orbit gathers work, people, projects and numbers from across the company in one place, so every department moves to the same beat and no one drifts off course.",
    primaryCta: "Bring my business into orbit",
    secondaryCta: "See what Orbit does",
    hasAccount: "Already have an account?",
    signIn: "Sign in",
  },
  glimpse: {
    eyebrow: "See the progress. Find your rhythm.",
    title: "Know where every task stands.",
    text: "From to do to done: every task has a place, and everyone knows what comes next.",

    windowTitle: "My tasks",
    caption: "An illustration of Orbit's task board with sample data.",
    priority: { high: "High", medium: "Medium", low: "Low" },
    columns: [
      {
        name: "To do",
        tasks: [
          { title: "Prepare a quote for the client", who: "SA", priority: "high" },
          { title: "Schedule interviews for the hiring round", who: "HR", priority: "medium" },
        ],
      },
      {
        name: "In progress",
        tasks: [
          { title: "Finish the user guide", who: "EN", priority: "medium" },
          { title: "Test the new release", who: "EN", priority: "high" },
        ],
      },
      {
        name: "Done",
        tasks: [
          { title: "Reconcile last month's figures", who: "FI", priority: "low" },
          { title: "Update the staff directory", who: "HR", priority: "low" },
        ],
      },
    ],
  },
  problem: {
    eyebrow: "Solutions",
    title: "Businesses usually drift off orbit over small things",
    text: "When work, people and numbers are scattered across many places, no one is wrong, but the whole company slowly loses pace. Orbit puts everything around one center.",
    offTitle: "Without Orbit",
    off: [
      "Work is handed out in chat messages, then sinks between conversations.",
      "No one is sure who is doing what, or which deadline is coming up.",
      "Cross-department projects have no shared place to coordinate.",
      "Performance is judged by feel: hard to measure and hard to keep fair.",
    ],
    inTitle: "With everything back in orbit",
    in: [
      "Every task has an owner, a deadline, a priority and a checklist.",
      "Everyone sees their own work at once; managers get the full picture without asking each person.",
      "Cross-department projects get a shared home for tasks, conversation and members.",
      "Monthly KPIs are calculated from real work, with a formula set by the executive team.",
    ],
  },
  features: {
    eyebrow: "Features",
    title: "Everything a business needs to run, in one place",
    text: "From tasks and customers to meetings, attendance, leave and finance with access controls.",
    items: [
      {
        title: "Assign and track work",
        text: "Assign work to one person or a whole department, with priority, deadline, checklist and attachments. Recipients accept, decline or complete it right on the board, and are notified when new work arrives.",
      },
      {
        title: "KPIs and statistics",
        text: "A monthly KPI score, completion rate, workload and a chart of the last 7 days. The KPI formula is set by the executive team.",
      },
      {
        title: "Cross-department projects",
        text: "One department leads, others are invited to support. Every project has its own tasks, conversation channel and member directory.",
      },
      {
        title: "Structure and permissions",
        text: "Company, departments, teams. Four authority levels: executive, department head, team lead and employee; each level sees and does only its own part.",
      },
      {
        title: "Internal messaging",
        text: "Direct messages, images and files, and message recall. Find a colleague in your department in a few keystrokes.",
      },
      {
        title: "Calendar and business trips",
        text: "A personal calendar, upcoming events and multi-day business trips. Managers can propose events that employees accept or decline.",
      },
      {
        title: "Notes and focus",
        text: "Card-style notes you can pin so they float on every page, plus a Pomodoro timer for deep work without leaving Orbit.",
      },
      {
        title: "Work your way",
        text: "Multiple tabs, split screen, quick search with Ctrl+K, four themes (light, dark, gray and pink) and a step-by-step guided tour.",
      },
      {
        title: "Company page",
        text: "One shared page for the whole company: a cover image, a description and the departments with their own icons and colours, so newcomers know where they are.",
      },
      {
        title: "Meet with colleagues",
        text: "Schedule meetings, invite colleagues or whole departments and teams, receive invitations in Orbit, then open Google Meet. You supply the meeting link; Orbit does not create a room.",
      },
      {
        title: "Attendance and leave",
        text: "Record check-in and check-out times and review monthly attendance. Submit leave requests, check allowances and approval results; approved leave appears on your calendar.",
      },
      {
        title: "Finance with access controls",
        text: "Prepare payslips, record income and expenses, and review cash flow reports with finance access. Payslips go to the CEO for approval before payment.",
      },
      {
        title: "Customers and whiteboards",
        text: "Organize customer data in CRM and use whiteboards to sketch ideas alongside your team’s tasks and projects.",
      },
    ],
  },
  steps: {
    eyebrow: "How it works",
    title: "From sign-up to running in three steps",
    items: [
      {
        title: "Create your company's workspace",
        text: "Register your company, verify your email and receive the first administrator account.",
      },
      {
        title: "Build the structure and invite people",
        text: "Create departments and teams, invite staff by email or add them directly, then assign positions and permissions.",
      },
      {
        title: "Run in orbit",
        text: "Assign work, track progress, coordinate projects and review KPIs every month, all in one place.",
      },
    ],
  },
  roles: {
    explore: "Choose a role to explore its workspace.",
    scope: ["The whole company", "Your department", "Your team", "Your own work"],
    eyebrow: "For the whole organization",
    title: "Everyone has a place, all in the same orbit",
    text: "What people can see and do follows their position, so everyone has what they need for their part of the work, and no more.",
    items: [
      {
        name: "Executive team",
        text: "See the whole company: departments, staff and cross-department projects. Set the KPI formula and manage the structure and accounts.",
      },
      {
        name: "Department heads",
        text: "Manage your department: assign work, follow your staff, lead projects or accept invitations to join them.",
      },
      {
        name: "Team leads",
        text: "Assign work and follow progress right inside your team.",
      },
      {
        name: "Employees",
        text: "One place for my work: receive tasks, checklists, calendar, notes and messages to colleagues.",
      },
    ],
  },
  security: {
    labels: ["Your own workspace", "The right access", "Protected sign-ins", "Recover your access"],
    eyebrow: "Security",
    title: "Your company's data belongs only to you",
    text: "Orbit is built security-first: permissions are checked on the server and every company is its own data boundary.",
    items: [
      "Every company is its own workspace: data is fully separated between companies.",
      "Permissions are checked on the server, not just in the interface.",
      "Passwords are hashed one-way, sessions use httpOnly cookies and login attempts are rate-limited.",
      "Forgot your password? A one-time code is sent to your registered email.",
    ],
  },
  finalCta: {
    title: "What’s next?\nBring your team into orbit.",
    text: "You have seen how Orbit works. Now create a workspace for your company and start your first task.",
    primary: "Get started with Orbit",
    secondary: "I already have an account",
  },
};
