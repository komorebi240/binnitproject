# Orbit - Product Specification

> **What this is.** The single description of what Orbit does today: who can do what, the rules the server enforces, the
> limits, the data it keeps and its API. It describes behaviour, not history - the phase-by-phase notes (why a decision
> was made, how it was verified) stay in [backend/README.md](../backend/README.md) and
> [frontend/README.md](../frontend/README.md).
>
> **Keeping it current.** Every change that alters behaviour, roles, limits, data or endpoints updates the matching
> section here **in the same change**, and adds a line to the [change log](#25-change-log). A refactor with no visible
> effect needs no edit. When this document and the code disagree, the code is right and this document has a bug.
>
> **Version:** 1.8.6 - 2026-11-01, covering Phases 1-47, workforce, mobile navigation and shared UI refinements.

## Contents

1. [Product overview](#1-product-overview)
2. [Platform and deployment](#2-platform-and-deployment)
3. [Companies, roles and the authorization model](#3-companies-roles-and-the-authorization-model)
4. [Accounts and access](#4-accounts-and-access)
5. [Organization: company, departments, teams, staff](#5-organization-company-departments-teams-staff)
6. [Tasks](#6-tasks)
7. [KPI](#7-kpi)
8. [Cross-department projects](#8-cross-department-projects)
9. [Messages (1-1 chat)](#9-messages-1-1-chat)
10. [Notifications](#10-notifications)
11. [Calendar](#11-calendar)
    - [Meet](#meet)
    [Attendance and leave](#attendance-and-leave)
12. [Notes](#12-notes)
13. [Google Drive folders](#13-google-drive-folders)
14. [Customers (CRM)](#14-customers-crm)
15. [Whiteboards](#15-whiteboards)
16. [Smart select (Alt+S)](#16-smart-select-alts)
17. [File viewer](#17-file-viewer)
18. [Workspace and interface](#18-workspace-and-interface)
19. [Security and privacy](#19-security-and-privacy)
20. [Limits](#20-limits)
21. [Data model](#21-data-model)
22. [API index](#22-api-index)
23. [Non-functional requirements](#23-non-functional-requirements)
24. [Known limitations](#24-known-limitations)
25. [Change log](#25-change-log)

---

## 1. Product overview

Orbit is an internal workspace for companies. Each company that signs up gets its own isolated space in which its
people organise departments and teams, assign and track tasks (with a monthly KPI), run cross-department projects,
chat one to one, keep a calendar and private notes, share Google Drive folders, keep customer data (CRM) and draw
together on whiteboards. A Smart select tool reads any text on screen and turns it into a copy, an analysis, a task,
an event, a note or a whiteboard card; attached Office files open in a tab.

The interface is in **Vietnamese and English**, chosen per browser. The product is a web application; there is no
mobile app (the web interface adapts to phones).

## 2. Platform and deployment

| Part | Technology |
| --- | --- |
| Backend | Java 17, Spring Boot 3.5 (Spring Security 6.5, Hibernate 6.6), Maven |
| Database | SQL Server; schema managed by Flyway migrations `V1`-`V36` |
| Frontend | Next.js 15.5.28 (App Router), React 18, TypeScript, TanStack Query, Tailwind CSS |
| Files | Local disk folders for avatars/logos, chat attachments and task attachments |
| Mail | SMTP (optional); a development mode writes mails to the log instead |

* **Public deployment** (one machine): Cloudflare tunnel -> Next.js server bound to `localhost:3000` -> Spring Boot on
  port 8080 -> SQL Server database `orbit`. The browser only ever talks to the Next.js origin, which forwards `/api/v1/*`
  to the backend (one origin, first-party cookies). Scripts: `run-public.ps1` (build and start, `-SkipBuild`, `-Stop`).
* **Development**: `run-local.ps1` (backend 8081 / frontend 3001 in the private dev setup), database `project_dev`,
  seed accounts from `DevDataSeeder` (dev profile only).
* **Required secrets** (environment, never in the repository): `JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DRIVE_TOKEN_ENCRYPTION_KEY`, `CRM_DATA_KEY`. The backend refuses to start
  without them. SMTP credentials are optional.

## 3. Companies, roles and the authorization model

### 3.1 Tenancy

* Every account belongs to exactly one **company** for life. All data is scoped to a company.
* A request for another company's record is answered **404 Not Found** (its existence is never revealed). A request
  inside the company but outside the caller's scope is **403 Forbidden**, except where a module says otherwise (for
  whiteboards and other private items, "not shared with you" is also 404).
* The company boundary is always derived on the server from the signed-in identity, never from an id the client sends.

### 3.2 Authority levels

| Level | Scope |
| --- | --- |
| `EXECUTIVE` | The whole company. Several people may hold it (CEO, CTO...; distinguished only by job title). |
| `DEPARTMENT_HEAD` | Their own department. A department may have several heads. |
| `TEAM_LEAD` | Their own team (inside a department). |
| `EMPLOYEE` | Their own work. |

A person's level, department, team and job title live in a **position**; moving someone closes the old position and
opens a new one (history is kept).

**System account**: one special account (`is_system_account`, the "internal announcements" bot) may message people of
every company and send a broadcast to all active users. No request can grant this flag. It is hidden from staff
directories.

### 3.3 Rules that apply everywhere

* Authorization is enforced on the server for every request; the interface only hides controls a person cannot use.
* Deleting is a **soft delete** (`is_deleted`) unless a section says otherwise (CRM customers and datasets are really
  deleted because they are personal data; hidden-task rows and whiteboard memberships are removed when undone).
* Every business table carries `created_at`, `created_by`, and where rows change, `updated_at`, `updated_by`.
* Error responses use one envelope `{success:false, error:{code, message}}`; codes are listed per module. Status codes:
  400 validation, 401 not signed in, 403 not allowed, 404 not found, 409 conflict, 413 too large, 422 business rule,
  429 too many requests, 500 unexpected (never with internal detail).

## 4. Accounts and access

### 4.1 Registering a company

1. `request-otp {email}` - a 6-digit code to the address (valid 10 minutes, only the newest counts). The same answer for
   any address, except an address already used by an active account (409 `EMAIL_ALREADY_REGISTERED`).
2. `verify-otp {email, otp}` - at most 5 wrong tries per code; success returns a single-use token valid 30 minutes.
3. `register` - with the token, creates the company and its first **EXECUTIVE** (email = the verified address, job title
   "Quản trị viên"/"Administrator" in the registrant's language) and signs them in. Username `[A-Za-z0-9._-]{3,100}`;
   the current terms of service must be accepted.

Only SHA-256 hashes of codes and tokens are stored.

### 4.2 Invitations

* Managers (EXECUTIVE, DEPARTMENT_HEAD, TEAM_LEAD) invite by email into a level, department and team they could assign
  directly (same scope rules as creating a user). Executives see the company's pending invitations, others their own.
* The link `/invite/{token}` is valid 7 days and works once; revoke and resend (new link, old one dies) are available. A
  new invitation to the same address replaces the earlier one. An address that already belongs to an active account is
  refused (409 `EMAIL_ALREADY_IN_USE`), and re-checked at acceptance.
* Accepting creates the account with the invited company, level, department and team (re-validated at that moment) and
  requires accepting the current terms.

### 4.3 Signing in and staying signed in

* `POST /auth/login` sets two httpOnly, Secure, SameSite=Lax cookies: `__Host-access_token` (a JWT valid **15 minutes**)
  and `__Host-orbit_session` (a random token; only its SHA-256 hash is stored in `auth_sessions`).
* A sign-in lasts until **2 hours without a real action**, **7 days** after signing in, or sign-out - whichever comes
  first. The browser reports real activity (mouse, keyboard, touch, scroll) at most every 5 minutes; background polling
  does not count. When the access token expires, the server renews it from the session after re-reading the person from
  the database, so a changed position or a deactivated account takes effect within 15 minutes.
* A session ends immediately on sign-out, password change (other browsers), password reset (all), deactivation or
  deletion of the account.
* "Remember my username" only pre-fills the name; nobody is ever signed in from a username alone.
* **Sign-in protection**: after **5 failed attempts for a username** or **30 from one address** within 15 minutes,
  further attempts get 429 (even with the right password) until the window passes. Counters are stored in the database
  (`login_failures`) and survive restarts. An unknown username behaves exactly like a known one.

### 4.4 Passwords

* Stored as BCrypt hashes; never logged or returned.
* A new password is 8 characters to **72 bytes** (BCrypt's limit; a Vietnamese letter with a diacritic is 2-3 bytes).
* **Forgot password**: by username or email (an email resolves only when exactly one active account has it); a 6-digit
  code by mail; identical answers for unknown accounts. Rate limits per address and per account.
* **Change password** (signed in): needs the current password.
* **Managers** cannot see or set a staff member's password; they can send the normal reset mail (section 5.4).

### 4.5 Terms of service

* Nobody uses the product without accepting the **newest** terms version. Until then every authenticated request
  except `/auth/**`, `/terms/**` and health checks gets 403 `TERMS_NOT_ACCEPTED`, and the interface shows the terms.
* Acceptances (user, version, time) are kept forever; no IP address is stored. Publishing a new version (texts in both
  languages plus a migration) asks everyone again at their next sign-in.

### 4.6 Profile

Each person edits their own name, phone, avatar (image up to 2 MB, type checked from the bytes), presence status
(`ONLINE`, `LIMITED`, `DO_NOT_DISTURB` - display only, it never suppresses a notification) and recovery email, and can
replay the guided tour.

## 5. Organization: company, departments, teams, staff

### 5.1 Company

* Everyone sees the company page: banner, logo, description (1,000 characters), contact email and the departments.
* Only executives edit the name, contact email and description, and upload the logo and banner (images up to 2 MB,
  10 uploads per hour).

### 5.2 Departments

* Executives create and delete departments; an executive or that department's head edits name (unique in the company),
  description (500), colour and icon (one of the preset keys; 8 colours x 10 icons, 9 ready-made presets).
* **Anyone in the company** can read a department's member directory (name, job title, email, avatar, presence).

### 5.3 Teams

Executives and the department's heads create and delete teams in a department; anyone can read a team's members.

### 5.4 Staff management

Managers act only within their scope (executive: company; department head: own department; team lead: own team) and
never on themselves:

* Create a user (username up to 100, full name 200, phone 30, employee code 50, start date), list users, move a
  person to another position/department/team, lock or unlock sign-in, view their KPI, propose a calendar event.
* **Delete** a user: requires the manager's **own password** (at most 5 attempts per 15 minutes) and ends the person's
  sessions; soft delete.
* **Account recovery**: send the normal password-reset mail; change a person's email with a 6-digit code sent to the
  new address (15 minutes, 5 attempts; the old address is told).

## 6. Tasks

### 6.1 Assignment

* A task goes to **one user** or to **a whole department** (a shared queue). There is no team target.
* Who may assign to whom: an executive to anyone in the company; a department head within their department; a team
  lead to their team's members. **Anyone may give a task to themselves** (it starts accepted, no notification).
* Fields: title (200), description, priority (`LOW`/`MEDIUM`/`HIGH`, default medium), due date, optional Google Drive
  link, optional checklist (up to 30 lines of 200 characters), files (section 6.4), optional project.

### 6.2 Lifecycle

`ASSIGNED -> ACCEPTED | DECLINED -> DONE`, or `CANCELLED` before done.

* The assignee accepts, declines and completes a user task; for a department task only that department's heads or an
  executive act on it (members see it).
* The assigner, or anyone who could have assigned to the same target, may cancel; a cancelled task can be **restored**
  (back to ASSIGNED) or **deleted** (soft) by the same people.
* **Checklist**: lines can be added or removed while ASSIGNED or ACCEPTED, ticked only while ACCEPTED; ticking (or
  removing) the last open line completes the task. A task with open lines cannot be completed manually
  (422 `CHECKLIST_INCOMPLETE`).
* Notifications: the assignee (or the department's heads) on assignment; the assigner on accept, decline and complete.

### 6.3 Who sees which tasks

The task list (`GET /tasks`) shows: for an executive every task of the company; for a department head the tasks of
their department and its people plus their own; for a team lead their team's people plus their own; for an employee
the tasks assigned to them, the ones they assigned, and their department's queue. Anything outside this scope is 404.

"Can manage" a task (change files, the Drive link and the checklist): the assigner, the user assignee, an executive,
or a head of the department a department task was assigned to.

### Task list workspace — 2026-11-01

The Tasks destination opens a compact work list, initially showing ASSIGNED and ACCEPTED tasks.
Personal filters narrow the existing server-authorized list: all in scope, assigned to me (direct
user assignments), or assigned by me (including self/department assignments). Search ignores case
and Vietnamese accents and matches title, description, assignee/department and assigner.

Status controls show Open, Awaiting acceptance, In progress, Completed and Closed (declined or
cancelled), with counts after the other filters. Priority, due-date and sorting controls are
collapsible. Due-date filters include overdue open work, due today, today through six days ahead,
and undated work, based on the Vietnam calendar date. Default order puts overdue open work first,
then work due today, priority, due date and recent creation. Other sorts are due soonest, priority
or newest. Filters are local to the mounted workspace and reset on reload; they are not permissions.

Each row shows the task, due label/checklist progress, assignee, assigner, priority and status.
Accept/complete stays directly available under existing permissions. For accepted tasks with a
checklist, the action opens the detail/checklist flow rather than completing prematurely. Secondary
actions use the existing menu/API. History can hide only the finished records currently displayed
under the filters, with the existing 15-second undo; hidden history does not reappear in the list.
On phones the row condenses into task, assignee, actions and status/priority; assigner remains in
its detail screen. Loading and failure states are explicit, and failures offer retry.

### 6.4 Files and Drive link

* Up to **10 files** per task, **5 MB** each, types PDF, DOC(X), XLS(X), PPT(X), ZIP, TXT, CSV and PNG/JPEG/GIF/WebP -
  the real type is read from the file's bytes; a renamed executable is refused. Not on a cancelled task. 20 uploads per
  minute per person. Removing a file: its uploader or a manager of the task.
* The Drive link must be `https://drive.google.com/...` or `https://docs.google.com/...`, at most 500 characters,
  without credentials.

### 6.5 Clearing finished tasks from one's own list

* "Clear all" under **Completed** and under **Cancelled** (on the Tasks page and on the Home board) hides the tasks the
  list shows **from that person's own lists only**. The task itself, the assigner's and everyone else's view, the
  history and the KPI are unchanged.
* "Undo" is offered for 15 seconds and brings exactly those tasks back.
* Only finished tasks (DONE or CANCELLED) in the caller's own list can be hidden; other ids are skipped without saying
  which. At most 500 ids per request (the interface sends larger lists in batches); 20 requests per minute per person.
* A hidden cancelled task that is **restored** reappears for everyone who had hidden it.
* Project task lists are not affected.

## 7. KPI

* A monthly score from 0 to 100 for each person, computed from the tasks **personally assigned** to them and created in
  the current month (cancelled tasks excluded): a completion rate (done / assigned) and an on-time rate (done on or
  before the due date, among done tasks with a due date), weighted by the company's `completionWeight`.
* Only executives change the weight and the incentive-tier table (descriptive labels, not money); everyone can read
  them. A person sees their own KPI; managers see the KPI of people in their scope.

## 8. Cross-department projects

* An executive (for any department) or a department head (for their own) creates a project and may invite other
  departments. The invited department's head (or an executive) accepts or declines; a declined department can be
  invited again.
* After accepting, a head adds people **of their own department**; members share the project's tasks, a chat (last 200
  messages, 60 messages per minute per person, 2,000 characters each) and linked Drive folders.
* Managers of a project: executives and heads of the owning department. Participants: members and managers. Heads of
  any department in the project can see it (to answer the invitation). Others: 404; viewers who may not work in it: 403.
* A project task must go to a member: managers may assign to anyone in the project, a head to their own people, anyone
  to themselves.
* Linking a folder from the Drive catalog requires someone who may decide access to that folder; linking and adding
  members grant reader access through the folder owner's Drive connection (best effort per person). Unlinking does not
  revoke Google permissions.
* Notifications: invited (heads of the invited department), responded (project creator), member added.

## 9. Messages (1-1 chat)

* Text messages of up to 2,000 characters between people of the same company (the system account excepted). The
  conversation list and threads refresh by polling.
* **Attachments**: images and documents up to **5 MB** (types as in 6.4), videos MP4/M4V/MOV/WebM up to **50 MB**
  (checked by container signature, never transcoded). Images and videos show in the thread; videos stream in byte
  ranges. Any attachment can be downloaded; documents can be opened in a tab (section 17). 20 uploads per minute.
* **Recall** (sender only): removes the message and its file for both sides; a file still used by a forwarded copy is
  kept.
* **Delete for me**: hides a message on the caller's side only.
* **Forward** to 1-10 colleagues the caller may message; copies are marked "Forwarded" and share the original file; a
  recalled message cannot be forwarded; 20 forwards per minute.
* **Archive** a conversation (caller's side only); a new message brings it back.
* **Broadcast** (system account only): one message to every active user of every company.

## 10. Notifications

* Types: `TASK_ASSIGNED`, `TASK_ACCEPTED`, `TASK_DECLINED`, `TASK_COMPLETED`, `CALENDAR_EVENT_INVITE`,
  `FOLDER_ACCESS_REQUESTED`, `MESSAGE_RECEIVED`, `PROJECT_INVITED`, `PROJECT_RESPONDED`, `PROJECT_MEMBER_ADDED`,
  `WHITEBOARD_SHARED`.
* Each stores a Vietnamese title/body plus `params` (only values its reader may see) so the interface words it in the
  reader's language; clicking opens the related item.
* The bell polls the unread count every 30 seconds; read one or all.

## 11. Calendar

* Each person's calendar is private. They add their own events (title, type `MEETING`/`DEADLINE`/`BUSINESS_TRIP`/
  `OTHER`, start, optional end, description); a business trip spans a date range and is drawn on every day it covers.
  An event cannot end before it starts (422 `INVALID_EVENT_RANGE`).
* Managers can **propose** an event to someone in their scope; it waits as pending until that person accepts or
  declines. Managers never see the person's calendar.

## Meet

* Any active non-system company member can organize a meeting or invite colleagues in the same
  company, independently of the manager-only calendar-assignment hierarchy. This is an invitation,
  not permission to read another person's private calendar. Only organizer/invitees can read the
  shared meeting, agenda and participant names/response states; cross-tenant/non-member IDs return 404.
* Version one uses an existing canonical `https://meet.google.com/xxx-xxxx-xxx` URL (optional trailing
  slash, surrounding whitespace trimmed); other hosts, HTTP, credentials and query strings are rejected.
  Orbit does not create Google rooms, synchronize Google Calendar, send Google emails or control Google
  access. An explicit link opens Google's own room-creation page for the user to obtain a link.
* **Meet now** uses the server time and defaults to one hour. Scheduled meetings use Vietnam time
  in the form, UTC instants in the API, start no more than 366 days ahead (60s submission grace for
  elapsed start), last at most 24 hours and end after start. Title: 200 characters; agenda: 1,000.
* Pick individuals and/or current department/team membership. The organizer is included and all
  duplicates are removed; at most 50 people total. Invalid/inactive/system/foreign invitees or groups
  reject the entire request. Group membership is a snapshot at creation, not a continuing subscription.
  Name search returns up to 30 company colleagues and exposes no private contact fields.
* Creation atomically stores the meeting, membership, an organizer's confirmed calendar entry,
  each invitee's pending entry and in-app notifications. Invitees accept/decline through Meet or their
  own calendar. The organizer cannot respond to their own invitation. An already handled response
  cannot be changed. The join link is returned/rendered only for confirmed members while not cancelled.
  This UI rule does not revoke a Google link someone already copied or enforce Google's admission rules.
* Only the organizer cancels. Cancellation is idempotent, removes associated calendar entries and
  notifies invitees atomically, preserving meeting history. It does not close/delete Google's room.
  Deleting a pending personal calendar entry declines it; deleting a confirmed personal entry only
  hides that calendar entry and does not cancel the meeting. Other private events are unaffected.
* The month list shows at most 100 meetings overlapping the month, newest first; shared details are
  accessible from an invitation link even in another month. Related queries batch IDs to stay below
  SQL Server's parameter limit. No recurring meetings, edit/reschedule, external guests, automatic
  Google-room creation, Google sync, recording or actual video inside Orbit in this version.

## Attendance and leave

* All signed-in people can record their own check-in/check-out; timestamps come from the server,
  and the work date uses **Asia/Ho_Chi_Minh**. One shift per date and one open shift per person are
  enforced in SQL Server. Check-out may occur after midnight and stays attached to the starting date.
  A second check-in, missing check-out target or a check-in on approved leave is rejected.
* Employees see their own monthly history. Executives see the company, department heads their
  subordinate department staff, and team leads their team employees, using current organization placement.
  No client-supplied user/company ID selects who is stamped. Totals include completed shifts only,
  without break deduction, lateness classification, GPS/biometrics, payroll or automatic disciplinary decisions.
* Anyone can request full **calendar days**, including weekends, today or later, through year 2100,
  for up to 366 consecutive days. Pending/approved date overlap is rejected. Only a pending request
  can be withdrawn by its author; approved/rejected decisions cannot be repeated.
* Executives set a company-wide monthly approved-day limit in Settings: **blank/null = unlimited**,
  **0 = no new approved days**, or 1–31 days per month. Employee/manager requests need review;
  a CEO (`EXECUTIVE`) submission is automatically approved and creates its calendar event in the
  same transaction, after the same quota, overlap and attendance checks.
  Days count inclusively, by each month they fall in; the limit is days, not number of forms.
  Changing the policy does not revoke earlier approvals. A person who has exhausted a month's
  allowance cannot submit more dates for that month and must attend normally without approved leave.
* Executives may review any other company member (including another executive); department heads
  review their department's team leads/employees, and team leads their own team employees.
  The manual review endpoint does not allow self-review; the CEO exception is automatic on new
  submission only. Existing pending requests are not approved retroactively. Owners and authorized
  reviewers see the reason; other users do not.
  Submission and approval both check the allowance. A tenant-scoped database lock serializes
  policy updates, submissions, approvals and attendance writes to prevent conflicting decisions.
* Approval creates exactly one **confirmed** calendar event in the employee's private calendar in
  the same transaction. It covers every approved date at Vietnam midnight through the final day's
  end, uses type OTHER and title "Nghỉ phép", and does not copy the private reason. This differs from
  an ordinary manager calendar proposal: the employee already requested these dates, so no second
  calendar acceptance is needed. Managers gain no calendar read access. Rejection/withdrawal creates no event.
* A day already recorded as worked cannot be submitted or approved as full-day leave. Pending leave
  does not excuse attendance. Monthly lists refresh while the view is active. Attendance records,
  policy and leave requests persist in SQL Server; no mock-only state is used by the product.
* Login now reveals the stationary ORBIT wordmark with a brief soft glaze, then reuses the existing
  shrink-to-background transition. Letters no longer orbit the planet. Key/pointer input can skip
  the reveal; reduced-motion and direct sign-in links retain immediate access.

## 12. Notes

* Private to their author: title (200) and text. Search, edit, delete.
* A note can be **pinned**: it floats on every dashboard page, can be dragged (position saved per account) and edited
  in place until unpinned.

## 13. Google Drive folders

* Each person connects their **own** Google account (OAuth); refresh tokens are encrypted (AES-GCM) at rest.
* A department registers folders in the company catalog by pasting a link or id. People of other departments request
  access; the folder's department head or an executive approves, which grants the requester's own Google account
  reader access through the Drive API. Executives do not request access (they already decide it).

## 14. Customers (CRM)

* A **dataset** is a table of customers from one source (Facebook, Zalo, website, Excel, event, referral, other),
  belonging to a department or to executives only, with its own typed columns (text, number, date, email, phone; the
  type is fixed once created).

| | Executive | Head of the dataset's department | Others in that department |
| --- | --- | --- | --- |
| See the dataset, read, add and edit customers | yes (all of the company) | yes | yes |
| Rename, delete, manage columns, import | yes | yes | no |
| Delete a customer | yes | yes | only one they added |
| Export to Excel | yes | no | no |
| Read the audit log | yes | no | no |

* **Encryption**: each customer's values are encrypted with AES-256-GCM using a per-company key derived from
  `CRM_DATA_KEY`; duplicate detection (same email or phone) uses keyed hashes, so the database never holds them in the
  clear. Losing or changing the key makes the data unreadable.
* **Import** from `.xlsx`, `.csv` or Word tables (`.docx`) in two steps (preview, then map columns and choose SKIP or
  UPDATE for existing customers); a cell that does not fit refuses its row; all-or-nothing in the database. Limits:
  5 MB, 10,000 rows, 50 columns per file, 50,000 customers per dataset, 20 imports per hour. Formulas are never run.
* **Export**: executives only, up to 20,000 customers per file, 10 per hour, always audited; cells are written as text.
* **Templates** (Excel and Word) with two invented customers; an **audit log** of every change with counts and ids
  only, never customer details.

## 15. Whiteboards

* Boards are drawn with **Excalidraw** (open source, MIT licence) inside the app. Its own labels follow the interface
  language; Excalidraw's Vietnamese translation is about half complete, so labels it lacks stay in English.
* **One toolbar row**: the board has no header of its own. The end of Excalidraw's toolbar row shows the board's name,
  its saving status (an icon; its words in the tooltip, and shown on an error), **expand** and **share**, as far as the
  board's width allows (the name first goes, then the buttons); the board's menu (≡) always lists every board action:
  all whiteboards, share, expand, rename and delete (owner) or leave (member). In the phone layout only a saving
  problem is added to the toolbar row, and on a phone the board uses the whole width of the screen.
* **No shape library**: Excalidraw's library (its "Library" button, the library tab beside "Find on canvas", "Add to
  library" in the context menu) is not offered. Orbit does not store it, so shapes put in it were gone on the next
  visit, and its catalogue lives on Excalidraw's own site.
* **Working with a board**: clicking the **selected tool again** (the pencil, say) hides its options panel (stroke,
  background, width, opacity, layers) for more drawing room; clicking it again shows it, and picking another tool shows
  its options again. **Right button + drag** moves the page (a right click without moving still opens the board's menu;
  Excalidraw's own middle button and Space + drag work too). **Expand** lays the board over the whole app (not the
  browser's full screen), with a narrow dimmed margin; the button again or a click on the dimmed margin puts it back.
  Its windows (share, rename...) show above it; Esc stays with the board (it deselects, cancels a drawing).
* A board belongs to its owner and company. The owner shares it with active colleagues of the same company as
  **EDITOR** (draws) or **VIEWER** (reads). Only the owner renames, deletes (soft) and manages members; a member may
  leave. A board not shared with the caller is 404. The first share notifies the person.
* **Saving and merging**: a change is saved about a second later together with the board version it started from. A
  save based on an older version is refused (409 `WHITEBOARD_CONFLICT`); the browser merges the newer drawing element
  by element (the newer element version wins, what the person is drawing is kept) and saves again. An open, visible
  board checks the version every 3 seconds and merges what others saved. Deleted elements are kept for 24 hours so
  deletions reach everyone. A board that was deleted or is no longer shared stops saving and says so.
* **Content rules** (checked on the server): drawing elements only (rectangle, diamond, ellipse, arrow, line, freehand,
  text, frame) - **no images and no embedded web pages**; element links only `http(s)` or `mailto`; every element has a
  unique id and a version; at most **5,000 elements and 2 MB** (413 `SCENE_TOO_LARGE`).
* Limits: 100 owned boards per person, 50 people per board; 30 boards created per hour, 120 saves per minute, 60 shares
  per hour per person.
* Fonts and other Excalidraw assets are served by Orbit itself, never from Excalidraw's servers.

## 16. Smart select (Alt+S)

* **Alt+S** anywhere in the dashboard (also while a whiteboard has the keyboard) or the header button dims the screen;
  the person drags a rectangle over the text they want; Esc leaves. Text already highlighted is used directly.
* **What is read**: words whose middle lies in the rectangle and that are actually on top (not covered by a dialog,
  not scrolled away), the values of text fields, and the **text drawn on a whiteboard** (text elements whose middle lies
  in the rectangle). Never password or hidden fields, screen-reader-only text, or Smart select's own windows. At most
  10,000 characters. Everything happens in the browser.
* **Actions** (keys 1-4), on the text as captured or as edited by the person:
  1. **Copy** to the clipboard.
  2. **Analyse** on the device (nothing is sent anywhere): dates (numeric, ISO, spelled-out Vietnamese, today/tomorrow,
     without a year), times (`14:30`, `9h30`, "3 giờ chiều", AM/PM), emails, Vietnamese and international phone numbers,
     links, money (`1.500.000đ`, `500k`, "1,5 triệu", "2 tỷ đồng", `$1,200`, `30 EUR`), percentages, other numbers, and
     character/word/line counts. Findings copy themselves when clicked; links open in a new tab (http(s) only).
     **Create a task** and **Add an event** open the usual forms pre-filled with the first line, the text and the first
     date/time found.
  3. **Put on a whiteboard**: drag the text onto a board open beside (split screen) - it lands where dropped - or pick
     a board the person can edit; it opens in a new tab with the text in the middle. Long text is wrapped at about 60
     characters and cut at 4,000.
  4. **Save as a note**: a new private note titled with the first line.

## 17. File viewer

* Document attachments of chat messages and tasks open **read-only in a tab** of the app: PDF (the browser's own
  viewer), Word `.docx` (drawn in the page), Excel `.xlsx` (one table per sheet, spreadsheet-style column letters and
  row numbers), CSV and TXT. Legacy `.doc`/`.xls`/`.ppt`, `.pptx` and archives show a download button instead.
* The file is fetched through the attachment's normal endpoint, so only people who may download it can view it.
* A sheet shows at most 1,000 rows and 50 columns (with a note); text files at most 500,000 characters. Word documents
  are drawn inside a sandboxed frame where no script can run and no link can navigate the app.
* **Sheets** (Excel and CSV): columns start at the width of their content (at most 480 px); the reader widens or
  narrows a column by dragging the edge of its header or with the arrow keys (48-800 px), double-clicks the edge to fit
  it to its content again, and "Fit columns" resets them all. "Wrap text" lets long values break into several lines so
  rows grow to show them. Clicking a cell shows its full value, with its address (e.g. `B3`), in a bar above the grid.
* **Word documents** are scaled down to fit the width of the frame (never above 100%) and follow the frame when it is
  resized, e.g. by the split divider; the reader can zoom from 50% to 200% and go back to "Fit width". A page wider than
  the frame stays fully reachable by scrolling. Clicking the document focuses its pane, and the app's shortcuts (Alt+S,
  Ctrl+K, Esc) keep working while it has the keyboard.

## 18. Workspace and interface

* **Tabs** inside the app (like browser tabs): every open tab keeps its form state (and independent pane scroll position on desktop);
  open tabs survive a reload in this browser session. The sidebar, search and notifications act on the active tab; "+"
  opens a new tab.
* **Split screen**: two tabs side by side with a draggable divider (25-75%); on phones only the focused pane shows.
  A window opened from a page (dialogs, a picture opened large) covers and dims **only the pane that opened it**, so the
  other half stays usable; Esc closes the focused pane's window. Without split screen such windows cover the whole
  screen. A window left open in a background tab is hidden with its tab and comes back, unchanged, with it. A window
  takes the keyboard focus when it opens (or its first field does) and gives it back to what had it when it closes.
* **Quick search (Ctrl+K)**: pages and the features inside them, ignoring case and accents.
* **Home**: KPI cards, workload by status, tasks completed in the last 7 days, the person's tasks in columns; a task
  board view; a priority panel grouping open tasks by priority.
* **Pomodoro timer** (25/5/15 minutes, long break after every 4th round) that keeps running across tabs and reloads.
* **Themes**: light, dark, gray, pink (glass style), stored per account in the browser.
* **Languages**: Vietnamese (default) and English for the whole interface, notifications and emails (an email follows
  the language of the request that caused it).
* **Guided tour** per role, replayable from Settings.
* **Public pages**: marketing page (Vietnamese and English), sign-in, forgot password, registration, invitation.
* **Open-source licences** page (Settings, and a small credit line on the Whiteboards page) naming the main components
  and their licences, the whiteboard fonts, and linking to the full licence texts of every package shipped to the
  browser (generated at build time).

### Home display — 2026-11-01

Home uses a keyboard-accessible icon/description menu to choose Overview, Task board or Priority
suggestions. Overview has a separate per-tab choice: General information (default, identity and
role-filtered main menu), Work charts (existing KPI, workload, seven-day completion and status
columns), or Financial charts. Financial charts are available only to CEO/accountants and use
the existing posted cash-flow report, with day/week/month/quarter/year and anchor-date controls.
The grouped chart fills missing days with zero and aggregates at most six date ranges, retaining
exact integer VND totals and an accessible data table. This is management cash flow, not profit
or statutory accounting. Denied/stale finance selections show General information and do not
mount the report query.

Task board reuses the compact Tasks workbench, limited to the caller's assigned tasks, with
creation-period filtering, search, status tabs, priority/deadline/sort controls, existing task
actions and filtered finished-history hide/undo. Priority suggestions always show three muted
high/medium/low columns, including empty tiers. Narrow panes scroll inside the board horizontally.
The global priority/board shortcuts remain removed from the desktop header and phone menu.

Each Home tab retains both display selections in existing session storage, including reload and
split-screen. Selectors update their owning tab ID. Legacy boardView sessions retain board/overview
when homeView is absent. Navigating away resets the main display as before; the overview submode
remains on the tab. Task details remain pane-scoped; server permissions and APIs are unchanged.

### Feature workspace design — 2026-11-01

The eighteen main destinations use a consistent page title, contextual description and primary
operations. Feature content uses neutral surfaces within the selected theme, section headings,
compact record lists and deliberate empty/loading/error states. Home shows performance metrics
and status columns; departments, projects, customer datasets, notes and whiteboards use directories.
Messages uses a connected conversation/thread surface. Calendar keeps its seven-column month grid.
Payroll, cash entries, meetings and leave use structured records with their existing status/actions.
Cash-flow reports show exact monetary totals and category/day tables. Company, department, project
and dataset details follow the same content hierarchy; specialized canvas/file editors are retained.

Shared data tables become labeled two-column records when their container is at most 600px wide,
with the primary field spanning the record and action controls kept separate. Staff combines identity,
username and employee code in one column, and role/job title in another. Phone numbers stay together.
Labels, keyboard row activation, nested controls and current business permissions are preserved.
The staff team picker requests groups only after a valid department is selected.

### Settings navigation — 2026-11-01

Settings opens a group menu before any forms: Account & security (profile, password, recovery
email), Appearance & connections (theme, Google Drive), Work settings (KPI/Incentive, leave policy),
Finance settings (accounting access), Company settings (company details/logo/banner), and Help &
information (guided tour, licenses). Each group has a separate options menu; each local option has
its own virtual workspace path under `/dashboard/settings/{group}/{option}`. Password and recovery
email are separate pages, with no credential fields on the root or account menu.

Work/company administration remains EXECUTIVE-only; accounting permission settings require the
current financial executive capability. Ordinary employees and accountants without executive
authority see only personal/appearance/help settings. Direct unauthorized settings paths show an
access explanation without mounting admin forms; server-side permissions are unchanged. Unknown
settings paths show a recoverable missing-page message. Forms and their feature data are mounted
only when the option opens; previous save/approval behavior is preserved.

Group cards show an icon and description; phones use compact rows and wide panes use a responsive
grid based on available width. Breadcrumbs and a Back button return to the appropriate parent;
keyboard navigation focuses the new page heading. Settings retain VI/EN and all four themes.
Quick-search results for password, profile, recovery, appearance, KPI/Incentive, leave policy and
accounting permissions open the corresponding child page directly; tab titles reflect that page.
Company Overview's Settings shortcut opens the company settings group. KPI tier fields stack on
narrow screens, and the formula editor shows loading/retry states before configuration is ready.

### Settings detail design — 2026-11-01

Group menus use a contextual summary beside a numbered function list, distinct from the root
settings tiles. Each option has its own icon, description and configure/open action. Function pages
have local group navigation, with current-page state; it becomes wrapping navigation on narrow
panes. Shared editing sections separate explanations from fields and group related save actions
in a footer. Container queries follow actual pane width, including split workspaces.

Password editing separates current-password verification and new-password fields, shows the existing
8-character/matching conditions and offers a local reset. Recovery email shows the linked address,
separates optional contact information and supports restoring the current values. Profile settings
separate photo/identity, display-only presence and sign-out. Appearance has four miniature previews;
selecting a theme still saves immediately per account/browser.

KPI shows its completion/on-time weighting and a synchronized range/number editor; incentive tiers
have numbered rows and separate save controls. Leave settings expose unlimited/monthly choices
without changing the existing null/0/day-limit policy. Finance settings separate granting access
from the current-accountant list and retain confirmation dialogs. Company settings show a logo/banner
preview and company information; editing uses a structured dialog with the existing auto-growing
text area. Help presents tour topics and the existing replay action. Google Drive and license
options still open their existing destination pages.

This changes presentation and local draft controls only. Existing endpoints, server permissions,
validation rules, approval flows, persistence and confirmed financial/security operations are unchanged.

### UI refinement — 2026-10-31

Shared glass surfaces use neutral outlines, restrained shadows and higher opacity over a quieter
background. Primary buttons have a continuous subtle sheen rather than a hard midline gloss.
Below 1024px, including iPhone landscape, navigation, workspace tabs and header tools live in one
expandable Menu. Desktop keeps its sidebar and tab strip. Both use one-level expandable groups:
Organization (Company, Departments, Staff for authorized roles), Work (Task list, Projects,
Whiteboards), Calendar (My calendar, Meet, Attendance, Leave), and Documents (My notes, Google Drive).
Home, Customers and Messages remain direct entries; Settings is direct in the phone menu and remains
available from the account menu. Only one group opens at a time; the active destination's group opens
on navigation, including detail/deep-link paths. A collapsed desktop group icon expands the sidebar
and opens that group. Search and tab labels retain direct destination metadata. Phones use document scrolling with
safe-area padding; desktop retains independent pane scrolling. The site does not control Safari's
address-bar visibility. Multi-line form fields grow and shrink with input/restored values and width
changes; pinned notes retain their existing content-driven floating-window growth. The ORBIT word
reveal and diagonal glaze last about 2.1s before the existing shrink transition; skip and reduced
motion remain supported.

## 19. Security and privacy

* **Transport and cookies**: HTTPS in public use; session cookies httpOnly, Secure, SameSite=Lax with the `__Host-`
  prefix (only this exact host can set them).
* **CSRF**: requests carrying a foreign `Origin` are refused (403) by the CORS filter; SameSite keeps cookies off other
  sites' requests.
* **Pages cannot be framed by other sites** (clickjacking): every page carries `Content-Security-Policy:
  frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN` (the app's own Word and PDF previews are same-origin), plus
  `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and HSTS; API answers carry Spring Security's own
  (`X-Frame-Options: DENY`, `nosniff`, HSTS).
* **Public site on one PC**: the frontend and the backend listen on this PC's loopback address only; the Cloudflare
  tunnel on the same PC is the only way in from outside, always over HTTPS.
* **Client address**: taken from the connection, or from `X-Forwarded-For` only when the request comes through a
  configured trusted proxy.
* **Rate limits** on every public endpoint and on costly actions (see section 20); the limiter bounds its own memory
  (keys longer than 200 characters are digested, at most 100,000 keys, fails closed).
* **Uploads**: type from the file's bytes, random server-side names, size limits, stored outside served folders;
  downloads send `nosniff` and force download for anything but images and videos.
* **Encryption at rest**: Drive refresh tokens (AES-GCM) and CRM customer data (AES-256-GCM per company). Passwords,
  session tokens, OTPs and invitation tokens are stored only as hashes.
* **No secrets in the repository**; secrets come from the environment and the backend refuses to start without them.
* **Logging** never contains passwords, tokens or customer details.
* **Third-party code**: the image optimizer of Next.js is switched off (not used); Excalidraw runs without images,
  embeds or AI features; Word documents render in a script-less sandbox.

## 20. Limits

| What | Limit |
| --- | --- |
| Sign-in failures | 5 per username and 30 per address per 15 minutes (persistent) |
| Username / password at sign-in | 100 / 128 characters |
| New password | 8 characters to 72 bytes |
| Session | 2 hours idle, 7 days at most; access token 15 minutes |
| Avatar, logo, banner | 2 MB images; logo/banner 10 uploads per hour |
| Task / chat attachment | 5 MB (chat video 50 MB); 10 files per task; 20 uploads per minute |
| Task title / checklist | 200 characters / 30 lines of 200 |
| Chat and project messages | 2,000 characters; forward to at most 10 people |
| Note title | 200 characters |
| Department name / description | 200 / 500 characters |
| Company description | 1,000 characters |
| Project name / description / invite note | 200 / 1,000 / 500 characters |
| CRM | 5 MB, 10,000 rows, 50 columns per import; 50,000 customers per dataset; export 20,000 rows |
| Whiteboard | 5,000 elements and 2 MB per board; 100 boards per owner; 50 people per board |
| "Clear all" | 500 tasks per request (batched by the interface) |
| Smart select capture | 10,000 characters |
| File viewer | 1,000 rows x 50 columns per sheet; 500,000 characters of text |

## 21. Data model

Main tables (one per line; all business tables carry audit columns):

* **Organization**: `companies`, `departments`, `teams`, `users`, `positions`.
* **Access**: `auth_sessions`, `login_failures`, `password_reset_otps`, `registration_verifications`, `invitations`,
  `email_change_requests`, `terms_versions`, `terms_acceptances`.
* **Work**: `tasks`, `task_attachments`, `task_checklist_items`, `hidden_tasks`, `kpi_configs`, `kpi_incentive_tiers`.
* **Projects**: `projects`, `project_departments`, `project_members`, `project_folders`, `project_messages`.
* **Communication**: `messages`, `message_attachments`, `message_archives`, `notifications`.
* **Personal**: `calendar_events`, `notes`.
* **Meet**: `meetings`, `meeting_participants`; nullable meeting ID/URL on calendar entries (V40).
* **Workforce**: `attendance_records`, `leave_requests`, `leave_policies` (migrations V37/V38; V39 permits complete automatic CEO approval records).
* **Drive**: `google_drive_connections`, `oauth_states`, `department_drive_folders`, `folder_access_requests`.
* **CRM**: `crm_datasets`, `crm_columns`, `crm_rows`, `crm_audit_log`.
* **Whiteboards**: `whiteboards`, `whiteboard_members`.

Migrations are versioned (`V{n}__{description}.sql`); a shipped migration is never edited.

## 22. API index

All paths are under `/api/v1`. "Managers" = EXECUTIVE, DEPARTMENT_HEAD, TEAM_LEAD; finer rules are in the sections above.

| Area | Endpoints |
| --- | --- |
| Auth (4) | `POST auth/login`, `POST auth/logout`, `POST auth/session/activity`, `GET/PATCH auth/me`, `POST auth/me/avatar`, `POST auth/me/onboarding/complete`, `PATCH auth/me/presence`, `PATCH auth/password`, `POST auth/forgot-password`, `POST auth/reset-password` |
| Registration, invitations (4.1-4.2) | `POST auth/register/request-otp`, `POST auth/register/verify-otp`, `POST auth/register`; `POST/GET invitations`, `DELETE invitations/{id}`, `POST invitations/{id}/resend`; `GET auth/invitations/{token}`, `POST auth/invitations/{token}/accept` |
| Terms (4.5) | `GET terms/current`, `POST terms/accept` |
| Company (5.1) | `GET companies/me`, `PATCH companies/me` (executive), `POST/GET companies/me/logo`, `POST/GET companies/me/banner` |
| Departments, teams (5.2-5.3) | `POST departments` (executive), `PATCH departments/{id}`, `GET departments`, `DELETE departments/{id}` (executive), `GET departments/{id}/members`; `POST/GET departments/{id}/teams`, `GET teams/{id}/members`, `DELETE teams/{id}` |
| Users (5.4, managers) | `POST/GET users`, `DELETE users/{id}`, `PATCH users/{id}/position`, `PATCH users/{id}/status`, `POST users/{id}/password-reset`, `POST users/{id}/email-change`, `POST users/{id}/email-change/confirm`; `GET users/{id}/avatar` (company members) |
| Tasks (6) | `POST/GET tasks`, `GET tasks/project/{projectId}`, `POST tasks/{id}/accept`, `.../decline`, `.../complete`, `.../cancel`, `.../restore`, `DELETE tasks/{id}`, `POST tasks/hidden`, `POST tasks/hidden/undo`, `POST tasks/{id}/attachments`, `GET/DELETE tasks/{id}/attachments/{attachmentId}`, `POST tasks/{id}/checklist`, `PATCH/DELETE tasks/{id}/checklist/{itemId}`, `PATCH tasks/{id}/drive-url` |
| KPI (7) | `GET kpi/config`, `PATCH kpi/config` and `PUT kpi/config/incentive-tiers` (executive), `GET kpi/me/summary`, `GET kpi/users/{id}/summary` (managers) |
| Projects (8) | `GET/POST projects`, `GET/PATCH/DELETE projects/{id}`, `POST projects/{id}/departments`, `POST projects/{id}/departments/{departmentId}/accept`, `.../decline`, `DELETE projects/{id}/departments/{departmentId}`, `POST projects/{id}/members`, `DELETE projects/{id}/members/{userId}`, `POST projects/{id}/folders`, `DELETE projects/{id}/folders/{linkId}`, `GET/POST projects/{id}/messages` |
| Messages (9) | `GET messages/conversations`, `GET messages/with/{userId}`, `POST messages`, `PUT/DELETE messages/with/{userId}/archive`, `POST messages/attachments`, `GET messages/attachments/{id}`, `POST messages/{id}/forward`, `DELETE messages/{id}/for-me`, `DELETE messages/{id}`, `POST messages/broadcast` (system account) |
| Notifications (10) | `GET notifications`, `GET notifications/unread-count`, `PATCH notifications/{id}/read`, `PATCH notifications/read-all` |
| Meet | `GET/POST meetings`, `GET meetings/people?q=`, `GET meetings/groups`, `GET meetings/{id}`, `PATCH meetings/{id}/response`, `DELETE meetings/{id}` (organizer) |
| Calendar (11) | `GET/POST calendar/me`, `POST calendar/users/{id}` (managers), `PATCH calendar/{id}/accept`, `.../decline`, `DELETE calendar/{id}` |
| Attendance | `GET attendance/status`, `GET attendance/me?month=YYYY-MM`, `GET attendance/team?month=YYYY-MM` (managers), `POST attendance/check-in`, `POST attendance/check-out` |
| Leave | `GET leave/policy`, `PATCH leave/policy` (executive), `GET leave/quota?month=YYYY-MM`, `GET leave/me?month=YYYY-MM`, `GET leave/review?month=YYYY-MM` (managers), `POST leave`, `PATCH leave/{id}/decision` (scoped manager), `DELETE leave/{id}` (owner, pending only) |
| Notes (12) | `GET/POST notes`, `PATCH/DELETE notes/{id}`, `PATCH notes/{id}/pin` |
| Drive (13) | `GET drive/connect`, `GET drive/oauth2/callback`, `GET drive/status`, `POST/GET drive/catalog`, `POST/GET drive/access-requests`, `POST drive/access-requests/{id}/approve`, `.../reject` |
| CRM (14) | `GET/POST crm/datasets`, `GET/PUT/DELETE crm/datasets/{id}`, `POST crm/datasets/{id}/columns`, `PATCH/DELETE crm/columns/{columnId}`, `GET/POST crm/datasets/{id}/rows`, `PATCH/DELETE crm/rows/{rowId}`, `POST crm/imports/preview`, `POST crm/datasets/{id}/import`, `GET crm/datasets/{id}/export`, `GET crm/templates/xlsx`, `GET crm/templates/docx`, `GET crm/audit` |
| Whiteboards (15) | `GET/POST whiteboards`, `GET/PATCH/DELETE whiteboards/{id}`, `GET whiteboards/{id}/version`, `PUT whiteboards/{id}/scene`, `PUT/DELETE whiteboards/{id}/members/{userId}` |

The interactive API documentation (Swagger UI) is available on the backend in development.

## 23. Non-functional requirements

* **Responsive**: every screen works on desktop, tablet and phone (navigation and tools move into one Menu below 1024px; split screen shows
  one pane on phones; dialogs and the Smart select panel become full-width sheets).
* **Accessibility**: keyboard navigation, visible focus, labelled controls, state never shown by colour alone.
* **Performance**: lists refresh by polling (notifications and lists every 30 s, an open whiteboard every 3 s);
  heavy libraries (Excalidraw, document viewers) load only when used.
* **Internationalisation**: every interface text has a key in both languages (checked by tests: same keys, same
  placeholders, no unused keys).
* **Testing**: backend unit tests (JUnit 5, Mockito), frontend unit tests (Jest), live checks against a real SQL
  Server for each phase (recorded in the READMEs).

## 24. Known limitations

* Single machine: files on local disk, in-memory rate limiter (sign-in protection is persistent), no horizontal
  scaling without shared storage.
* A revoked or idle-expired session may keep working up to 15 minutes (until its access token expires).
* Spring Boot 3.5 and Next.js 14 are past their free support; an upgrade to Spring Boot 4.x and Next.js 15.5+ is planned.
* No real-time push: polling only. Whiteboard co-editing merges every few seconds; it does not show other people's
  cursors.
* The file viewer is read-only; slides and legacy Office formats can only be downloaded.
* Excalidraw's Vietnamese translation is incomplete: some of its labels show in English.
* Panning with the right button works where the context menu opens on release (Windows); on macOS and Linux a right
  press opens the board's menu at once, so pan there with the middle button or Space + drag.
* JSON request bodies are not size-capped globally (only multipart uploads are); rate limits bound their frequency.
* Calendar event titles and descriptions are not length-checked by the API (database limits 200 / 1,000).
* The terms of service text is a draft awaiting legal review; operator details are not filled in.

## Finance and payroll

- The Finance menu contains Payslips, Income & expenses and Cash flow reports. Only the current
  company CEO (EXECUTIVE position) and explicitly granted accountants can access any financial
  data. Department/team management alone grants no financial access. System accounts are excluded.
  The CEO grants/revokes accounting access in Settings; the server checks current user status,
  current position and grants for every request, including direct URLs/API calls. Revocation takes
  effect on subsequent requests; menu visibility refreshes within 30 seconds or on window focus.
- A company/employee/month has one payslip, including cancelled records. Amounts are whole VND,
  each component and net from 0 to 999,999,999,999; base + allowance + bonus - deduction = net.
  These fields are manually entered; attendance, taxes and insurance are not calculated automatically.
  Snapshot employee name is retained. Cancelled/rejected drafts can be edited without changing
  employee or salary month; editing returns to DRAFT. DRAFT/REJECTED submit to PENDING; CEO alone
  approves/rejects, with a reason required on rejection. APPROVED amounts are locked. Unpaid slips
  may be cancelled with a reason; cancellation of an approved slip requires CEO authority.
- CEO/accountant confirms an actual salary payment only from APPROVED, with CASH/BANK, payment
  date and optional reference. Date is no earlier than the salary month start and no later than
  today in Vietnam. In one transaction this creates a linked SALARY expense and marks the slip PAID.
  Repeated/concurrent confirmations do not create another expense. PAID slips and linked expenses
  cannot be edited, cancelled or voided; corrections require separate documented cash adjustments.
  Approved but unpaid salaries do not count in cash-flow reports. A zero-net payslip may be settled
  with a zero-value linked entry. Ordinary transactions require a positive amount.
- Manual cash entries record actual INCOME/EXPENSE, date, whole-VND amount, category, CASH/BANK,
  counterparty (200), reference (100) and description (1,000). Income categories: SALES, SERVICES,
  OTHER_INCOME; expense categories: OFFICE, SUPPLIERS, OTHER_EXPENSE. SALARY is reserved for linked
  payroll payments. Dates range from 2000-01-01 through today. Recorded entries are immutable;
  void retains the original entry and requires a reason, actor and timestamp. Reports exclude voids.
  A client UUID idempotency key prevents retried manual creation from duplicating the transaction;
  reusing a key with different data is refused. Reopening the form starts a new transaction intent.
- Reports aggregate valid cash entries by company and date, category and account for day/week/
  month/quarter/year. Weeks start Monday; quarters/calendar years and today use Asia/Ho_Chi_Minh.
  Range is [from, until), with inclusive end shown in UI. Reports show income, expense, net movement,
  cash/bank movement and daily breakdown; these are management cash-flow figures, not profit,
  closing balances or statutory financial statements. Opening balances, bank integrations and
  automatic tax/accounting rules are not included. Period anchors and salary months: 2000–2100.
- Payslips and entries are paginated (25 per page); pagination is in meta.pagination. Financial
  permissions and all mutations write append-only action/actor/time audit events. Writes and grant
  revocation serialize on the current company row; financial data never crosses company boundaries.
  Amounts travel as decimal strings and display with integer precision. UI supports VI/EN and mobile;
  long text fields auto-grow. Existing user/role records are not granted accounting access by migration.
- V41 adds finance_permissions, payslips, finance_entries and finance_audit_events with constraints
  and tenant/date indexes. Endpoints under /api/v1/finance: GET access; GET people?q;
  GET accountants; PUT accountants/{userId} {enabled}; GET/POST payslips; PUT payslips/{id};
  POST payslips/{id}/submit|approve|reject|cancel|pay; GET/POST entries; POST entries/{id}/void;
  GET reports?period=day|week|month|quarter|year&date=YYYY-MM-DD. List endpoints accept month and
  page (zero-based); reasons required for reject/cancel/void; pay accepts date, account, reference.

## 25. Change log

| Date | Version | Change |
| --- | --- | --- |
| 2026-11-01 | 1.8.6 | Unified personal board with Tasks workbench, added muted priority columns, accessible menus and General/Work/Finance overview modes with permission-gated cash-flow charts. |
| 2026-11-01 | 1.8.5 | Moved global priority/board shortcuts into a per-tab Home display selector with overview, board and inline priority views; retained legacy tab sessions and split independence. |
| 2026-11-01 | 1.8.4 | Compact task workspace with scoped search, status counts, priority/deadline filters, focus sorting, contextual row actions, filtered history hide/undo and responsive records. |
| 2026-11-01 | 1.8.3 | Redesigned main feature workspaces and detail headings, neutral content surfaces, responsive labeled records, compact staff columns and status contrast; suppressed invalid team lookup before department selection. |
| 2026-11-01 | 1.8.2 | Redesigned group menus and all local settings screens with section-based editors, group navigation, theme previews and responsive controls. |
| 2026-11-01 | 1.8.1 | Settings group menus with individual option pages, separate password/recovery screens, scoped work/finance/company settings, quick-search destinations and responsive KPI tier forms. |
| 2026-10-31 | 1.8 | CEO-managed accounting access, reviewed monthly payslips, linked salary payments, immutable/voidable cash transactions and daily/weekly/monthly/quarterly/yearly management cash-flow reports. |
| 2026-10-31 | 1.7.1 | Shared expandable menu groups for Organization, Work, Calendar and Documents, including mobile, role filtering and collapsed desktop navigation. |
| 2026-10-31 | 1.7 | Meet with existing Google links, immediate/scheduled meetings, individual/group invitations, calendar responses, notifications, member-only details and organizer cancellation. |
| 2026-10-31 | 1.6.1 | Shorten the ORBIT reveal/glaze to about 2.1 seconds and remove its idle pause. |
| 2026-10-31 | 1.6 | Restrained glass surfaces and primary buttons; unified phone menu including landscape; document scrolling, safe-area spacing and auto-sizing text areas; slower diagonal ORBIT glaze. CEO submissions automatically approve with calendar creation and unchanged quota checks. |
| 2026-10-31 | 1.5 | Self check-in/out, scoped monthly attendance history, reviewed leave requests and company monthly limits; approved leave adds a private calendar entry atomically. Login reveals the stationary ORBIT word with a glaze before shrinking. |
| 2026-10-20 | 1.4 | Whiteboards on phones: the toolbar row no longer gets the saving status (only a saving problem) and the board uses the whole screen width, so Excalidraw's toolbar is not cut off. |
| 2026-10-20 | 1.3 | Security: pages refuse to be framed by other sites and send nosniff, Referrer-Policy and HSTS; the public site's backend listens on loopback only, like its frontend. |
| 2026-10-20 | 1.2 | Whiteboards: Excalidraw's labels in Vietnamese where its translation has them; clicking the selected tool again hides or shows its options; right button + drag moves the page; one toolbar row (name, saving status, expand and share at its end, board actions in its menu); expanding the board over the whole app; Excalidraw's shape library is no longer offered. Windows take the keyboard focus when they open and give it back when they close. |
| 2026-10-19 | 1.1 | File viewer: resizable sheet columns, "Wrap text", the selected-cell bar; Word documents fit the frame width with zoom controls (a page was cut off on the left in a narrow pane); windows opened from a page stay inside their pane in split screen. |
| 2026-10-19 | 1.0 | First full specification, covering Phases 1-44: organization, accounts and sessions, tasks and KPI, projects, chat, notifications, calendar, notes, Drive, CRM, terms of service, whiteboards, Smart select, plus Phase 44 (clearing finished tasks from one's own list, whiteboard text in Smart select and "Save as a note", the read-only file viewer, the open-source licences page). |


### 2026-11-01 — First-run guide and landing page (dev review)

The Vietnamese and English landing pages introduce meetings (user-supplied Google Meet links), attendance, leave, permission-gated finance, CRM and whiteboards. Every role receives guide steps for meetings, attendance, leave and a centered finance-access explanation. Completed tours do not restart automatically; replay the guide in Settings.


### Landing interaction preview (2026-11-01)

Feature cards are grouped into layered stacks. Hover, touch or keyboard activation opens one group with a dimmed backdrop; dismiss with the close button, backdrop or Escape. The three setup steps reveal as a scroll-driven connector reaches their numbered bubbles. Mobile uses a vertical connector; reduced-motion preferences show all steps without animated transitions. Dev preview only, pending approval.


### Landing paper fan and scroll story revision (2026-11-01, dev)

Holding the pointer over a feature stack for 400ms unfolds equally sized feature sheets sideways at the stack location; leaving the stack collapses them. Touch opens a horizontally swipeable fan; keyboard activation, Escape and a collapse button remain available. No centered feature modal.

The orbit background stays fixed through the hero and task-board demo. Scrolling reveals To do, In progress and Done in order, then fades the orbit. The solutions sequence dims surrounding content and highlights the before panel (stress/confusion icons), then the after panel (businessperson, money and growth icons). Reduced motion shows demo content without animated transitions or scroll dimming.


### Landing composition polish (2026-11-01, dev review)

Solution illustrations are viewport background silhouettes, separate from content cards. A large human figure and contextual symbols occupy the left side on desktop; the active content card sits on the right. Mobile keeps a softer silhouette behind the card. Pinned demo, solution and setup-step scenes use measured content heights to center within the viewport below the header.


### Landing review corrections (2026-11-01, dev)

Remove all human/background illustrations. The solutions scroll sequence retains both desktop cards in their original columns and highlights each in turn; mobile displays the active card in the centered scene. Paper fans clamp their vertical bounds to the viewport, use theme surface/shadow tokens, and dismiss on page scroll or resize. Horizontal scrolling inside mobile fans remains available.


### Desktop focus and simple mobile presentation (2026-11-01, dev review)

Desktop solution scenes use a dark vignette, luminous section heading, semantic red/primary active edges and raised theme surfaces. The highlighted phrase accompanies the active panel. On screens below 1024px, comparisons are static with both panels visible, feature groups become a flat feature list, and demo/setup sequences use natural document flow without dimming, fans or long pinned scroll tracks. Existing reduced-motion support remains.


### Persistent orbit focus treatment (2026-11-01, dev)

The orbit background remains fixed throughout the landing page. Desktop demo, solution, feature-fan and setup-step focus scenes soften its detail using blur and lower opacity, restoring clarity after the scene. Setup steps add a quiet light field and a themed active-card shadow. Mobile retains a consistently subdued orbit without new overlays or pinned interaction. Reduced-motion preferences disable background transitions.


### Gentle shared focus veil (2026-11-01, dev review)

Solution and setup-step desktop scenes share a softer vignette. The orbit retains 90% opacity with 2px blur during focus scenes, rather than fading to a barely visible layer. Setup headings and cards sit above the veil. Mobile presentation remains static and subdued.


### Landing narrative and final sections (2026-11-01, dev review)

The task-board demo has a bilingual introduction and is followed immediately by the three setup steps. Role descriptions use a selectable four-role scope map with keyboard-accessible buttons and live detail text. Security retains existing claims in four numbered, titled layers. The closing CTA uses an indigo orbital composition and bilingual shared-rhythm copy; registration and sign-in destinations are unchanged. Mobile uses a two-column role selector, stacked security layers and full-width CTA controls.


### Light focus, feature lead and launch gate (2026-11-01, dev review)

Desktop solutions and setup steps now use a theme-surface frosted veil rather than a dark vignette; typography follows foreground tokens. The feature grid has a larger work/projects lead stack, numbered groups and explicit exploration prompts. The final CTA becomes a two-column launch gate with a registration control framed by orbital rings, using the existing login route. The footer is an explicit surface with brand/navigation, copyright and a back-to-top link, verified at the bottom on desktop and mobile. No deployment or repository publication is included.


### Feature flashcards (2026-11-01, dev review)

The desktop feature grid keeps its large lead stack and existing layout. Clicking a cover turns it into an in-place flashcard deck with previous/next controls, page count and a return-to-cover button. Hover no longer opens a fan; no dim overlay is rendered. Escape restores focus to the cover, arrow keys navigate, reduced-motion preferences remove turn animations. Mobile retains the flat feature list.


### Default soft orbit below hero (2026-11-01, dev)

Desktop keeps the fixed orbit sharp in the opening hero and softly blurred (3px, 80% opacity) from the second section through the footer, including feature cards and role scopes. Scrolling back to the hero restores clarity. Mobile retains its existing quiet, static background treatment.
