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
> **Version:** 1.4 - 2026-10-20, covering Phases 1-47.

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
| Frontend | Next.js 14 (App Router), React 18, TypeScript, TanStack Query, Tailwind CSS |
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

* **Tabs** inside the app (like browser tabs): every open tab keeps its state (half-filled forms, scroll position);
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
| Calendar (11) | `GET/POST calendar/me`, `POST calendar/users/{id}` (managers), `PATCH calendar/{id}/accept`, `.../decline`, `DELETE calendar/{id}` |
| Notes (12) | `GET/POST notes`, `PATCH/DELETE notes/{id}`, `PATCH notes/{id}/pin` |
| Drive (13) | `GET drive/connect`, `GET drive/oauth2/callback`, `GET drive/status`, `POST/GET drive/catalog`, `POST/GET drive/access-requests`, `POST drive/access-requests/{id}/approve`, `.../reject` |
| CRM (14) | `GET/POST crm/datasets`, `GET/PUT/DELETE crm/datasets/{id}`, `POST crm/datasets/{id}/columns`, `PATCH/DELETE crm/columns/{columnId}`, `GET/POST crm/datasets/{id}/rows`, `PATCH/DELETE crm/rows/{rowId}`, `POST crm/imports/preview`, `POST crm/datasets/{id}/import`, `GET crm/datasets/{id}/export`, `GET crm/templates/xlsx`, `GET crm/templates/docx`, `GET crm/audit` |
| Whiteboards (15) | `GET/POST whiteboards`, `GET/PATCH/DELETE whiteboards/{id}`, `GET whiteboards/{id}/version`, `PUT whiteboards/{id}/scene`, `PUT/DELETE whiteboards/{id}/members/{userId}` |

The interactive API documentation (Swagger UI) is available on the backend in development.

## 23. Non-functional requirements

* **Responsive**: every screen works on desktop, tablet and phone (sidebar becomes a horizontal bar; split screen shows
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

## 25. Change log

| Date | Version | Change |
| --- | --- | --- |
| 2026-10-20 | 1.4 | Whiteboards on phones: the toolbar row no longer gets the saving status (only a saving problem) and the board uses the whole screen width, so Excalidraw's toolbar is not cut off. |
| 2026-10-20 | 1.3 | Security: pages refuse to be framed by other sites and send nosniff, Referrer-Policy and HSTS; the public site's backend listens on loopback only, like its frontend. |
| 2026-10-20 | 1.2 | Whiteboards: Excalidraw's labels in Vietnamese where its translation has them; clicking the selected tool again hides or shows its options; right button + drag moves the page; one toolbar row (name, saving status, expand and share at its end, board actions in its menu); expanding the board over the whole app; Excalidraw's shape library is no longer offered. Windows take the keyboard focus when they open and give it back when they close. |
| 2026-10-19 | 1.1 | File viewer: resizable sheet columns, "Wrap text", the selected-cell bar; Word documents fit the frame width with zoom controls (a page was cut off on the left in a narrow pane); windows opened from a page stay inside their pane in split screen. |
| 2026-10-19 | 1.0 | First full specification, covering Phases 1-44: organization, accounts and sessions, tasks and KPI, projects, chat, notifications, calendar, notes, Drive, CRM, terms of service, whiteboards, Smart select, plus Phase 44 (clearing finished tasks from one's own list, whiteboard text in Smart select and "Save as a note", the read-only file viewer, the open-source licences page). |
