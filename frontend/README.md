# Frontend — Next.js app

React + Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query. Status: **Phases 1–12
verified end to end in a real browser** — see "Verified" sections below. Stack-wide conventions
this structure implements are in the root
[CLAUDE.md § 46](../CLAUDE.md#46-tech-stack-and-project-structure); read that before adding code.

## What exists now

* **`features/auth`** — `LoginForm`, `useCurrentUser`/`useLogin`/`useLogout` (TanStack Query,
  `['auth','me']` is the source of truth for "am I logged in, as whom"). Login posts credentials;
  the backend responds by setting an httpOnly cookie (see backend README) — this app never
  touches the token itself.
* **`features/organization`** — `DepartmentManager`, `TeamPanel`, `UserManager`: create/list/
  delete departments, teams, and users, scoped to whatever the logged-in user is allowed to see
  (the backend enforces this independently; the UI just hides controls the user can't use — e.g.
  the "Xoá" and "Tạo phòng ban" controls only render for an EXECUTIVE, mirroring CLAUDE.md
  section 9's "hide the button on the frontend, verify the permission on the backend" example).
* **`middleware.ts`** — redirects based on whether the session cookie is *present*, not whether
  it's valid (it can't read an httpOnly cookie's contents, and must not try). An expired/invalid
  cookie just means the first API call from `/dashboard/*` gets a 401 and the page bounces to
  `/login` — the backend is still the only real authorization boundary.
* The old reference `features/sample` has been deleted; `app/page.tsx` is now just a fallback
  (middleware redirects `/` to `/login` or `/dashboard/*` before it would ever render).
* **`features/tasks`** — `TasksPanel` (list + create form). `CreateTaskForm` only renders for
  EXECUTIVE/DEPARTMENT_HEAD/TEAM_LEAD, and its "Cả một phòng ban" (whole department) option is
  hidden for TEAM_LEAD, mirroring `TaskServiceImpl`'s assignment rules. `TaskList`'s
  Nhận/Từ chối/Hoàn thành/Huỷ buttons are shown per `canActOnTask`/`canCancelTask` helpers that
  mirror the backend's authorization checks — approximations for UX only; the backend is what
  actually enforces them.
* **`features/drive`** — `DrivePanel`: `ConnectDriveButton` does a full-page
  `window.location.href` redirect to the backend's `/drive/connect` (OAuth cannot go through
  axios/XHR); `FolderCatalog` lets a user paste a Drive folder link/ID to register it for their
  department; `AccessRequestPanel` sends/approves/rejects cross-department access requests. The
  `/dashboard/drive` page reads `?drive=connected` / `?error=...` query params (set by the
  backend's OAuth callback redirect) to show a one-line status banner.

### Navigation & UI (after a design discussion with the user — see session history)

* **`/dashboard/*` is now four separate pages** (`departments`, `users`, `tasks`, `drive`)
  under a shared `app/dashboard/layout.tsx` (auth gate + header) with a `Sidebar`
  (`components/layout/Sidebar.tsx`) — not one long scrolling page anymore. `/dashboard` itself
  just redirects to `/dashboard/departments`. Each page is a thin wrapper that reads
  `useCurrentUser()` (already cached, no extra fetch) and renders its feature panel.
* **`Sidebar` is a fixed left column on desktop, a horizontal scrollable bar on small screens**
  — chosen deliberately over a hamburger/drawer menu, since the agreed scope was "don't break
  mobile layout," not a fully mobile-optimized nav (see the UI design discussion).
* **`ToastProvider`/`useToast`** (`components/ui/Toast.tsx`, wired into `app/providers.tsx`) —
  every mutation across `organization`/`tasks`/`drive` now reports success or failure via a
  toast, closing the gap where a successful action (e.g. deleting a department) previously left
  the page silently updating with no confirmation. Toasts are additive to, not a replacement
  for, inline field-level validation errors that need to stay visible.
* `EmptyState` usages across all four pages now include a one-line next-step hint (e.g. "Tạo
  phòng ban đầu tiên bên dưới") instead of just naming what's missing.

### Theme system, Settings, forgot-password (Phase 4)

* **`components/theme/ThemeProvider.tsx`** — 4 themes (`light`/`dark`/`gray`/`pink`), persisted
  per-device in `localStorage` (deliberately not synced to the backend — see its javadoc-style
  comment). Sets `data-theme` on `<html>`; `app/globals.css` defines each theme's palette as CSS
  variables and `tailwind.config.ts`'s `primary`/`surface`/`danger` tokens resolve through them
  (`rgb(var(--color-x) / <alpha-value>)`), so switching themes recolors the whole app instantly
  with no rebuild. A handful of `!important` overrides in `globals.css` keep older feature panels
  (written before the theme system existed, using raw `text-gray-900`/`bg-white`/etc.) readable
  under the dark theme without rewriting every className — see that file's comment for the
  trade-off this accepts.
* **`features/settings`** — `/dashboard/settings` page: `ThemePicker`, `ChangePasswordForm`,
  `RecoveryEmailForm` (binds the account's recovery email/phone — reuses the existing `email`
  column, doesn't add a new "bind gmail" concept), `CompanyInfoForm` (renders nothing for a
  non-EXECUTIVE — the backend enforces this independently too).
* **`/forgot-password`** (public route, added to `middleware.ts`'s allow-list) —
  `ForgotPasswordForm` is a 2-step flow: request an OTP by username (always shows the same
  generic message, mirroring the backend's never-leak-account-existence contract), then submit
  the OTP + new password. `LoginForm` links to it.
* **`features/organization`** — `UserManager` gained `phone`/`employeeCode`/`startDate` fields on
  the create form and matching table columns, a "Khoá"/"Mở khoá" button (calls
  `PATCH /users/{id}/status`), and a "Chuyển vị trí" button that opens `TransferPositionForm`
  inline below the table (no Modal primitive exists yet — see `components/ui/README.md` — so this
  reuses the same inline-form pattern already used for creating a user).

### Home page, KPI, priority panel (Phase 5)

* **`app/dashboard/page.tsx`** — no longer redirects; it's the employee Home page now. Renders
  `features/kpi/components/KpiSummaryCards` (3 quick-glance numbers + a workload bar chart, both
  scoped to the same calendar month as the backend's KPI summary — see that component's comment
  for why the chart filters `createdAt` itself instead of trusting an unscoped task list) and
  `features/tasks/components/PriorityPanel`.
* **`components/ui/BarChart.tsx`** — a stacked horizontal bar built from plain divs sized by
  percentage, not a charting library (CLAUDE.md section 29 — one chart doesn't justify a new
  dependency).
* **`PriorityPanel`** — a small tab fixed to the right edge (Notion-style, per your reference
  screenshot); clicking it slides out a panel grouping the caller's own still-open tasks
  (ASSIGNED/ACCEPTED) into three columns by `TaskPriority` — a field that already existed
  end-to-end on the backend but was never shown anywhere in the UI before this.
* **`features/kpi`** — `KpiConfigForm` (Settings, EXECUTIVE-only, hidden otherwise) edits the
  company's KPI weight and incentive-tier table; `UserKpiPanel` is the inline panel shown in
  `UserManager` when a manager clicks the new "Xem KPI" button on a row they're allowed to manage.

### Header redesign, Calendar, Notes, Notifications (Phase 6)

* **`app/dashboard/layout.tsx`** — the header now has an icon cluster (⭐ priority panel, ☰ board
  view, 🔔 notifications, ⚙️ settings) replacing the old floating "Ưu tiên" button and the
  Sidebar's "Cài đặt" entry. `components/layout/HomeViewContext.tsx` is a small context so the
  header's ☰ icon can toggle how `app/dashboard/page.tsx` renders without threading props through
  the layout/page boundary — only the Home page reads it, so toggling elsewhere is a no-op.
* **`features/tasks/components/TaskBoardView.tsx`** — the ☰ view: the caller's own tasks in 3
  compact columns by status; click a card to expand description/priority/due date in place. Same
  `useTasksList` data the KPI cards already fetch, no new endpoint.
* **`features/tasks/components/PriorityPanel.tsx`** — now a controlled component (`open`/`onClose`
  props) instead of owning its own trigger button, since the trigger moved into the header.
* **`features/notifications`** — `NotificationBell` polls every 30s (`refetchInterval`, not a
  WebSocket — CLAUDE.md section 29) for the unread badge and dropdown list.
* **`features/calendar`** — `/dashboard/calendar`: a self-drawn month grid (no calendar library)
  plus a pending-events banner with Accept/Decline. `AddEventForUserForm` is used from
  `UserManager`'s new "Thêm lịch" button — a manager can propose an event but never views the
  target's actual calendar (it's private; the backend enforces that independently too).
* **`features/notes`** — `/dashboard/notes`: simple create/edit/delete, fully private per user.

### Self-service tasks, department directory, messaging, note pinning (Phase 7)

* **`features/tasks/components/CreateOwnTaskForm.tsx`** — opened by the new "+" button on
  `TaskBoardView.tsx`'s header; anyone can now give themselves a task (the backend only still
  gates assigning to someone ELSE by authority tier).
* **`CreateTaskForm.tsx`** (manager-facing) — picking an assignee now shows that person's
  current open tasks inline, filtered from the `useTasksList()` data already being fetched, so a
  manager can see what's already on someone's plate before adding more.
* **`DepartmentManager.tsx`** — departments are now medium square tiles instead of a table;
  clicking one opens `app/dashboard/departments/[id]/page.tsx`, a 1/4–3/4 layout (identity on the
  left, directory + teams on the right — `TeamPanel` is unchanged, just relocated).
  **`DepartmentMemberList.tsx`** is a new internal company directory (readable by anyone, not
  just managers) with a "..." popover (email/title, "Nhắn tin riêng", "Gửi yêu cầu Drive").
* **`features/messages`** (new) — simple 1-1 chat, polling every 10s like notifications poll
  every 30s. `/dashboard/messages` reads a `?with=` query param (set by the department
  popover's link) to pre-select a conversation.
* **`features/notes`** — `NoteExpandModal.tsx` (dimmed overlay, larger editable "sheet of
  paper") and a 📌 pin toggle per note. **`PinnedNoteWidget.tsx`** is mounted once in
  `app/dashboard/layout.tsx` and renders any pinned note as a small floating, editable card on
  every `/dashboard` page until unpinned — "always on display" within the app, not outside the
  browser (not possible for a web app).

### UI/UX review pass — emoji → SVG icons, focus rings (Phase 8)

Referenced [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(its local Python search tool, run directly — not installed as a Claude plugin, which isn't
available from this session) to look up real UI/UX guidelines against this app's actual screens,
rather than reviewing from memory. Two concrete, recurring gaps came back and were fixed
app-wide: emoji used as icons everywhere (Sidebar, header cluster, notification bell, note pin,
member-list menu), and missing visible focus rings on several custom icon-only buttons (flagged
Critical/High severity for keyboard accessibility). Fixed by adding `@phosphor-icons/react`
(see `components/ui/README.md`'s new "Icons" section for the convention going forward) and a
`focus-visible:outline` on every icon-only control that lacked one. No layout, behavior, or data
changes — purely a visual/accessibility pass.

### Notification routing, message display name, task board filtering, Orbit branding (Phase 9)

Five independent fixes/polish items from a user backlog note, each touching an existing Phase
6–8 feature rather than adding a new one:

* **`NotificationBell.tsx`** — `resolveTarget()` maps each notification type to a real route
  (`MESSAGE_RECEIVED` → `/dashboard/messages?with={senderId}`, `CALENDAR_EVENT_INVITE` →
  `/dashboard/calendar`, `FOLDER_ACCESS_REQUESTED` → `/dashboard/drive`); clicking a notification
  marks it read and navigates there. `FOLDER_ACCESS_REQUESTED` additionally gets inline
  Duyệt/Từ chối buttons in the dropdown itself (`useApproveAccessRequest`/
  `useRejectAccessRequest`, already built for the Drive page) — an approver never has to leave
  the dropdown to decide. Caught and fixed a real pre-existing bug while wiring this up: the
  frontend's `NotificationType` union was missing `MESSAGE_RECEIVED` entirely (`tsc` failure),
  left over from when the backend added it in Phase 7.
* **`MessengerView.tsx`** — a brand-new conversation (started via the department directory's
  "Nhắn tin riêng", before any message exists for the backend to name the other party from) now
  shows the real name passed through the `?name=` query param instead of falling back to
  `Người dùng #{id}`.
* **`TaskBoardView.tsx`** — rewritten: `DONE` is no longer an always-visible column; completed
  tasks move into a collapsible "Đã hoàn thành (N)" section below the board. A new "Khoảng thời
  gian" filter (Tất cả/Hôm nay/Tuần này/Tháng này/Năm nay) scopes "my tasks" by `createdAt`,
  reusing the same period-boundary logic as `KpiSummaryCards`.
* **Orbit branding** — researched via `ui-ux-pro-max-skill` (cloned locally, queried for
  product/color/typography guidance rather than guessed) rather than picked arbitrarily: Indigo
  `#4F46E5` for the light theme, Violet `#7C3AED` for the dark theme (whose `#0F172A` background
  already matched the existing dark theme), Space Grotesk for headings + DM Sans for body text.
  Deliberately scoped to only `light`/`dark` in `globals.css` — `gray`/`pink` keep their original
  accent colors as genuinely distinct alternate options, not forced into the brand hue (see the
  comment in `globals.css` above the theme blocks).
* **Drive UI** — `ConnectDriveButton.tsx` shows a "Chưa kết nối" badge when not connected (previously
  no status indicator at all); `FolderCatalog.tsx`'s folder names are now clickable external links
  to the real Drive folder, and the register-folder form is gated behind a connected status instead
  of always being shown.

### Bolder Orbit brand presence + purposeful hover motion (Phase 10)

Phase 9's Orbit rebrand only swapped the primary color and fonts — same layout, same flat single
color everywhere. The user's explicit feedback was "giao diện có khác là mấy đâu" (this barely
looks different); this pass makes the brand actually read as a brand without touching layout or
component structure, grounded in `ui-ux-pro-max-skill` lookups for "enterprise SaaS" style (which
recommends Minimalism/Swiss-style structure, explicitly listed as best-fit for "Enterprise apps,
dashboards... SaaS platforms") plus a real Indigo-primary design-system color reference (tinted
background/surface instead of flat neutral gray) rather than inventing values by eye.

* **`app/globals.css`** — new `--color-primary-end` per theme (violet for light, indigo for dark —
  the two brand hues swap which one is "primary" vs "gradient end" between themes) backs a
  `from-primary to-primaryEnd` gradient, used instead of a flat fill. `gray`/`pink` set
  `--color-primary-end` equal to `--color-primary` — a degenerate (flat) gradient — so they stay
  untouched, consistent with Phase 9's scoping decision. `--color-body-bg`/`--color-surface-muted`
  are now faintly brand-tinted (indigo-ish in light, violet-tinted slate in dark) instead of
  neutral gray, so white/navy cards read as sitting on a branded surface rather than plain gray.
* **New `.card-interactive` utility** (`globals.css`) — a brand-tinted shadow plus a 2px lift on
  hover, 200ms, applied only to genuinely clickable cards (department tiles, task board cards) —
  never to a static display card like the KPI stat tiles, which can't be clicked and shouldn't
  look like they can. A global `prefers-reduced-motion: reduce` media query (previously missing
  entirely — flagged High severity by the same UI/UX lookup) zeroes out this and every other
  transition/animation duration for users who've asked the OS for reduced motion.
* **`tailwind.config.ts`** — new `primaryEnd` color token (`withOpacity("--color-primary-end")`)
  so `from-primary`/`to-primaryEnd` gradient utilities are available anywhere in the app.
* **`components/ui/Button.tsx`** (primary variant), **`components/layout/Sidebar.tsx`** (active
  nav item), **`features/tasks/components/TaskBoardView.tsx`** (self-task "+" button, task cards),
  **`features/organization/components/DepartmentManager.tsx`** (department tiles) — updated to use
  the gradient and/or `.card-interactive`. No other component changed; this is a presentation-layer
  pass only, matching the "don't touch layout/data" scope the user confirmed.

### Security audit + 3 reported bugs (Phase 11)

The user asked for a security review covering 5 items (signup CAPTCHA, user-info leakage,
IDOR/privilege escalation, hardcoded frontend admin checks, secret leakage via source code) plus
3 reported bugs. A read-only code audit found **all 5 security items were false alarms** — no
public signup endpoint exists at all, no DTO returns a password/token, every backend service
method re-derives the company/owner boundary before acting (not just a role check), every
frontend `authorityLevel === "..."` check mirrors a real backend check rather than being a
bypass, and the only `process.env` value read client-side is the intentionally-public API base
URL (`NEXT_PUBLIC_API_BASE_URL`). See the backend README's Phase 11 section for the equivalent
summary on that side.

The 3 bugs were all real:

* **Missing team-member view** — `TeamPanel.tsx`'s teams were a flat list with no way to see who
  was in one (the Phòng ban level had this via `DepartmentMemberList.tsx`, the Nhóm level never
  got the equivalent). Fixed by extracting the actual member-rendering/popover UI out of
  `DepartmentMemberList.tsx` into a shared **`MemberList.tsx`** (presentational, takes
  `members`/`isLoading`/`contextLabel` as props) and adding a thin **`TeamMemberList.tsx`**
  wrapper around the new `useTeamMembers()` hook (→ backend's new
  `GET /api/v1/teams/{id}/members`). `TeamPanel.tsx` now renders each team as an expandable row
  (same caret-expand pattern as `TaskBoardView.tsx`'s "Đã hoàn thành" section) instead of a plain
  `Table` row, since the shared `Table` primitive has no sub-row/expansion support and adding one
  for this single use case wasn't worth it (CLAUDE.md section 29).
* **"Nhân sự" nav shown to roles that land on a blank page** — `Sidebar.tsx`'s `NAV_ITEMS` had no
  role filtering, so every role saw the link, but `UserManager.tsx` already returned `null` for
  any role with an empty `allowedLevelsFor()` result (EMPLOYEE). Fixed by giving `NAV_ITEMS`
  entries an optional `roles` array and filtering in `Sidebar` — it now takes a
  `currentUserAuthorityLevel` prop (passed from `dashboard/layout.tsx`, which already has
  `currentUser` loaded) and hides "Nhân sự" for EMPLOYEE, matching `UserManager`'s own gate
  exactly rather than inventing a separate rule that could drift from it.
* **☰ board-view icon didn't navigate home** — clicking it from any page other than `/dashboard`
  just flipped the `isBoardView` context flag with nothing visibly changing, since only
  `app/dashboard/page.tsx` reads that flag. Fixed in `dashboard/layout.tsx`'s
  `HeaderIconControls`: `HomeViewContext` gained a `setBoardView(value)` setter alongside the
  existing `toggleBoardView()`; the click handler now checks `usePathname()` — on `/dashboard` it
  toggles as before, anywhere else it forces the board view on and `router.push("/dashboard")`.

### Orbit logo/favicon, bolder theme contrast, avatars + presence (Phase 12)

* **Logo/favicon** — `app/icon.svg` (planet-only mark, Next's App Router convention for the
  favicon) and `public/orbit-wordmark.svg` (planet + "ORBIT" wordmark, shown on `/login`),
  redrawn cleanly from the user's own rough draft rather than reusing its jagged paths, recolored
  to the actual Indigo/Violet tokens. Rendered as plain `<img>` tags, not `next/image` — the
  optimizer's `/_next/image` route returned `400 "isn't a valid image"` for both SVGs (confirmed
  via the network tab, not assumed), and a static vector icon gets nothing from that pipeline
  anyway. **Real bug this surfaced**: `middleware.ts`'s matcher redirected unauthenticated
  requests for *any* non-allow-listed path straight to `/login` — including the wordmark image
  `/login` itself needed to render, a self-defeating redirect loop for anyone not already logged
  in. Fixed by excluding common static image extensions from the matcher.
* **Theme gradient contrast** (user feedback: gradients sometimes "blended into the background")
  — every theme (not just light/dark) now gets a real two-stop gradient on `--color-primary`
  tokens, with the two stops picked for a genuine lightness gap (e.g. gray: slate-500→slate-800,
  pink: pink-400→pink-800) instead of near-identical tones; gray/pink stay non-"Orbit-branded" in
  hue, just structurally consistent now. New `.gradient-surface` utility adds a theme-aware 1px
  hairline ring so a gradient surface stays visually crisp even on a similarly-toned background,
  applied to every existing gradient surface (`Button`, `Sidebar` active nav, the board view's "+"
  button).
* **`components/ui/Avatar.tsx`** (new) — uploaded photo, or initials-on-brand-gradient when none
  is set; an optional colored presence dot. **`features/auth/hooks/useAvatarSrc.ts`** (new) — the
  reason this isn't just `<img src={avatarUrl}>`: the avatar endpoint requires the httpOnly auth
  cookie, which a cross-origin `<img>` subresource request can't carry (`SameSite=Lax` only rides
  along on a top-level navigation). This hook fetches the bytes through the same `apiClient` axios
  instance every other call uses (`withCredentials: true`) and turns the response into a local
  blob URL instead.
* **`features/settings/components/ProfileAvatarForm.tsx`** (new, added to `/dashboard/settings`)
  — upload control + the 3-state presence picker (Trực tuyến/Hạn chế/Không làm phiền). The
  dashboard header shows the caller's own `Avatar` next to "Đăng xuất"; `MemberList.tsx` (shared
  by department and team directories) shows one per member.
* **A real, fully reproduced frontend bug**: `useUploadAvatar`/`useUpdatePresence` originally
  called `queryClient.setQueryData(AUTH_ME_QUERY_KEY, profile)` on success (the same pattern
  `useLogin` uses) — the cache value updated correctly (confirmed by a direct `fetch` from the
  console), but an already-mounted `useCurrentUser()` consumer on the same page never
  re-rendered to show it; only a full remount (navigating away and back) picked up the new value.
  `useLogin` gets away with this only because it's immediately followed by a route change, which
  remounts everything anyway. Fixed by switching both to `queryClient.invalidateQueries({queryKey:
  AUTH_ME_QUERY_KEY})` — the pattern every *other* mutation in this codebase already uses (e.g.
  `features/notifications/hooks/useNotifications.ts`) — confirmed fixed in a freshly opened
  browser tab after ruling out a stale dev-server process as a red herring (see Verified below).

## Running locally (once dependencies are installed)

```bash
node -v              # confirm Node 20+ is on PATH
npm install
cp .env.example .env.local   # then point NEXT_PUBLIC_API_BASE_URL at your running backend
npm run dev
```

Log in as `binmit1` / `binmit1` (or any of `binmit2`–`binmit4` — see backend README for who's
who) once the backend is running with its dev seed data.

## Testing

```bash
npm run lint
npx tsc --noEmit     # type-check
npm test             # Jest + React Testing Library, once test files exist under src/
```

**Not yet written**: automated component tests. Phase 1 was verified by hand in a real browser
(see "Verified" below) — real evidence it works today, but not a regression guard. Add Jest/RTL
tests for `LoginForm`, `DepartmentManager`, and `UserManager` before building Phase 2 on top.
End-to-end tests (Playwright/Cypress) are still deferred per CLAUDE.md section 29 (don't add a
dependency before it earns its keep) — reconsider once there's a multi-page flow worth covering.

## Verified — Phase 1 (2026-09-24, this machine)

* `npx tsc --noEmit` — clean (one real error caught and fixed: `allowedLevels[0]` is typed
  `AuthorityLevel | undefined` under `noUncheckedIndexedAccess`, since an EMPLOYEE's allowed-level
  list is empty).
* Full browser session against the real backend: logged in as `binmit1` (EXECUTIVE), saw the
  real company name and every department/user created via the API in earlier testing, created a
  new department and a new team through the UI, viewed a team's members. Logged out, logged in
  as `binmit2` (EMPLOYEE), and confirmed the UI correctly renders a read-only department/team
  view with no user-management section at all and no delete controls — matching exactly what the
  backend would reject if called directly.
* `SameSite=Lax` on the auth cookie (a deviation from the original plan's `Strict` — see backend
  `AuthController` javadoc) works correctly across the frontend's `localhost:3000` and backend's
  `localhost:8080`: no CORS or cookie-not-sent issues in the real browser test.

## Verified — Phase 2 (2026-09-25, this machine)

* `npx tsc --noEmit` — clean.
* Created a task for a specific employee through the `CreateTaskForm` UI (assignee dropdown
  populated from the real `GET /users` list). Logged in as that employee: the task appeared with
  "Nhận"/"Từ chối" buttons; clicking "Nhận" updated its status badge to "Đã nhận" and swapped the
  button to "Hoàn thành" — a real state change round-tripped through the backend, not a local-only
  UI toggle.
* Same employee's task list also showed a department-wide task (assigned to their department, not
  to them personally) with **no** action buttons at all, correctly matching the backend rule that
  only a department head or executive may act on a department-targeted task.

## Verified — Phase 3 (2026-09-25, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session: catalog and access-request tables render real data with correct
  per-viewer action buttons (only the owning department's head/executive see Duyệt/Từ chối).
  Clicking "Kết nối Google Drive" genuinely navigated to `accounts.google.com` and returned
  Google's own `Error 401: invalid_client` — proving the redirect wiring is correct; a real
  Client ID from you is the only missing piece (see backend README's "Still needs your action").
* **Not verified**: the actual OAuth consent screen, and a folder registration/approval that
  succeeds against real Google APIs — both need your real Google login, which I can't do myself.

## Verified — Navigation & UI overhaul (2026-09-27, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session: login → lands on `/dashboard/departments`; sidebar correctly highlights
  the active page across all four sections; creating and deleting a department both produced the
  correct Toast ("Đã tạo phòng ban" / "Đã xoá phòng ban") in addition to the table updating.
* Resized to a 375px mobile viewport on all four pages: sidebar correctly collapses to a
  horizontal scrollable bar, the multi-field user-creation form stacks to one column, and — key
  check — `document.body.scrollWidth` stayed equal to the viewport width on every page (no
  page-level horizontal overflow); the wide `Nhân sự` table scrolls only within its own
  container (`Table`'s existing `overflow-x-auto`), exactly as intended.

## Verified — Phase 4 (2026-09-28, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session: all 4 themes switch instantly on click and the choice survives a full
  page reload (`localStorage`); confirmed the resolved CSS actually uses the theme's colors (not
  just visually — inspected the generated `.bg-surface-muted` rule directly) after catching and
  fixing bug #7 below. Settings page's change-password form round-trips against the real backend
  (wrong current password shows the backend's error inline; correct one lets a fresh login
  succeed with the new password). `/forgot-password`'s request step correctly surfaces the
  backend's `EMAIL_SERVICE_UNAVAILABLE` message while SMTP is unconfigured — confirmed this is
  not silently swallowed into a generic "success" on the frontend, which would have been a false
  positive. `UserManager`'s "Chuyển vị trí" inline form transferred a real EMPLOYEE to
  DEPARTMENT_HEAD in a different department (table updated correctly), and "Khoá"/"Mở khoá"
  correctly toggled a real account's status with the table's badge and button label flipping.
* **Not verified**: an actual OTP being received by email and used to complete a reset — needs
  your real Gmail App Password (see backend README's "Still needs your action").

One real bug was caught by running this, not by reading the code:

7. **Editing `tailwind.config.ts` to point color tokens at CSS variables had no visible effect
   until the Next.js dev server was restarted with its `.next` cache cleared** — a plain hot
   reload kept serving Tailwind's previously-compiled literal hex values. Caught by inspecting
   the actual computed `background-color` of a themed button in the dark theme (it stayed the
   light theme's color) rather than assuming the edit took effect because the page "looked
   like" it changed elsewhere (body background did update, since that rule lives directly in
   `globals.css`, not behind a Tailwind utility class).

## Verified — Phase 6 (2026-10-01, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session (logged in as an EMPLOYEE with real task/calendar/note data): header's
  ⭐/☰/🔔/⚙️ cluster all work from `/dashboard` — ⭐ opens the priority panel (now controlled from
  the header, not its own floating button), ☰ swaps the Home page into the task-board view and a
  card correctly expands its priority badge on click, 🔔 shows a live unread-count badge and its
  dropdown lists real notifications, ⚙️ links to Settings; Sidebar no longer has "Cài đặt" but
  does have "Lịch của tôi" and "Note của tôi". `/dashboard/calendar` renders a real month grid
  with two confirmed events on their correct days and a declined one correctly absent from the
  grid (still visible in the full list below); create/edit/delete all round-trip on
  `/dashboard/notes` against the real backend.

## Verified — Phase 7 (2026-10-01, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session (logged in as an EXECUTIVE with real multi-department data): Phòng ban
  renders as tiles with a "+" create tile (EXECUTIVE-only); a tile opens its 1/4–3/4 detail page
  with a real staff list and working "..." popover; clicking that popover's "Nhắn tin riêng"
  navigated straight into a real, pre-selected conversation on `/dashboard/messages`, and sending
  a new message there round-tripped against the real backend end to end. The ☰ board view's new
  "+" opens `CreateOwnTaskForm` and renders correctly. A real note's 📌 toggle made it appear as
  a floating, editable widget on `/dashboard` (a different page than where it was pinned) —
  confirmed both the minimize-to-icon and unpin controls on that floating widget itself work.

## Verified — Phase 9 (2026-10-01, this machine)

* `npx tsc --noEmit` — clean (also how the pre-existing missing-`MESSAGE_RECEIVED` bug above was
  caught, before any manual testing).
* Full two-account browser session against the restarted backend: sent a real message from
  `binmit1` to `binmit2` via `/dashboard/messages`; logged in as `binmit2` and clicked the
  resulting "Tin nhắn mới từ binmit1" notification — it navigated straight to
  `/dashboard/messages?with=1` with the conversation already open, not just to the messages list.
  From the Phòng ban → Truyền thông detail page, clicked "Nhắn tin riêng" on a staff member with
  zero prior messages — the new conversation's header showed their real name, not
  `Người dùng #9`.
* Task board (☰ Home view): with no period filter, "Đã hoàn thành (3)" rendered collapsed, and
  expanding it listed the 3 completed tasks; switching the filter to "Hôm nay" correctly dropped
  the completed count to 0 (all 3 were created on earlier days) while the still-open task
  (created today) remained visible — confirms the filter is reading `createdAt`, not just
  hard-coding "show everything".
* Settings → Giao diện: switched through Sáng/Tối/Xám in the browser. Tối showed the violet
  (`#7C3AED`) primary on the existing navy background; Xám kept its original gray accent
  untouched, confirming the branding was *not* over-applied to themes meant to stay distinct.
* Google Drive page: "Chưa kết nối" badge renders next to the connect button, and the
  register-folder form is replaced by the "connect first" hint — both only reachable in this
  state since real Google OAuth credentials aren't configured yet (still needs your action, see
  backend README).
* Backend-side notification fan-out for `FOLDER_ACCESS_REQUESTED` (which the inline Duyệt/Từ chối
  buttons depend on) was verified via curl against temporary test data — see backend README's
  Phase 9 section for why that approach was necessary and what it found.

## Verified — Phase 10 (2026-10-01, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session, light theme: Sidebar's active "Home" item visibly renders an
  Indigo→Violet gradient (not a flat fill); the page background is a faint indigo tint distinct
  from the still-white KPI/task cards sitting on it. Hovering a Phòng ban tile lifts it with a
  visible indigo-tinted shadow and border — confirmed the effect is hover-only (no lift at rest).
* Same session, dark theme: Sidebar's active item and the "Đăng xuất"/"Nhận" buttons show a
  clearly visible Violet→Indigo gradient against the navy background — a bigger visual jump from
  Phase 9's single flat violet than before.
* Switched to the Xám (gray) theme and confirmed every gradient-bearing element rendered as a
  flat, single-tone slate color with no visible second hue — confirms the degenerate-gradient
  approach (`--color-primary-end` = `--color-primary` on gray/pink) actually holds in the
  browser, not just in the CSS source.
* Not independently tested: `prefers-reduced-motion: reduce` behavior (would need to either
  change the OS-level setting or emulate it via DevTools — out of scope for this pass's time
  budget). The media query itself is standard and straightforward, but flagging this as *assumed
  correct by inspection*, not *verified running*, per this project's "never claim verified
  without actually testing" rule.

## Verified — Phase 11 (2026-10-01, this machine)

* `npx tsc --noEmit` — clean.
* Full two-account browser session against the restarted backend. Logged in as `binmit1`
  (EXECUTIVE) on `/dashboard/tasks`, clicked the ☰ icon: it navigated to `/dashboard` with the
  board view already active (confirmed by the icon's filled/active state and the board rendering
  immediately, not a second click needed). Logged out, logged in as `binmit2` (EMPLOYEE): sidebar
  no longer lists "Nhân sự" at all (confirmed by reading the full nav list, not just eyeballing
  it) — the other items (Phòng ban, Công việc, Tin nhắn, Lịch, Note, Drive) are all still present.
  From Phòng ban → Kỹ thuật, expanded "Nhom Backend" in the team list and saw its real 2 members
  (Truong Nhom 1, Binmit Two) with titles; the "..." popover for a team member showed the same
  info/action layout as a department member's popover ("Nhom Backend · Trưởng nhóm", Nhắn tin
  riêng, Gửi yêu cầu Drive).
* Backend-side rate limiting (`forgot-password`/`reset-password`) verified via curl — see backend
  README's Phase 11 section. Not independently re-tested from the browser's own forgot-password
  form, since the curl test already exercises the exact same endpoint/code path.

## Verified — Phase 12 (2026-10-01, this machine)

* `npx tsc --noEmit` — clean.
* `/login` renders the wordmark SVG correctly while logged out (the exact case the middleware
  matcher bug broke); the favicon/header icon render as a clean indigo-violet planet in both
  light and dark themes.
* Every theme's gradient surfaces (primary buttons, active sidebar nav) were visually confirmed
  to show a genuine two-tone gradient with a crisp edge, including Xám and Hồng which were flat
  before this pass.
* Full curl-then-browser avatar/presence session: uploaded a real PNG via `POST /auth/me/avatar`,
  then confirmed in the browser that it renders in both the header and a department member's
  directory entry (via the blob-URL fetch, not a raw cross-origin `<img>`, which would have
  silently 401'd). Cycled through all 3 presence states in the Settings page and confirmed each
  click updates the selected button's highlight immediately, with no page reload — this is the
  specific behavior that was broken before the `invalidateQueries` fix (confirmed broken, then
  confirmed fixed, in the same browser tab).
* **A debugging dead end worth recording**: while chasing the presence-status bug, re-testing in
  what turned out to be a *stale* orphaned `next dev` process (TaskStop had killed the wrapper
  shell but not the underlying Node child, which kept the real port listening — a previous restart
  had silently fallen back to port 3001 because 3000 looked "free" from the new process's point of
  view) produced identical-looking failures to the real bug, costing real debugging time before
  `netstat` surfaced the actual orphaned PID. The *actual* fix (`invalidateQueries`) was correct
  the whole time; a closed+reopened browser tab against the confirmed-correct port is what finally
  proved it. Lesson, alongside the stale-JVM one in the backend README: after `TaskStop`, verify
  the port is actually free (`netstat`) before trusting a "started successfully" log line from the
  replacement process — a silent port fallback looks identical to a clean restart in the log.
