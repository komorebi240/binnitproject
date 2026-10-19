# Frontend - Next.js app

React + Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query. Status: **Phases 1-27
verified end to end in a real browser** - see "Verified" sections below. Stack-wide conventions
this structure implements are in the root
[CLAUDE.md § 46](../CLAUDE.md#46-tech-stack-and-project-structure); read that before adding code.

## What exists now

* **`features/auth`** - `LoginForm`, `useCurrentUser`/`useLogin`/`useLogout` (TanStack Query,
  `['auth','me']` is the source of truth for "am I logged in, as whom"). Login posts credentials;
  the backend responds by setting an httpOnly cookie (see backend README) - this app never
  touches the token itself.
* **`features/organization`** - `DepartmentManager`, `TeamPanel`, `UserManager`: create/list/
  delete departments, teams, and users, scoped to whatever the logged-in user is allowed to see
  (the backend enforces this independently; the UI just hides controls the user can't use - e.g.
  the "Xoá" and "Tạo phòng ban" controls only render for an EXECUTIVE, mirroring CLAUDE.md
  section 9's "hide the button on the frontend, verify the permission on the backend" example).
* **`middleware.ts`** - redirects based on whether the session cookie is *present*, not whether
  it's valid (it can't read an httpOnly cookie's contents, and must not try). An expired/invalid
  cookie just means the first API call from `/dashboard/*` gets a 401 and the page bounces to
  `/login` - the backend is still the only real authorization boundary.
* The old reference `features/sample` has been deleted; `app/page.tsx` is now just a fallback
  (middleware redirects `/` to `/login` or `/dashboard/*` before it would ever render).
* **`features/tasks`** - `TasksPanel` (list + create form). `CreateTaskForm` only renders for
  EXECUTIVE/DEPARTMENT_HEAD/TEAM_LEAD, and its "Cả một phòng ban" (whole department) option is
  hidden for TEAM_LEAD, mirroring `TaskServiceImpl`'s assignment rules. `TaskList`'s
  Nhận/Từ chối/Hoàn thành/Huỷ buttons are shown per `canActOnTask`/`canCancelTask` helpers that
  mirror the backend's authorization checks - approximations for UX only; the backend is what
  actually enforces them.
* **`features/drive`** - `DrivePanel`: `ConnectDriveButton` does a full-page
  `window.location.href` redirect to the backend's `/drive/connect` (OAuth cannot go through
  axios/XHR); `FolderCatalog` lets a user paste a Drive folder link/ID to register it for their
  department; `AccessRequestPanel` sends/approves/rejects cross-department access requests. The
  `/dashboard/drive` page reads `?drive=connected` / `?error=...` query params (set by the
  backend's OAuth callback redirect) to show a one-line status banner.

### Navigation & UI (after a design discussion with the user - see session history)

* **`/dashboard/*` is now four separate pages** (`departments`, `users`, `tasks`, `drive`)
  under a shared `app/dashboard/layout.tsx` (auth gate + header) with a `Sidebar`
  (`components/layout/Sidebar.tsx`) - not one long scrolling page anymore. `/dashboard` itself
  just redirects to `/dashboard/departments`. Each page is a thin wrapper that reads
  `useCurrentUser()` (already cached, no extra fetch) and renders its feature panel.
* **`Sidebar` is a fixed left column on desktop, a horizontal scrollable bar on small screens**
  - chosen deliberately over a hamburger/drawer menu, since the agreed scope was "don't break
  mobile layout," not a fully mobile-optimized nav (see the UI design discussion).
* **`ToastProvider`/`useToast`** (`components/ui/Toast.tsx`, wired into `app/providers.tsx`) -
  every mutation across `organization`/`tasks`/`drive` now reports success or failure via a
  toast, closing the gap where a successful action (e.g. deleting a department) previously left
  the page silently updating with no confirmation. Toasts are additive to, not a replacement
  for, inline field-level validation errors that need to stay visible.
* `EmptyState` usages across all four pages now include a one-line next-step hint (e.g. "Tạo
  phòng ban đầu tiên bên dưới") instead of just naming what's missing.

### Theme system, Settings, forgot-password (Phase 4)

* **`components/theme/ThemeProvider.tsx`** - 4 themes (`light`/`dark`/`gray`/`pink`), persisted
  per-device in `localStorage` (deliberately not synced to the backend - see its javadoc-style
  comment). Sets `data-theme` on `<html>`; `app/globals.css` defines each theme's palette as CSS
  variables and `tailwind.config.ts`'s `primary`/`surface`/`danger` tokens resolve through them
  (`rgb(var(--color-x) / <alpha-value>)`), so switching themes recolors the whole app instantly
  with no rebuild. A handful of `!important` overrides in `globals.css` keep older feature panels
  (written before the theme system existed, using raw `text-gray-900`/`bg-white`/etc.) readable
  under the dark theme without rewriting every className - see that file's comment for the
  trade-off this accepts.
* **`features/settings`** - `/dashboard/settings` page: `ThemePicker`, `ChangePasswordForm`,
  `RecoveryEmailForm` (binds the account's recovery email/phone - reuses the existing `email`
  column, doesn't add a new "bind gmail" concept), `CompanyInfoForm` (renders nothing for a
  non-EXECUTIVE - the backend enforces this independently too).
* **`/forgot-password`** (public route, added to `middleware.ts`'s allow-list) -
  `ForgotPasswordForm` is a 2-step flow: request an OTP by username (always shows the same
  generic message, mirroring the backend's never-leak-account-existence contract), then submit
  the OTP + new password. `LoginForm` links to it.
* **`features/organization`** - `UserManager` gained `phone`/`employeeCode`/`startDate` fields on
  the create form and matching table columns, a "Khoá"/"Mở khoá" button (calls
  `PATCH /users/{id}/status`), and a "Chuyển vị trí" button that opens `TransferPositionForm`
  inline below the table (no Modal primitive exists yet - see `components/ui/README.md` - so this
  reuses the same inline-form pattern already used for creating a user).

### Home page, KPI, priority panel (Phase 5)

* **`app/dashboard/page.tsx`** - no longer redirects; it's the employee Home page now. Renders
  `features/kpi/components/KpiSummaryCards` (3 quick-glance numbers + a workload bar chart, both
  scoped to the same calendar month as the backend's KPI summary - see that component's comment
  for why the chart filters `createdAt` itself instead of trusting an unscoped task list) and
  `features/tasks/components/PriorityPanel`.
* **`components/ui/BarChart.tsx`** - a stacked horizontal bar built from plain divs sized by
  percentage, not a charting library (CLAUDE.md section 29 - one chart doesn't justify a new
  dependency).
* **`PriorityPanel`** - a small tab fixed to the right edge (Notion-style, per your reference
  screenshot); clicking it slides out a panel grouping the caller's own still-open tasks
  (ASSIGNED/ACCEPTED) into three columns by `TaskPriority` - a field that already existed
  end-to-end on the backend but was never shown anywhere in the UI before this.
* **`features/kpi`** - `KpiConfigForm` (Settings, EXECUTIVE-only, hidden otherwise) edits the
  company's KPI weight and incentive-tier table; `UserKpiPanel` is the inline panel shown in
  `UserManager` when a manager clicks the new "Xem KPI" button on a row they're allowed to manage.

### Header redesign, Calendar, Notes, Notifications (Phase 6)

* **`app/dashboard/layout.tsx`** - the header now has an icon cluster (⭐ priority panel, ☰ board
  view, 🔔 notifications, ⚙️ settings) replacing the old floating "Ưu tiên" button and the
  Sidebar's "Cài đặt" entry. `components/layout/HomeViewContext.tsx` is a small context so the
  header's ☰ icon can toggle how `app/dashboard/page.tsx` renders without threading props through
  the layout/page boundary - only the Home page reads it, so toggling elsewhere is a no-op.
* **`features/tasks/components/TaskBoardView.tsx`** - the ☰ view: the caller's own tasks in 3
  compact columns by status; click a card to expand description/priority/due date in place. Same
  `useTasksList` data the KPI cards already fetch, no new endpoint.
* **`features/tasks/components/PriorityPanel.tsx`** - now a controlled component (`open`/`onClose`
  props) instead of owning its own trigger button, since the trigger moved into the header.
* **`features/notifications`** - `NotificationBell` polls every 30s (`refetchInterval`, not a
  WebSocket - CLAUDE.md section 29) for the unread badge and dropdown list.
* **`features/calendar`** - `/dashboard/calendar`: a self-drawn month grid (no calendar library)
  plus a pending-events banner with Accept/Decline. `AddEventForUserForm` is used from
  `UserManager`'s new "Thêm lịch" button - a manager can propose an event but never views the
  target's actual calendar (it's private; the backend enforces that independently too).
* **`features/notes`** - `/dashboard/notes`: simple create/edit/delete, fully private per user.

### Self-service tasks, department directory, messaging, note pinning (Phase 7)

* **`features/tasks/components/CreateOwnTaskForm.tsx`** - opened by the new "+" button on
  `TaskBoardView.tsx`'s header; anyone can now give themselves a task (the backend only still
  gates assigning to someone ELSE by authority tier).
* **`CreateTaskForm.tsx`** (manager-facing) - picking an assignee now shows that person's
  current open tasks inline, filtered from the `useTasksList()` data already being fetched, so a
  manager can see what's already on someone's plate before adding more.
* **`DepartmentManager.tsx`** - departments are now medium square tiles instead of a table;
  clicking one opens `app/dashboard/departments/[id]/page.tsx`, a 1/4-3/4 layout (identity on the
  left, directory + teams on the right - `TeamPanel` is unchanged, just relocated).
  **`DepartmentMemberList.tsx`** is a new internal company directory (readable by anyone, not
  just managers) with a "..." popover (email/title, "Nhắn tin riêng", "Gửi yêu cầu Drive").
* **`features/messages`** (new) - simple 1-1 chat, polling every 10s like notifications poll
  every 30s. `/dashboard/messages` reads a `?with=` query param (set by the department
  popover's link) to pre-select a conversation.
* **`features/notes`** - `NoteExpandModal.tsx` (dimmed overlay, larger editable "sheet of
  paper") and a 📌 pin toggle per note. **`PinnedNoteWidget.tsx`** is mounted once in
  `app/dashboard/layout.tsx` and renders any pinned note as a small floating, editable card on
  every `/dashboard` page until unpinned - "always on display" within the app, not outside the
  browser (not possible for a web app).

### UI/UX review pass - emoji → SVG icons, focus rings (Phase 8)

Referenced [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(its local Python search tool, run directly - not installed as a Claude plugin, which isn't
available from this session) to look up real UI/UX guidelines against this app's actual screens,
rather than reviewing from memory. Two concrete, recurring gaps came back and were fixed
app-wide: emoji used as icons everywhere (Sidebar, header cluster, notification bell, note pin,
member-list menu), and missing visible focus rings on several custom icon-only buttons (flagged
Critical/High severity for keyboard accessibility). Fixed by adding `@phosphor-icons/react`
(see `components/ui/README.md`'s new "Icons" section for the convention going forward) and a
`focus-visible:outline` on every icon-only control that lacked one. No layout, behavior, or data
changes - purely a visual/accessibility pass.

### Notification routing, message display name, task board filtering, Orbit branding (Phase 9)

Five independent fixes/polish items from a user backlog note, each touching an existing Phase
6-8 feature rather than adding a new one:

* **`NotificationBell.tsx`** - `resolveTarget()` maps each notification type to a real route
  (`MESSAGE_RECEIVED` → `/dashboard/messages?with={senderId}`, `CALENDAR_EVENT_INVITE` →
  `/dashboard/calendar`, `FOLDER_ACCESS_REQUESTED` → `/dashboard/drive`); clicking a notification
  marks it read and navigates there. `FOLDER_ACCESS_REQUESTED` additionally gets inline
  Duyệt/Từ chối buttons in the dropdown itself (`useApproveAccessRequest`/
  `useRejectAccessRequest`, already built for the Drive page) - an approver never has to leave
  the dropdown to decide. Caught and fixed a real pre-existing bug while wiring this up: the
  frontend's `NotificationType` union was missing `MESSAGE_RECEIVED` entirely (`tsc` failure),
  left over from when the backend added it in Phase 7.
* **`MessengerView.tsx`** - a brand-new conversation (started via the department directory's
  "Nhắn tin riêng", before any message exists for the backend to name the other party from) now
  shows the real name passed through the `?name=` query param instead of falling back to
  `Người dùng #{id}`.
* **`TaskBoardView.tsx`** - rewritten: `DONE` is no longer an always-visible column; completed
  tasks move into a collapsible "Đã hoàn thành (N)" section below the board. A new "Khoảng thời
  gian" filter (Tất cả/Hôm nay/Tuần này/Tháng này/Năm nay) scopes "my tasks" by `createdAt`,
  reusing the same period-boundary logic as `KpiSummaryCards`.
* **Orbit branding** - researched via `ui-ux-pro-max-skill` (cloned locally, queried for
  product/color/typography guidance rather than guessed) rather than picked arbitrarily: Indigo
  `#4F46E5` for the light theme, Violet `#7C3AED` for the dark theme (whose `#0F172A` background
  already matched the existing dark theme), Space Grotesk for headings + DM Sans for body text.
  Deliberately scoped to only `light`/`dark` in `globals.css` - `gray`/`pink` keep their original
  accent colors as genuinely distinct alternate options, not forced into the brand hue (see the
  comment in `globals.css` above the theme blocks).
* **Drive UI** - `ConnectDriveButton.tsx` shows a "Chưa kết nối" badge when not connected (previously
  no status indicator at all); `FolderCatalog.tsx`'s folder names are now clickable external links
  to the real Drive folder, and the register-folder form is gated behind a connected status instead
  of always being shown.

### Bolder Orbit brand presence + purposeful hover motion (Phase 10)

Phase 9's Orbit rebrand only swapped the primary color and fonts - same layout, same flat single
color everywhere. The user's explicit feedback was "giao diện có khác là mấy đâu" (this barely
looks different); this pass makes the brand actually read as a brand without touching layout or
component structure, grounded in `ui-ux-pro-max-skill` lookups for "enterprise SaaS" style (which
recommends Minimalism/Swiss-style structure, explicitly listed as best-fit for "Enterprise apps,
dashboards... SaaS platforms") plus a real Indigo-primary design-system color reference (tinted
background/surface instead of flat neutral gray) rather than inventing values by eye.

* **`app/globals.css`** - new `--color-primary-end` per theme (violet for light, indigo for dark -
  the two brand hues swap which one is "primary" vs "gradient end" between themes) backs a
  `from-primary to-primaryEnd` gradient, used instead of a flat fill. `gray`/`pink` set
  `--color-primary-end` equal to `--color-primary` - a degenerate (flat) gradient - so they stay
  untouched, consistent with Phase 9's scoping decision. `--color-body-bg`/`--color-surface-muted`
  are now faintly brand-tinted (indigo-ish in light, violet-tinted slate in dark) instead of
  neutral gray, so white/navy cards read as sitting on a branded surface rather than plain gray.
* **New `.card-interactive` utility** (`globals.css`) - a brand-tinted shadow plus a 2px lift on
  hover, 200ms, applied only to genuinely clickable cards (department tiles, task board cards) -
  never to a static display card like the KPI stat tiles, which can't be clicked and shouldn't
  look like they can. A global `prefers-reduced-motion: reduce` media query (previously missing
  entirely - flagged High severity by the same UI/UX lookup) zeroes out this and every other
  transition/animation duration for users who've asked the OS for reduced motion.
* **`tailwind.config.ts`** - new `primaryEnd` color token (`withOpacity("--color-primary-end")`)
  so `from-primary`/`to-primaryEnd` gradient utilities are available anywhere in the app.
* **`components/ui/Button.tsx`** (primary variant), **`components/layout/Sidebar.tsx`** (active
  nav item), **`features/tasks/components/TaskBoardView.tsx`** (self-task "+" button, task cards),
  **`features/organization/components/DepartmentManager.tsx`** (department tiles) - updated to use
  the gradient and/or `.card-interactive`. No other component changed; this is a presentation-layer
  pass only, matching the "don't touch layout/data" scope the user confirmed.

### Security audit + 3 reported bugs (Phase 11)

The user asked for a security review covering 5 items (signup CAPTCHA, user-info leakage,
IDOR/privilege escalation, hardcoded frontend admin checks, secret leakage via source code) plus
3 reported bugs. A read-only code audit found **all 5 security items were false alarms** - no
public signup endpoint exists at all, no DTO returns a password/token, every backend service
method re-derives the company/owner boundary before acting (not just a role check), every
frontend `authorityLevel === "..."` check mirrors a real backend check rather than being a
bypass, and the only `process.env` value read client-side is the intentionally-public API base
URL (`NEXT_PUBLIC_API_BASE_URL`). See the backend README's Phase 11 section for the equivalent
summary on that side.

The 3 bugs were all real:

* **Missing team-member view** - `TeamPanel.tsx`'s teams were a flat list with no way to see who
  was in one (the Phòng ban level had this via `DepartmentMemberList.tsx`, the Nhóm level never
  got the equivalent). Fixed by extracting the actual member-rendering/popover UI out of
  `DepartmentMemberList.tsx` into a shared **`MemberList.tsx`** (presentational, takes
  `members`/`isLoading`/`contextLabel` as props) and adding a thin **`TeamMemberList.tsx`**
  wrapper around the new `useTeamMembers()` hook (→ backend's new
  `GET /api/v1/teams/{id}/members`). `TeamPanel.tsx` now renders each team as an expandable row
  (same caret-expand pattern as `TaskBoardView.tsx`'s "Đã hoàn thành" section) instead of a plain
  `Table` row, since the shared `Table` primitive has no sub-row/expansion support and adding one
  for this single use case wasn't worth it (CLAUDE.md section 29).
* **"Nhân sự" nav shown to roles that land on a blank page** - `Sidebar.tsx`'s `NAV_ITEMS` had no
  role filtering, so every role saw the link, but `UserManager.tsx` already returned `null` for
  any role with an empty `allowedLevelsFor()` result (EMPLOYEE). Fixed by giving `NAV_ITEMS`
  entries an optional `roles` array and filtering in `Sidebar` - it now takes a
  `currentUserAuthorityLevel` prop (passed from `dashboard/layout.tsx`, which already has
  `currentUser` loaded) and hides "Nhân sự" for EMPLOYEE, matching `UserManager`'s own gate
  exactly rather than inventing a separate rule that could drift from it.
* **☰ board-view icon didn't navigate home** - clicking it from any page other than `/dashboard`
  just flipped the `isBoardView` context flag with nothing visibly changing, since only
  `app/dashboard/page.tsx` reads that flag. Fixed in `dashboard/layout.tsx`'s
  `HeaderIconControls`: `HomeViewContext` gained a `setBoardView(value)` setter alongside the
  existing `toggleBoardView()`; the click handler now checks `usePathname()` - on `/dashboard` it
  toggles as before, anywhere else it forces the board view on and `router.push("/dashboard")`.

### Orbit logo/favicon, bolder theme contrast, avatars + presence (Phase 12)

* **Logo/favicon** - `app/icon.svg` (planet-only mark, Next's App Router convention for the
  favicon) and `public/orbit-wordmark.svg` (planet + "ORBIT" wordmark, shown on `/login`; replaced
  in Phase 25 by the inline `components/brand/OrbitWordmark.tsx`),
  redrawn cleanly from the user's own rough draft rather than reusing its jagged paths, recolored
  to the actual Indigo/Violet tokens. Rendered as plain `<img>` tags, not `next/image` - the
  optimizer's `/_next/image` route returned `400 "isn't a valid image"` for both SVGs (confirmed
  via the network tab, not assumed), and a static vector icon gets nothing from that pipeline
  anyway. **Real bug this surfaced**: `middleware.ts`'s matcher redirected unauthenticated
  requests for *any* non-allow-listed path straight to `/login` - including the wordmark image
  `/login` itself needed to render, a self-defeating redirect loop for anyone not already logged
  in. Fixed by excluding common static image extensions from the matcher.
* **Theme gradient contrast** (user feedback: gradients sometimes "blended into the background")
  - every theme (not just light/dark) now gets a real two-stop gradient on `--color-primary`
  tokens, with the two stops picked for a genuine lightness gap (e.g. gray: slate-500→slate-800,
  pink: pink-400→pink-800) instead of near-identical tones; gray/pink stay non-"Orbit-branded" in
  hue, just structurally consistent now. New `.gradient-surface` utility adds a theme-aware 1px
  hairline ring so a gradient surface stays visually crisp even on a similarly-toned background,
  applied to every existing gradient surface (`Button`, `Sidebar` active nav, the board view's "+"
  button).
* **`components/ui/Avatar.tsx`** (new) - uploaded photo, or initials-on-brand-gradient when none
  is set; an optional colored presence dot. **`features/auth/hooks/useAvatarSrc.ts`** (new) - the
  reason this isn't just `<img src={avatarUrl}>`: the avatar endpoint requires the httpOnly auth
  cookie, which a cross-origin `<img>` subresource request can't carry (`SameSite=Lax` only rides
  along on a top-level navigation). This hook fetches the bytes through the same `apiClient` axios
  instance every other call uses (`withCredentials: true`) and turns the response into a local
  blob URL instead.
* **`features/settings/components/ProfileAvatarForm.tsx`** (new, added to `/dashboard/settings`)
  - upload control + the 3-state presence picker (Trực tuyến/Hạn chế/Không làm phiền). The
  dashboard header shows the caller's own `Avatar` next to "Đăng xuất"; `MemberList.tsx` (shared
  by department and team directories) shows one per member.
* **A real, fully reproduced frontend bug**: `useUploadAvatar`/`useUpdatePresence` originally
  called `queryClient.setQueryData(AUTH_ME_QUERY_KEY, profile)` on success (the same pattern
  `useLogin` uses) - the cache value updated correctly (confirmed by a direct `fetch` from the
  console), but an already-mounted `useCurrentUser()` consumer on the same page never
  re-rendered to show it; only a full remount (navigating away and back) picked up the new value.
  `useLogin` gets away with this only because it's immediately followed by a route change, which
  remounts everything anyway. Fixed by switching both to `queryClient.invalidateQueries({queryKey:
  AUTH_ME_QUERY_KEY})` - the pattern every *other* mutation in this codebase already uses (e.g.
  `features/notifications/hooks/useNotifications.ts`) - confirmed fixed in a freshly opened
  browser tab after ruling out a stale dev-server process as a red herring (see Verified below).

### UI polish pass - dropdowns, department page contrast, auto-collapsed done tasks, message overflow (Phase 13)

Four small, independent user-reported issues, each a real bug once investigated rather than
guessed at:

* **`components/ui/Select.tsx` looked "plain"** - a bare native `<select>` with only a border
  color change on hover. Added `appearance-none` + a custom `CaretDown` icon (replacing the
  OS-default arrow), a shadow, and a focus ring matching `Button`'s. The native dropdown *list*
  itself still can't be restyled cross-browser without replacing it with a full custom listbox -
  noted as a deliberate scope cut, not an oversight, in the component's own comment.
* **Phòng ban detail page felt "washed out"** - `departments/[id]/page.tsx` and `TeamPanel.tsx`
  had no card surfaces at all, just text directly on the page background; nothing anchored the
  eye. Wrapped both the identity panel and the "Nhân sự" section in `bg-surface` cards with a
  border and shadow, and added a gradient initial-letter badge (reusing the same
  `.gradient-surface` treatment as `Avatar`'s fallback) to the department identity panel and to
  each tile in `DepartmentManager.tsx`'s grid - the tile grid had the identical "nothing to anchor
  on" problem.
* **No auto-hide for completed tasks on `/dashboard/tasks`** - `TaskBoardView.tsx` (the ☰ Home
  view) already collapses `DONE` tasks into their own section; `TaskList.tsx` (the plain
  `/dashboard/tasks` list, used by managers) never got the same treatment and mixed finished work
  in with everything still open indefinitely. Added the identical collapsible "Đã hoàn thành (N)"
  pattern, reusing the same column definitions for both the active-task table and the collapsed
  one.
* **Chat bubbles and message previews overflowed their container** - two distinct real bugs, not
  one: (1) `MessengerView.tsx`'s chat bubbles (`max-w-xs`) had no `break-words`, so a single long
  unbroken string (exactly what Phase 12's own test message - two sentences concatenated with no
  space between them - looked like) doesn't wrap and spills past the bubble's rounded background.
  (2) The conversation list's last-message preview had `truncate` applied to a `<span>` that was a
  flex item under `items-start` with no `w-full` - `truncate` only works once its element is
  actually width-constrained, and a non-stretched flex item just sizes to its content instead,
  so the ellipsis logic never activated and the text spilled past the sidebar edge. Both are
  one-line fixes (`break-words` on the bubble, `w-full` on the preview span) but needed the actual
  rendered DOM/box model reasoned through, not just a glance at the className.
* **Login page logo was visibly off-center** (user-reported after the fix above shipped) -
  `public/orbit-wordmark.svg`'s `viewBox` was `0 0 260 72`, but the actual icon+text content only
  occupied roughly the left two-thirds of that box, leaving ~90 units of dead space on the right.
  A flex-centered `<img>` centers its *bounding box*, not its visible content, so the whole lockup
  rendered shifted left of true center. Fixed by tightening the `viewBox` to `0 0 182 64` to match
  the content's actual extent; confirmed via `getBoundingClientRect()` that the image's visual
  center now lands within 1px of the viewport's horizontal center.

### Logout moved to Settings, cancelled-task restore/delete, broadcast composer, quick search, priority tints (Phase 14)

Another user feedback batch:

* **"Đăng xuất" moved out of the header into Settings** - `dashboard/layout.tsx`'s header no
  longer has a logout button at all; `ProfileAvatarForm.tsx` (already the self-service
  avatar/presence panel) gained the fullName/title/department line that used to sit under the
  company name in the header, plus the logout button itself, both next to the avatar - profile
  identity and the "leave" action now live in the one place that's actually about the caller's
  own account, instead of being split across two spots.
* **Header's top-left corner now shows the Orbit brand (icon + wordmark), not the tenant's
  company name** - same wordmark the login page uses (now the `OrbitWordmark` component), just smaller. This is
  "whose product is this" (constant across every company using the app), not "whose workspace is
  this" (which was already redundant with the sidebar/Settings context).
- **`components/ui/Select.tsx`** gained a second round of polish: the caret now rotates 180°
  on focus via a `peer-focus` utility (the only "it's open" signal CSS can give without replacing
  the native dropdown list - documented as a deliberate scope cut in the component's own comment).
* **Cancelled tasks get the same collapsible treatment as completed ones, plus restore/delete** -
  both `TaskList.tsx` (`/dashboard/tasks`) and `TaskBoardView.tsx` (the ☰ Home view) now have a
  collapsed "Đã huỷ (N)" section (previously cancelled tasks were just mixed into the main active
  list forever). Each cancelled item gets a "..." menu (`DotsThreeVertical`) with "Thêm lại"
  (→ `POST /tasks/{id}/restore`) and "Xoá" (→ `DELETE /tasks/{id}`), using the new
  `useRestoreTask`/`useDeleteTask` hooks.
* **`MessengerView.tsx`** - both the conversation-list sidebar and the chat panel are now
  distinct `bg-surface` cards with a border and shadow (previously just a `border-r` divider - no
  visual separation at all between "pick who to talk to" and "the conversation itself"); the
  message input is now a pill-shaped bar (`rounded-full`, `bg-surface-muted`, a focus ring) rather
  than a plain square input, reading as a real chat composer rather than a generic form field.
* **`features/tasks/components/PriorityPanel.tsx`** - each priority tier's section now sits on a
  light tint matching its tone (red/amber/gray washes) with white item cards on top, inspired by
  a Kanban board's tinted-column style the user referenced - previously every tier was on the same
  flat white background with only the small badge differing.
* **`components/layout/QuickSearch.tsx`** (new) - a Ctrl/Cmd+K command palette over the same
  `NAV_ITEMS` the Sidebar renders (exported from `Sidebar.tsx` so the two can never drift out of
  sync), filtered by the same role rules the Sidebar already applies. Arrow keys move the
  selection, Enter navigates, Escape (or the backdrop) closes.
* **`features/messages/components/BroadcastComposer.tsx`** (new) - shown only when
  `currentUser.systemAccount` is true (see backend README's Phase 14), on `/dashboard/messages`.
  A deliberately separate two-step (compose → confirm) flow from the normal 1-1 composer, since
  "send to literally everyone in the system" warrants its own confirmation step rather than living
  inside an ordinary conversation thread.

### Chrome-style tabs for multitasking (Phase 15)

User-requested: open several pages at once and switch between them like browser tabs, without
losing in-progress work. Decisions confirmed with the user up front: tabs live *inside* the app
(not OS windows); shareable per-page URLs were explicitly traded away ("sử dụng mang tính cá nhân
và nội bộ"); Sidebar/QuickSearch/notification clicks change the **active** tab's content, only the
"+" opens a new tab (always to Home).

* **Why not just Next.js routes**: the App Router mounts exactly one route at a time, so a route
  change always unmounts the previous page and loses its state. Instead `components/layout/`
  gained `TabsContext.tsx` (tabs = `{id, path, boardView}`, a *virtual* path never pushed to the
  browser URL), `TabBar.tsx` (the strip + "+"/close), `tabMeta.ts` (label/icon from a path) and
  `TabContentRenderer.tsx`, which maps a path to the real feature component and renders **every**
  open tab at once, hiding inactive ones with CSS (`hidden`) instead of unmounting - that is what
  preserves typed drafts and menus across switches. Cost: every open tab's queries keep polling.
* `dashboard/layout.tsx` no longer renders Next's `children`; the real URL stays `/dashboard`.
  `app/dashboard/[[...slug]]/page.tsx` is an intentionally empty catch-all so real URLs still
  resolve - notably the Google Drive OAuth callback (`/dashboard/drive?drive=connected`), which
  `TabsProvider` picks up on load, opens in the active tab, then resets the address bar. Open tabs
  persist across reload in `sessionStorage` (paths only, never page data).
* Everything that used `<Link>`/`router.push` for in-app navigation now calls
  `navigateActiveTab(path)`: Sidebar, QuickSearch, NotificationBell, DepartmentManager tiles,
  MemberList actions, header avatar/gear. Pages that read `useParams()/useSearchParams()` were
  extracted into prop-driven components (`DepartmentDetailView`, `HomeTabContent`,
  `DriveTabContent`, `SettingsView`; `MessengerView` takes `initialWith/initialWithName`). The
  ☰ board toggle is per-tab now (`boardView` on the tab) - the global `HomeViewContext` and the old
  per-route `page.tsx` files were deleted as superseded.

## Running locally (once dependencies are installed)

```bash
node -v              # confirm Node 20+ is on PATH
npm install
cp .env.example .env.local   # then point NEXT_PUBLIC_API_BASE_URL at your running backend
npm run dev
```

Log in as `binmit1` / `binmit1` (or any of `binmit2`-`binmit4` - see backend README for who's
who) once the backend is running with its dev seed data.

## Testing

```bash
npm run lint
npx tsc --noEmit     # type-check
npm test             # Jest (jest.config.mjs, via next/jest) - the *.test.ts files under src/
```

**Written (Phase 25)**: unit tests for pure logic only, in a node environment - the floating-window
geometry (`lib/floatingWindow.test.ts`) and the login intro timeline
(`features/auth/introTimeline.test.ts`), 34 tests. They import `describe/it/expect` from
`@jest/globals` (it ships with jest; `@types/jest` is not installed).

**Not yet written**: automated component tests. `@testing-library/react` is a dependency but a DOM
test environment (`jest-environment-jsdom`) is not, so anything that renders a component is still
verified by hand in a real browser (see "Verified" below) - real evidence it works today, but not a
regression guard. Add Jest/RTL tests for `LoginForm`, `DepartmentManager`, and `UserManager`
(and install the jsdom environment) before building on top of them.
End-to-end tests (Playwright/Cypress) are still deferred per CLAUDE.md section 29 (don't add a
dependency before it earns its keep) - reconsider once there's a multi-page flow worth covering.

## Verified - Phase 1 (2026-09-24, this machine)

* `npx tsc --noEmit` - clean (one real error caught and fixed: `allowedLevels[0]` is typed
  `AuthorityLevel | undefined` under `noUncheckedIndexedAccess`, since an EMPLOYEE's allowed-level
  list is empty).
* Full browser session against the real backend: logged in as `binmit1` (EXECUTIVE), saw the
  real company name and every department/user created via the API in earlier testing, created a
  new department and a new team through the UI, viewed a team's members. Logged out, logged in
  as `binmit2` (EMPLOYEE), and confirmed the UI correctly renders a read-only department/team
  view with no user-management section at all and no delete controls - matching exactly what the
  backend would reject if called directly.
* `SameSite=Lax` on the auth cookie (a deviation from the original plan's `Strict` - see backend
  `AuthController` javadoc) works correctly across the frontend's `localhost:3000` and backend's
  `localhost:8080`: no CORS or cookie-not-sent issues in the real browser test.

## Verified - Phase 2 (2026-09-25, this machine)

* `npx tsc --noEmit` - clean.
* Created a task for a specific employee through the `CreateTaskForm` UI (assignee dropdown
  populated from the real `GET /users` list). Logged in as that employee: the task appeared with
  "Nhận"/"Từ chối" buttons; clicking "Nhận" updated its status badge to "Đã nhận" and swapped the
  button to "Hoàn thành" - a real state change round-tripped through the backend, not a local-only
  UI toggle.
* Same employee's task list also showed a department-wide task (assigned to their department, not
  to them personally) with **no** action buttons at all, correctly matching the backend rule that
  only a department head or executive may act on a department-targeted task.

## Verified - Phase 3 (2026-09-25, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session: catalog and access-request tables render real data with correct
  per-viewer action buttons (only the owning department's head/executive see Duyệt/Từ chối).
  Clicking "Kết nối Google Drive" genuinely navigated to `accounts.google.com` and returned
  Google's own `Error 401: invalid_client` - proving the redirect wiring is correct; a real
  Client ID from you is the only missing piece (see backend README's "Still needs your action").
* **Not verified**: the actual OAuth consent screen, and a folder registration/approval that
  succeeds against real Google APIs - both need your real Google login, which I can't do myself.

## Verified - Navigation & UI overhaul (2026-09-27, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session: login → lands on `/dashboard/departments`; sidebar correctly highlights
  the active page across all four sections; creating and deleting a department both produced the
  correct Toast ("Đã tạo phòng ban" / "Đã xoá phòng ban") in addition to the table updating.
* Resized to a 375px mobile viewport on all four pages: sidebar correctly collapses to a
  horizontal scrollable bar, the multi-field user-creation form stacks to one column, and - key
  check - `document.body.scrollWidth` stayed equal to the viewport width on every page (no
  page-level horizontal overflow); the wide `Nhân sự` table scrolls only within its own
  container (`Table`'s existing `overflow-x-auto`), exactly as intended.

## Verified - Phase 4 (2026-09-28, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session: all 4 themes switch instantly on click and the choice survives a full
  page reload (`localStorage`); confirmed the resolved CSS actually uses the theme's colors (not
  just visually - inspected the generated `.bg-surface-muted` rule directly) after catching and
  fixing bug #7 below. Settings page's change-password form round-trips against the real backend
  (wrong current password shows the backend's error inline; correct one lets a fresh login
  succeed with the new password). `/forgot-password`'s request step correctly surfaces the
  backend's `EMAIL_SERVICE_UNAVAILABLE` message while SMTP is unconfigured - confirmed this is
  not silently swallowed into a generic "success" on the frontend, which would have been a false
  positive. `UserManager`'s "Chuyển vị trí" inline form transferred a real EMPLOYEE to
  DEPARTMENT_HEAD in a different department (table updated correctly), and "Khoá"/"Mở khoá"
  correctly toggled a real account's status with the table's badge and button label flipping.
* **Not verified**: an actual OTP being received by email and used to complete a reset - needs
  your real Gmail App Password (see backend README's "Still needs your action").

One real bug was caught by running this, not by reading the code:

7. **Editing `tailwind.config.ts` to point color tokens at CSS variables had no visible effect
   until the Next.js dev server was restarted with its `.next` cache cleared** - a plain hot
   reload kept serving Tailwind's previously-compiled literal hex values. Caught by inspecting
   the actual computed `background-color` of a themed button in the dark theme (it stayed the
   light theme's color) rather than assuming the edit took effect because the page "looked
   like" it changed elsewhere (body background did update, since that rule lives directly in
   `globals.css`, not behind a Tailwind utility class).

## Verified - Phase 6 (2026-10-01, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session (logged in as an EMPLOYEE with real task/calendar/note data): header's
  ⭐/☰/🔔/⚙️ cluster all work from `/dashboard` - ⭐ opens the priority panel (now controlled from
  the header, not its own floating button), ☰ swaps the Home page into the task-board view and a
  card correctly expands its priority badge on click, 🔔 shows a live unread-count badge and its
  dropdown lists real notifications, ⚙️ links to Settings; Sidebar no longer has "Cài đặt" but
  does have "Lịch của tôi" and "Note của tôi". `/dashboard/calendar` renders a real month grid
  with two confirmed events on their correct days and a declined one correctly absent from the
  grid (still visible in the full list below); create/edit/delete all round-trip on
  `/dashboard/notes` against the real backend.

## Verified - Phase 7 (2026-10-01, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session (logged in as an EXECUTIVE with real multi-department data): Phòng ban
  renders as tiles with a "+" create tile (EXECUTIVE-only); a tile opens its 1/4-3/4 detail page
  with a real staff list and working "..." popover; clicking that popover's "Nhắn tin riêng"
  navigated straight into a real, pre-selected conversation on `/dashboard/messages`, and sending
  a new message there round-tripped against the real backend end to end. The ☰ board view's new
  "+" opens `CreateOwnTaskForm` and renders correctly. A real note's 📌 toggle made it appear as
  a floating, editable widget on `/dashboard` (a different page than where it was pinned) -
  confirmed both the minimize-to-icon and unpin controls on that floating widget itself work.

## Verified - Phase 9 (2026-10-01, this machine)

* `npx tsc --noEmit` - clean (also how the pre-existing missing-`MESSAGE_RECEIVED` bug above was
  caught, before any manual testing).
* Full two-account browser session against the restarted backend: sent a real message from
  `binmit1` to `binmit2` via `/dashboard/messages`; logged in as `binmit2` and clicked the
  resulting "Tin nhắn mới từ binmit1" notification - it navigated straight to
  `/dashboard/messages?with=1` with the conversation already open, not just to the messages list.
  From the Phòng ban → Truyền thông detail page, clicked "Nhắn tin riêng" on a staff member with
  zero prior messages - the new conversation's header showed their real name, not
  `Người dùng #9`.
* Task board (☰ Home view): with no period filter, "Đã hoàn thành (3)" rendered collapsed, and
  expanding it listed the 3 completed tasks; switching the filter to "Hôm nay" correctly dropped
  the completed count to 0 (all 3 were created on earlier days) while the still-open task
  (created today) remained visible - confirms the filter is reading `createdAt`, not just
  hard-coding "show everything".
* Settings → Giao diện: switched through Sáng/Tối/Xám in the browser. Tối showed the violet
  (`#7C3AED`) primary on the existing navy background; Xám kept its original gray accent
  untouched, confirming the branding was *not* over-applied to themes meant to stay distinct.
* Google Drive page: "Chưa kết nối" badge renders next to the connect button, and the
  register-folder form is replaced by the "connect first" hint - both only reachable in this
  state since real Google OAuth credentials aren't configured yet (still needs your action, see
  backend README).
* Backend-side notification fan-out for `FOLDER_ACCESS_REQUESTED` (which the inline Duyệt/Từ chối
  buttons depend on) was verified via curl against temporary test data - see backend README's
  Phase 9 section for why that approach was necessary and what it found.

## Verified - Phase 10 (2026-10-01, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session, light theme: Sidebar's active "Home" item visibly renders an
  Indigo→Violet gradient (not a flat fill); the page background is a faint indigo tint distinct
  from the still-white KPI/task cards sitting on it. Hovering a Phòng ban tile lifts it with a
  visible indigo-tinted shadow and border - confirmed the effect is hover-only (no lift at rest).
* Same session, dark theme: Sidebar's active item and the "Đăng xuất"/"Nhận" buttons show a
  clearly visible Violet→Indigo gradient against the navy background - a bigger visual jump from
  Phase 9's single flat violet than before.
* Switched to the Xám (gray) theme and confirmed every gradient-bearing element rendered as a
  flat, single-tone slate color with no visible second hue - confirms the degenerate-gradient
  approach (`--color-primary-end` = `--color-primary` on gray/pink) actually holds in the
  browser, not just in the CSS source.
* Not independently tested: `prefers-reduced-motion: reduce` behavior (would need to either
  change the OS-level setting or emulate it via DevTools - out of scope for this pass's time
  budget). The media query itself is standard and straightforward, but flagging this as *assumed
  correct by inspection*, not *verified running*, per this project's "never claim verified
  without actually testing" rule.

## Verified - Phase 11 (2026-10-01, this machine)

* `npx tsc --noEmit` - clean.
* Full two-account browser session against the restarted backend. Logged in as `binmit1`
  (EXECUTIVE) on `/dashboard/tasks`, clicked the ☰ icon: it navigated to `/dashboard` with the
  board view already active (confirmed by the icon's filled/active state and the board rendering
  immediately, not a second click needed). Logged out, logged in as `binmit2` (EMPLOYEE): sidebar
  no longer lists "Nhân sự" at all (confirmed by reading the full nav list, not just eyeballing
  it) - the other items (Phòng ban, Công việc, Tin nhắn, Lịch, Note, Drive) are all still present.
  From Phòng ban → Kỹ thuật, expanded "Nhom Backend" in the team list and saw its real 2 members
  (Truong Nhom 1, Binmit Two) with titles; the "..." popover for a team member showed the same
  info/action layout as a department member's popover ("Nhom Backend · Trưởng nhóm", Nhắn tin
  riêng, Gửi yêu cầu Drive).
* Backend-side rate limiting (`forgot-password`/`reset-password`) verified via curl - see backend
  README's Phase 11 section. Not independently re-tested from the browser's own forgot-password
  form, since the curl test already exercises the exact same endpoint/code path.

## Verified - Phase 12 (2026-10-01, this machine)

* `npx tsc --noEmit` - clean.
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
  click updates the selected button's highlight immediately, with no page reload - this is the
  specific behavior that was broken before the `invalidateQueries` fix (confirmed broken, then
  confirmed fixed, in the same browser tab).
* **A debugging dead end worth recording**: while chasing the presence-status bug, re-testing in
  what turned out to be a *stale* orphaned `next dev` process (TaskStop had killed the wrapper
  shell but not the underlying Node child, which kept the real port listening - a previous restart
  had silently fallen back to port 3001 because 3000 looked "free" from the new process's point of
  view) produced identical-looking failures to the real bug, costing real debugging time before
  `netstat` surfaced the actual orphaned PID. The *actual* fix (`invalidateQueries`) was correct
  the whole time; a closed+reopened browser tab against the confirmed-correct port is what finally
  proved it. Lesson, alongside the stale-JVM one in the backend README: after `TaskStop`, verify
  the port is actually free (`netstat`) before trusting a "started successfully" log line from the
  replacement process - a silent port fallback looks identical to a clean restart in the log.

## Verified - Phase 13 (2026-10-02, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session: the "Khoảng thời gian" `Select` on the ☰ board view now shows a visible
  shadow and a custom caret (no more bare OS arrow). `/dashboard/departments/1` renders both the
  identity panel and "Nhân sự" as distinct white cards with a gradient "K" badge, clearly lifted
  off the page background - a real, visible contrast improvement over the previous flat-text
  version (same before/after comparison done for the department tile grid). `/dashboard/tasks`
  now shows a collapsed "Đã hoàn thành (6)" toggle that expands into its own table, confirmed with
  real seeded data. The exact message that previously overflowed its bubble
  ("Orbit E2E browser test messageOrbit E2E browser test message", one unbroken string) now wraps
  correctly inside its rounded background in `/dashboard/messages`, and the same conversation's
  sidebar preview is now correctly ellipsis-truncated instead of spilling past the sidebar edge.
* Logo centering fix verified precisely, not just by eye: `getBoundingClientRect()` on the
  `/login` wordmark `<img>` gives a visual center of `759.1875px` against a `1518px`-wide viewport
  (center `759px`) - under 1px off.

## Verified - Phase 14 (2026-10-02, this machine)

* `npx tsc --noEmit` - clean.
* Full browser session as `binmit1`: header now shows the Orbit wordmark instead of the company
  name, with no logout button anywhere in it; `/dashboard/settings` shows "Binmit One - CEO" next
  to the avatar with "Đăng xuất" beside it, and clicking it actually logs out and redirects to
  `/login`. Ctrl+K opened the quick search from any page; typing "nhân" filtered the list down to
  exactly "Nhân sự", and pressing Enter navigated there. `/dashboard/tasks`: cancelled a task,
  confirmed it moved into the new "Đã huỷ (N)" section; its "..." menu's "Thêm lại" moved it back
  into the active table with status "Chờ phản hồi" in real time, no reload. `/dashboard/users`:
  the add-staff form is now behind a small "+" next to the "Nhân sự" heading instead of always
  being rendered, and every row's actions (Xem KPI/Chuyển vị trí/Thêm lịch/Khoá/Xoá) collapsed
  into a single "..." menu, confirmed opening correctly per-row. `/dashboard/messages`: both the
  conversation list and the chat panel render as distinct bordered/shadowed cards, the input is a
  pill-shaped composer, and a "Thông báo nội bộ" conversation (the system account) appears with
  the real broadcast message sent during backend verification. The ⭐ priority panel shows each
  tier (Cao/Trung bình/Thấp) on its own tinted red/amber/gray background.
* Not independently re-tested from the browser: the broadcast composer's own confirm-and-send
  flow (the backend endpoint it calls was already verified directly via curl - see backend
  README's Phase 14 section - and `currentUser.systemAccount` gating was confirmed by inspecting
  the login response rather than logging into the browser as the bot account, which wasn't
  necessary to prove the gate works).

## Verified - Phase 15 (2026-10-02, this machine)

* `npx tsc --noEmit` - clean.
* Real browser session (DOM-driven, since the preview pane was hidden): Sidebar "Công việc" turned
  the active tab into Tasks; "+" opened a second Home tab; navigating it to Tin nhắn left tab 1 on
  Công việc; a draft typed into tab 1's form was still there after switching away and back, with
  both tabs mounted (`2` content roots). Reload restored both tabs from `sessionStorage`; ☰ on a
  non-Home tab turned it into a Home tab in board view; the × closed a tab; Ctrl+K → "phòng" →
  Enter opened Phòng ban in the active tab and a department tile opened its detail in that same
  tab.
* **Real bug caught**: the Drive OAuth deep link was silently ignored. `loadInitialTabs()` resets
  the address bar as a side effect, and React StrictMode runs the mount effect twice - the second
  run no longer saw the deep link and overwrote it with the stored session. Fixed with a
  once-only `useRef` guard; re-verified (`/dashboard/drive?drive=connected` now shows the success
  banner and the URL resets to `/dashboard`).
* Not tested: the full OAuth round trip to Google (still needs real credentials - see backend
  README), and many tabs open at once under load (every mounted tab keeps polling).

## Phase 16 - add dialogs, fixed shell, session robustness

* New primitives `components/ui/Modal.tsx` (Esc/overlay close, `role="dialog"`) and `PlusButton.tsx`.
  Lịch, Công việc and Note now have a small gradient "+" next to the heading that opens a dialog
  instead of an inline form; the big "Tạo ghi chú mới" button is gone. `NoteModal` replaces
  `NoteExpandModal` and handles both create and view/edit.
* `dashboard/layout.tsx`: shell is `h-screen overflow-hidden`; only `<main>` scrolls, so header and
  tab bar stay fixed.
* Logout bug: the layout used to redirect to `/login` on ANY `/auth/me` error. It now redirects only
  on a real 401 (`ApiRequestError.status`); other errors show a reload prompt.
* Slowness: `QueryClient` defaults `staleTime` 30s and `refetchOnWindowFocus: false`; `/auth/me`
  `staleTime` 5 min (every mounted tab used to refetch on each mount).
* Sidebar collapse animates width/padding and fades labels (`LABEL_TRANSITION`).
* Forgot password: new wording, "Gửi lại mã" with a 60s countdown; `AuthPageShell` gives login and
  forgot-password the shared Orbit planet background.

## Verified - Phase 16 (2026-10-02, this machine)

`tsc --noEmit` clean. In the browser: header stays at top 0 while `main` scrolls; Lịch/Note dialogs
open and close with Esc; sidebar width animates 64→224; forgot-password shows new text, planets and a
live "Gửi lại mã (59s)" countdown. Not tested: submitting the Công việc dialog as an employee, and the
logout fix against a real transient failure (only reasoned from the code).

## Phase 17 - Home redesign

* Home (non-☰ view) = `KpiSummaryCards` on top (3 stat cards + status stacked bar + new 7-day
  "việc hoàn thành" column chart via `components/ui/ColumnChart.tsx`) and `HomeTaskColumns` below:
  the caller's own tasks in 3 tinted status columns (Cần làm amber, Đang làm indigo, Hoàn thành green,
  latest 8 done), cards show priority badge and due date ("Quá hạn" in red when overdue).
* The 7-day chart uses all of the user's tasks by `completedAt` (not only this month's).
* `globals.css`: translucent dark-theme overrides for `bg-red/amber/indigo/green-50` so tinted zones
  stay readable (this also fixes the priority panel in dark theme).
* No chart library added.

## Verified - Phase 17 (2026-10-02, this machine)

`tsc --noEmit` clean; in the browser as `binmit2`: 3 columns with counts 1/0/3, 7-day chart shows 3 on
the 30/9 bar, screenshot confirms layout. Not checked: dark theme visually, mobile width.

## Phase 18 - chat attachments, avatars, recall, archive

* `MessageComposer`: paperclip, chosen-file chip, optional caption, 5MB client check (server re-validates the real bytes).
* `MessageBubble`: sender avatar on every message, inline image (opens full size in a new tab) or file card (download via
  axios blob - the auth cookie can't ride on a plain link), "Tin nhắn đã thu hồi" placeholder, and a "..." menu with
  "Thu hồi" (confirm dialog) on your own messages.
* `MessengerView`: conversation avatars + presence dot, preview text for recalled/file messages, "Tin nhắn | Lưu trữ" tabs,
  per-conversation "..." menu (Lưu trữ / Bỏ lưu trữ).
* `useAvatarSrc` renamed `lib/hooks/useAuthedBlobUrl` (now used for chat images too).

## Verified - Phase 18 (2026-10-02, this machine)

`tsc --noEmit` clean. In the browser as `binmit3`: sent a PNG with a caption through the real file input (rendered as an
image blob), recalled it (placeholder replaced it, list preview changed), archived and un-archived the conversation, PDF
card and avatars visible in a screenshot. Not tested: other roles' views, dark theme, mobile width, downloading a file via
the card click (only its API was exercised).

## Phase 18 follow-up - mobile, dark theme, logo

* `MessengerView` is single-column below `md`: the conversation list, or (once one is chosen) the thread with a back
  button (`aria-label="Quay lại danh sách hội thoại"`). Before this the "Gửi" button was clipped at phone width.
* `components/brand/OrbitWordmark.tsx` + `public/orbit-wordmark-dark.svg`: the "ORBIT" text was dark navy on the dark
  theme; `globals.css` now shows the light-text variant only when `data-theme="dark"` (header and login).
  (Phase 25 dropped the second file: one inline SVG recolours its text through `.orbit-wordmark-text`.)

## Verified - Phase 18 follow-up (2026-10-02, this machine)

Real browser: clicking a file card downloaded `doc.pdf` with the right contents (blob download captured); at 375x812 no
page (Home, Phòng ban, Nhân sự, Công việc, Tin nhắn, Lịch, Note, Drive) overflows horizontally, chat send button is on
screen and back works; dark theme readable in screenshots (home columns, chat, header) and the wordmark switches variant.
Not tested: gray/pink themes at phone width, real touch input (viewport emulation only).

## Phase 19 - task detail window

* `TaskDetailModal` (small dialog) opens when a task is clicked anywhere: Công việc table rows (active/done/cancelled),
  the ☰ board cards (inline expand removed), Home status columns, and the ⭐ priority panel. It looks the task up by id in
  `useTasksList`, so it is never a stale snapshot. Shows title, status/priority, description, assigner and assignee (with a
  "Nhắn tin" shortcut to the chat tab), due/created/completed dates.
* `components/ui/Table` gained an optional `onRowClick` (focusable rows, Enter/Space, clicks on buttons/links/inputs inside a
  row are ignored so Nhận/Huỷ/... still work).
* NOT included yet: attachments and Drive links - tasks have no such fields in the backend (needs a schema decision, asked
  in chat).

## Verified - Phase 19 (2026-10-02, this machine)

`tsc --noEmit` clean. Browser as `binmit2`: dialog opens from a Home card, a table row (click and Enter), the priority
panel and a board card; "Nhắn tin" appears only for people other than yourself and opens the chat tab. Not tested: clicking
row action buttons to confirm they don't open the dialog (they mutate data - covered only by the `closest()` guard), mobile
width for this dialog.

## Phase 20 - task attachments and Drive link in the detail window

* `TaskDetailModal` now has "Tài liệu đính kèm (n/10)" (image thumbnails, click to download via axios blob, "Thêm tệp", x to remove)
  and "Google Drive" (clickable `noopener noreferrer` link, add/edit/remove). Controls show only when the server says `task.canManage`
  (attachment uploaders can always remove their own file); the server re-checks every request.
* Both create-task forms got an optional "Link Google Drive" field. A link that is not https://drive|docs.google.com is rejected by the
  server (400) and also not rendered as a link client-side.

## Verified - Phase 20 (2026-10-02, this machine)

`tsc --noEmit` clean. Browser as `binmit2` on task "E2E attach task": 9/10 shown; picked a PNG through the real input (10/10, thumbnail,
"Thêm tệp" disabled); clicking a file captured a `spec.pdf` download; removed the PNG (back to 9); a bad Drive link showed the server error
and stayed in edit mode; a valid link rendered as `target=_blank rel=noopener noreferrer`. Not tested: as a non-manager in the UI (covered by
unit tests/curl only), dark theme and phone width for the new sections.

## Phase 21 - registration, invitations, company profile, guided tour

* `/register` (`RegisterWizard`): 4 steps - email, OTP (60 s resend cooldown), company (name, contact email, logo with preview and
  client-side type/size check), administrator account - then straight into the dashboard. The verification token lives only in component
  state. If registration succeeds but the logo upload fails, the account is kept (retry in Cài đặt).
* `/invite/[token]` (`AcceptInvitationForm`): shows who invited you, the company and role, the email read-only; you choose username, name,
  password. Bad/used/expired links show one generic message. Both pages use `AuthPageShell`; `middleware.ts` treats `/register` and `/invite`
  as public (a user who already has a session is redirected to the dashboard - log out first to open someone's invite link).
* Nhân sự: "Mời qua email" (`InviteStaffButton`) opens a dialog with the invite form (levels from the shared `allowedLevelsFor`) and the pending
  list with Gửi lại / Thu hồi. Cài đặt: `CompanyProfileForm` (name, contact email, logo; replaces the old name-only form); header
  `CompanyBadge` shows the company logo + name.
* Guided tour (`OnboardingTour`, `tourSteps`, no library): starts once when `onboardingCompleted` is false, steps depend on role (administrator 9,
  managers 8, employees 8), spotlight on `data-tour` anchors, keyboard (Esc, arrows), falls back to a centered card when the target is hidden;
  finishing or skipping calls `POST /auth/me/onboarding/complete`. Cài đặt > "Xem lại hướng dẫn" replays it without touching the flag.
* `features/onboarding/errors.ts` maps the common backend error codes to Vietnamese.

## Verified - Phase 21 (2026-10-03, this machine)

`tsc --noEmit` and `next lint` clean. Real browser (backend in dev-log mode): registered a company through all four steps (wrong OTP rejected, bad
logo type rejected, mismatched password rejected), landed on the dashboard with the 9-step tour and the company badge, skipped it (flag saved, no
re-start after reload), saw the company form with the uploaded logo, replayed the tour from Cài đặt, invited a staff member from Nhân sự, opened the
invite link in a logged-out session, accepted it (EMPLOYEE in the right department, 8-step tour, completed -> flag saved, no Nhân sự in the menu). At
375 px width: /register fits, and all 8 employee tour steps keep the card on screen with a spotlight. Not tested: real SMTP delivery of the OTP/invite
email, dark/gray/pink themes on the new pages, DEPARTMENT_HEAD / TEAM_LEAD invite dialogs in the browser (their grant rules are covered by
`UserManagementService`/invitation unit tests).

## Phase 22 - delete confirmation, floating menus, draggable note, split screen, per-account session

* **Delete staff** (`DeleteUserDialog`): retype the account's username AND enter your own password; the server verifies the password.
* **`components/ui/ActionMenu`**: "..." menu rendered in a portal with `position: fixed`; opens upward when there is no room below, closes on
  Esc/outside click/scroll/resize, arrow-key navigation. Used by Nhân sự and the cancelled-tasks table (the old absolute menu was clipped by the
  table's scroll container on the last rows).
* **Pinned note** (`PinnedNoteWidget`): drag by the grip (or arrow keys, 16 px), clamped to the viewport, position saved per account.
* **Split screen** (`TabsContext.splitTabId`, `TabBar` "Chia đôi", `TabContentRenderer` panes): two tabs side by side, each pane scrolls
  independently; the pane you click is focused and the sidebar/search/notifications act on it; panes sit in tab order; closing the partner (or the
  focused tab) returns to one pane; hidden below `md` (a phone shows only the focused pane). The panes, not `<main>`, own scrolling and padding now.
* **Per-account session** (`lib/session.ts` `resetClientSession`): login, logout, registration, accepting an invitation and an expired session
  wipe the React Query cache and the open tabs - previously the next account saw the last one's company name and tabs. The theme is stored per
  account (`theme:<userId>`); signed-out screens always use the default. (The old global `theme` key is ignored, so everyone starts from
  the default once.)
* **Invitation link while signed in**: `/invite/...` no longer redirects a signed-in visitor; the page says who is signed in and offers
  "Đăng xuất và tiếp tục" (accepting would otherwise replace that session).

## Verified - Phase 22 (2026-10-03, this machine)

`tsc --noEmit`/`next lint` clean. Real browser: last-row menu at a 480 px-high window opened upward fully inside the viewport; the delete dialog's
button stays disabled for a wrong username or empty password, a wrong password shows the error and keeps the user, the right one deletes (toast + gone
from the table); split screen (Công việc | Lịch) with equal-width panes, click-to-focus, sidebar changing only the focused pane, closing the partner;
single-pane scrolling keeps the header at top 0; the pinned note moved by exactly the dragged distance, stayed inside the screen when dragged far
away, moved 16 px with ArrowRight and kept its position after a reload; dark theme for binmit1 -> logout (default theme, tabs cleared) -> login binmit3
showed "Doanh nghiệp B" immediately with the default theme and no trace of company A; the invite page offered to sign out a signed-in visitor.
Not tested: touch dragging of the note, split screen at tablet width, a real (non-synthetic) mouse drag.

### Phase 22 follow-up - one tab strip per split pane

In split-screen the tab bar splits in two and each half sits exactly above its pane (like editor groups): it lists only the tabs that belong to that half (every tab belongs to exactly one half, see "one half per tab" below; the pane's own tab is highlighted and nothing moves when you pick one) and picking one shows it in THIS pane via `selectTabInPane`, a "+" that opens a new Home tab in that pane (`openNewTabInPane`), and the split
toggle at the far right. Panes keep their side (`activeOnLeft` in `TabsContext`, persisted) instead of following tab order, so replacing a tab no longer makes a
pane jump to the other side. Below `md` only the focused pane and its strip are shown.

Verified in the browser (binmit1): strips 354 px each aligned with the 354 px panes; "+" in the right strip left the left pane untouched; a background tab picked in the left
strip replaced only the left pane; closing the right pane's tab returned to the single bar. `tsc --noEmit` clean.

## Phase 23 - avatar menu and motion

* **`AvatarMenu`** (header): clicking the avatar opens a small menu - Trạng thái (expands in place to Trực tuyến / Hạn chế / Không làm phiền, applied
  immediately), Cài đặt, Đổi ảnh đại diện (PNG/JPEG/WebP ≤ 2MB, checked client-side, server re-validates), Đăng xuất. It replaces both the old "avatar
  opens settings" shortcut and the separate gear icon (they duplicated each other). Esc / outside click close it, arrow keys move between items.
  The tour's "settings" steps now point at the avatar (`data-tour="profile"`); the Settings tab got its own label/icon in `tabMeta` (it used to be labelled "Home").
* **Motion** (tailwind keyframes `pop-in`, `tab-in`): the avatar menu, notification dropdown and search palette pop in from their corner/edge (search also
  gets a dimmed backdrop that fades in); a newly opened tab chip slides in (see Phase 24). `prefers-reduced-motion` still switches animation off globally.

Verified in the browser: gear gone; menu shows 4 items, changing status to Hạn chế and back reached the server (`/auth/me`); "Cài đặt" opened the Settings tab; the
animation classes resolve (`pop-in`, `tab-in`) and opacity was mid-transition 30-40 ms after opening the menu / notifications / search / a new tab. Not tested:
the avatar upload from the menu (same `useUploadAvatar` as Settings), logout from the menu (same `useLogout` as Settings), touch devices.

## Phase 24 - tab slide animations

Opening a tab: the chip grows out of the left edge (width, padding and opacity from 0, 320 ms, ease-in-out). Closing: the same motion backwards (240 ms) and the tab is
removed only when it has finished. `useTabMotion` (TabBar) animates only tabs that appear after the first render, so loading the page or toggling split screen (which
re-mounts the chips) does not replay it; users with `prefers-reduced-motion` get an instant close. Keyframes `tab-slide-in` / `tab-slide-out` in `tailwind.config.ts`
(`tab-in` was removed); the timers in `TabBar.tsx` must match their durations. Tailwind needs a dev-server restart to pick up keyframe changes.

Verified in the browser by sampling every frame: a new chip went 2 px -> 106 px wide with opacity 0 -> 1 while sliding right 16 px, and a closing chip went 106 px -> 2 px
with opacity 1 -> 0 and was gone after the animation. Not tested: closing a tab in split-screen strips, touch devices.

## Phase 25 - floating note windows and the login intro

* **`components/ui/FloatingWindow`** (geometry in `lib/floatingWindow.ts`, pure and unit-tested): a titled window you drag by its title bar and resize from any of its 8 edges/corners
  (a visible grip sits bottom-right). It can never leave the screen: position and size are clamped to the viewport with an 8 px margin, and it is pulled back in when the browser window
  shrinks. Keyboard: with the title bar focused, arrows move it 16 px and Shift+arrows resize it; the "Thu gọn" button folds it to its title bar. Built on pointer events with pointer
  capture and `touch-none` handles.
* **Pinned notes** (`PinnedNoteWidget`) are now these windows instead of one fixed 4-row card: one window per pinned note, the one touched last on top. Each remembers its own size, position and
  collapsed state per account and note (`localStorage` key `pinned-note-window:<userId>:<noteId>`, so re-pinning a note brings its window back as it was; the old
  `pinned-note-position:<userId>` key is no longer read, so a pinned note shows up in the default corner once). The text area fills the window.
  **Auto-grow**: as soon as the text reaches the bottom of the visible area the window grows by exactly the overflow, up to 70 % of the screen height; if growing would push it past the
  bottom edge it moves up instead, so it never spills off the screen; past the cap the text area scrolls. A window you made taller yourself is never shrunk, and a note opened for the first
  time is fitted to its text once. Text autosaves 1.2 s after typing stops and when the text area loses focus (a failed save shows an error toast and is retried on the next change); edits made
  in "Note của tôi" appear in an open window unless you are typing in it. Because a shrinking browser window clamps the window and the clamped size is what gets remembered, a note does not
  grow back by itself when the browser is enlarged again.
* **Login intro** (`LoginIntro`, `OrbitIntroLogo`, `introTimeline.ts`): on a fresh load of `/login` the planet starts in the middle, the letters O-R-B-I-T fade in one by one on a tilted orbit
  (same -18° slant as the logo's ring; the far side is smaller, dimmer and passes behind the planet) and circle it; then they are pushed out one by one - T first, O last - into their places in
  the word while the planet slides left to its place in the logo and the scene eases from a 1.45x zoom to the real logo size (about 3 s). Only then do the heading and the sign-in form rise in
  (`animate-rise-in`) and the username field gets the focus.
  * The motion is one pure function, `frameAt(t, targets)`; `OrbitIntroLogo` applies each frame straight to the SVG attributes in `requestAnimationFrame` (no React re-render per frame).
  * The letters' final positions are measured from a hidden reference `<text>` once the Space Grotesk font has loaded (1.2 s cap), so they land exactly on the glyphs of the static word and the
    hand-over to plain text has no jump, whatever font the browser ended up with.
  * T is released first because releasing O first made letters cross each other on the way (closest pair 0.8 px); a unit test now requires at least 14 px.
  * Plays once per page load (a module variable, not storage): a reload or a new visit plays it, signing out and coming back to the login page without reloading does not. Skipped for
    `prefers-reduced-motion`; any key press or click jumps to the end. Until it ends the heading and form are `invisible` (they keep their space and stay out of the tab order).
* **`OrbitWordmark` is an inline SVG** (`components/brand/OrbitWordmark.tsx`; the drawing constants shared with the intro are in `orbitLogo.tsx`), so the intro and the static logo are literally
  the same drawing. `public/orbit-wordmark.svg` and `public/orbit-wordmark-dark.svg` were deleted (nothing references them); the text colour for the dark theme comes from
  `.orbit-wordmark-text` in `globals.css`.
* **Dark-theme fix**: only `text-gray-900/700/600/500` were remapped in the dark theme, so `text-gray-800` stayed dark-on-dark (it showed up as invisible text in the new note window; the task
  description box and the priority panel had the same latent problem). `globals.css` now remaps `.text-gray-800` as well.
* **Tests** (`jest.config.mjs`, see "Testing" above): 21 for the window geometry (clamp, edge resize with a minimum size, auto-grow cap and shift-up, cascade defaults, stored-data parsing) and 13 for
  the timeline (first and last frame, orbit radius, near/far side, T-first landing order, letters never piling up, monotone zoom and slide, no NaN for any time).
* The Notes page's own editor (`NoteModal`) is unchanged: it is still a centred modal, only the always-on-screen pinned note became a floating window.

## Verified - Phase 25 (2026-10-03, this machine)

`tsc --noEmit`, `jest` (34 tests) and `next build` (all pages generated, `/login` prerendered) clean, `next lint` has no errors (only the existing "unused parameter name" warnings on callback types, two of them now also in `FloatingWindow`);
the Phase 25 files pass `prettier --check` (the rest of the repo does not - 91 of 124 source files predate that check and were left alone). Real browser (binmit1), before the Prettier pass: the intro sampled over time - planet in the middle, letters fading in
on the orbit, circling with the near-side letters larger, released T first, ending on exactly the position of the static word; a key press and a click each skipped to the end; signing out and
returning to `/login` did not replay it, a reload did; the username field had the focus afterwards. Note windows: dragged with a real mouse and stopped at the 8 px screen margin; resized from the
edges and corners; typing near the bottom edge grew the window (190 -> 250 -> 310 -> 470 px, then capped at 489 px = 70 % of the viewport and scrolled) without ever leaving the screen; the text
autosaved to the server and survived a reload; collapse/expand; shrinking the browser window pulled the window back in; two pinned notes stacked with the touched one on top.
After the Prettier pass (formatting only) a smoke run repeated the essentials: the intro frames (planet in the middle, orbit guide, letters circling, word formed, then the form revealed with the username
field focused); a note window in the dark theme with legible text; a real-mouse drag into the corner stopped exactly 8 px from the right and bottom edges; Shift+arrows shrank it to the 140 px minimum and
arrows moved it to the bottom edge; typing ten lines there grew it from 140 to 270 px upwards with the bottom gap still 8 px and no scrollbar in the text area.
Not tested: the `prefers-reduced-motion` path in a real browser, touch dragging on a real device, the gray/pink themes on the new UI (the note window was checked in dark; the login page always uses the
default theme), and a login page opened in a background tab (its clock keeps running while the tab is hidden, so by the code the intro would jump to the finished logo when the tab is shown again).

## Phase 26 - drag tabs to reorder and between split panes

* **Reorder**: press a tab chip and move: it lifts off the bar as a floating chip (solid, tilted, shadowed) that follows the pointer while the other chips slide aside; release to drop it in
  the new slot (it glides home first). `Esc` cancels. A press that moves less than 4 px is still an ordinary click, and the click that ends a drag does not select the chip.
* **Between split halves**: drag a chip onto the other half of the bar (that half gets a ring while it is a valid target). The tab changes half and is shown there. Reordering inside a strip moves any chip of that strip (the tab order is shared by both strips and the single bar).
* Code: `lib/tabDrag.ts` (pure geometry, 11 unit tests), `components/layout/useTabDrag.ts` (pointer handling, floating state), `TabBar.tsx` (chips + `FloatingChip`), and two new `TabsContext`
  actions, `reorderTabs(ids)` (ignored unless it is a permutation of the open tabs) and `moveTabToPane`. The new order is saved with the other tab state in sessionStorage. Pointer events with
  pointer capture, not HTML5 drag and drop, because that gives no control over the floating chip.

Verified in the browser (binmit2, real mouse drags): reorder in a single bar (order saved); in split mode a pane's own tab dragged to the other half swapped the panes; a background tab dragged
to the other half replaced that pane's content and focused it; a held drag showed the solid floating chip, the highlighted target half and the hidden placeholder; `Esc` cancelled with nothing
changed; `tsc`, `jest` (45 tests), `prettier --check` clean, no lint errors. Not tested: touch dragging (chips do not set `touch-action`, so a touch swipe scrolls the bar), reordering with
many tabs while the strip is scrolled, reduced-motion, dark theme.

## Phase 27 - checklist, Pomodoro, department look, staff account actions, split ratio

* **Tab content keeps its state** (`TabContentRenderer`): hidden tabs were wrapped in a `<div>` while visible ones were `<section>`, so React re-mounted a page every time its tab was hidden or shown -
  the half-filled "add staff" form (and scroll position, open menus) was lost when you went to another tab. Both are now the same `<section>` (see `TabPane`); `Modal` ignores Escape while its tab is hidden.
* **Checklist** (`TaskChecklist`, `TaskDraftFields`): add lines when creating or assigning a task, and in the task window add/tick/remove them with a progress bar; cards show "2/5"
  (`ChecklistProgress`). Items are tickable once the task is accepted; ticking the last one completes the task (toast), and the table's "Hoàn thành" button is disabled for tasks with a checklist.
* **Files when assigning**: both creation forms (`CreateTaskForm`, `CreateOwnTaskForm`) have a file picker (<= 10 files, 5MB each); the task is created first, then the files are uploaded one by one
  (`useCreateTask` returns how many failed, shown in the toast; the task is kept).
* **Pomodoro** (`features/timer`): header button with a floating window (Tập trung 25 / Nghỉ ngắn 5 / Nghỉ dài 15, long break after every 4th focus round), start/pause/reset; the clock keeps running
  across tabs, shows in the header while active, is saved per account **as an end time** (survives a reload) and plays a short chime + toast when a phase ends. Pure logic and 12 tests in `pomodoro.ts`.
  Fixed during testing: the first save after a reload overwrote the stored state (the `hydrated` flag in `PomodoroProvider`).
* **Departments** (`departmentAppearance.tsx`): 8 colours x 10 icons plus 9 ready-made presets (Kỹ thuật, Kinh doanh, ... pick one to fill name, colour and icon); tiles and the detail page show them;
  "Chỉnh sửa" (executive or that department's head) edits name, description, colour and icon (`DepartmentEditDialog`). The preset keys must match `DepartmentAppearance.java`.
* **Staff management window** (`StaffSettingsDialog`, replaces the row menu's many entries and the forms that used to open under the table): the row menu is now just "Quản lý" and "Xoá". "Quản lý" opens one window laid out like Settings - sections on the left (tabs on a phone): "Phòng ban & chức vụ" (the old transfer form, so a department can be assigned after the person was created), "KPI", "Lịch" (add an event for them) and "Tài khoản" (lock/unlock, "Gửi email đặt lại mật khẩu" where the staff member sets their own password, "Đổi email" with a code sent to the new address; `StaffAccountPanels`). The table has a "Phòng ban" column ("Chưa có" when none). Deleting stays a separate, confirmed action.
* **KPI tab redesigned** (`UserKpiPanel`, ui-design-and-taste skill): one headline score (large number, "/ 100 điểm", tier badge) over a meter with the 40 and 70 band marks (`role="meter"`, so it is not colour alone), then an open row (no card inside a card) of three numbers - tasks assigned, completed x/y with its rate, on-time rate - each with a thin progress bar. A person with no tasks this month gets an explanation instead of a misleading 0; loading and error states are kept. The tier bands (40/70) match the badge thresholds that were already used.
* **Split screen ratio**: a divider between the panes (drag, Left/Right/Home/End keys, double-click for 50/50); the ratio (25-75%) is saved with the tabs and the tab strips follow it (both read
  `--split-left`). A pane narrower than 600px gets the class `pane-narrow`, and these page-level layouts fall back to one/two columns there: Home columns and KPI cards, department tiles and detail,
  task board, Drive folder form. Forms inside dialogs are unchanged (the dialog has its own width).
* Tests: `npm test` now 57 (the `lib/tabDrag.test.ts` from Phase 26 plus `features/timer/pomodoro.test.ts`).

Verified in the browser (binmit1, real mouse for the divider): the staff-form draft survived switching to another tab and back; a department created from the "Chăm sóc khách hàng" preset showed the violet
tile with the headset icon, was recoloured to rose in the edit dialog and then deleted; a task assigned to binmit2 with 3 checklist lines and an attached file was created in one go, accepted, and ticking
the lines in the task window went 1/3, 2/3, 3/3 -> Hoàn thành with the toast; the row menu showed the new items and both dialogs opened (nothing was sent); the Pomodoro counted down, showed in the header
and kept running after a reload; the divider drag set 35% (saved, strips aligned), double-click restored 50%, and in a 306px pane Home fell back to one column. `tsc`, `next build`, `next lint` (0 errors) clean.
Not tested: touch use of the divider and tabs, the chime (audio), the end of a 25-minute phase in the browser (covered by unit tests), dark theme for the new UI, real delivery of the reset/email-change mails,
narrow-pane layouts of Messages/Calendar/Notes/Settings (not adapted).

### Phase 26 fix - phantom tab drag

Pressing on a tab chip and releasing just outside it never reached the chip's pointer-up, so the drag logic kept the press and the next mouse move (no button held) started a drag: a copy of the chip
followed the pointer, and the next click anywhere "dropped" it - in split mode the tab jumped to the other pane. `useTabDrag` now ignores moves while no button is down (and drops a drag that
lost its button), forgets an unfinished press on any window pointer-up, and cancels when the pointer capture is lost. Reproduced and re-checked with a real mouse; reorder by dragging still works.
Not covered by an automated test (the hook needs real pointer events).

### Running a second dev environment

`run-dev-parallel.ps1` starts dev servers on http://localhost:3001 (frontend) and port 8081 (backend, database `project_dev`, seed users, mail only written to the backend window) next to the public site;
`-Stop` closes them. It works through `SERVER_PORT` / `FRONTEND_PORT` in `run-local.ps1`, `BACKEND_ORIGIN` and `NEXT_DIST_DIR` (the dev server builds into `.next-dev`, so it cannot disturb the
production build in `.next`) in `next.config.mjs`.

### Phase 26 fix - chips keep their place in split mode

In split mode each strip used to put the pane's own tab first, so clicking a chip made it jump to the front and pushed the previous one back. Both strips now list the tabs in the shared tab order
(minus the tab the other pane shows) and a click only moves the highlight. Checked with real clicks: with the order Công việc, Home, Lịch, choosing Công việc and then Home in the left strip left the
strip as "Công việc | Home" both times; the underlying tab order was unchanged.

### Phase 26 fix - one half per tab

The previous fix still listed every tab in both strips (minus the tab shown in the other pane), so tabs appeared in both halves. Now, like editor groups, every `Tab` carries a `side` (`left`/`right`, missing = left)
and each strip lists only its own tabs. Choosing a chip only selects the tab inside its half; `+` opens a new tab in the half whose `+` was clicked; dragging a chip into the other strip moves it (the last tab of
a half cannot leave, so a drag never ends the split by accident); closing the shown tab shows its nearest neighbour in the same half and closing a half's last tab ends the split. Turning split on puts the
chosen partner on the right and every other tab on the left; sessions saved before this change are repaired on load (`normalizeSplit`). Rules are pure functions in `lib/tabSplit.ts` (11 unit tests);
`TabsContext` calls them. Checked in the browser with pointer-event drags: select/`+`/drag/close behaved as described and the stored sides matched the strips.

## Phase 28 (wave 1) - search, calendar, notes, notifications

* **Header**: the Orbit logo is a button that sends the active tab Home. Staff table: clicking a name opens the staff management window (same as the row menu).
* **Quick search (Ctrl+K)**: searches pages *and* the smaller features inside them (`components/layout/featureSearch.ts`, one catalog of sub-features per page). A matching sub-feature is listed under its parent page; typed words are highlighted (`components/ui/Highlight.tsx`). Matching ignores case and accents (`lib/textMatch.ts`). When a page gains a feature, add it to the catalog and to the tour.
* **Messages**: a search box lists colleagues of the user's own department (`ColleagueSearch`) to start a chat; pictures are shown without a bubble and open in a dimmed lightbox (`components/ui/ImageLightbox.tsx`).
* **Calendar**: clicking a day opens that day's events; the list below shows only upcoming events (`features/calendar/eventRange.ts`); a `Công tác` event takes a from/to date range and is drawn on every day it covers. The two add-event forms share `CalendarEventFields`.
* **Notes**: card grid with search, pinned first, delete on hover.
* **Department page**: a + beside "Nhân sự" lists existing employees (searchable) and moves the chosen one into that department (`AddExistingStaffDialog`); when the person is not there yet it links to the Nhân sự page to create them.
* **Forgot password** takes a username or the account's email; **registration** says plainly when an email already belongs to an account.
* **Live data**: the shared QueryClient now polls every 30 s and refetches on window focus, so changes by other people show up without a manual reload.
* **Tour**: steps added for notes, timer, notifications, board view, split screen, departments; search and calendar texts updated.
* **Password fields** have their own always-visible show/hide button (the browser's own icon appeared only on focus).

## Phase 28 (wave 2) - company page

* Clicking the company badge (logo + name) in the header opens the **Công ty** tab (`/dashboard/company`, `CompanyOverview`): banner, logo, introduction, contact email and the department cards (each opens that department). Everyone sees it; an executive also gets quick settings - edit the text (`CompanyEditDialog`), change the logo or the banner (`CompanyImageButton`), jump to department management and Settings.
* Settings > "Thông tin công ty" now reuses the same dialog and image buttons instead of its own form. Quick search and the tour know the new page.

## Phase 28 (wave 3) - projects

* New **Dự án** entry in the sidebar (`/dashboard/projects`, `/dashboard/projects/{id}`; `features/projects`). The list shows the projects you can see, with a badge when an invitation waits for your answer; executives and department heads get a + to create one (owner department, departments to invite, optional note).
* A project page has tabs: **Tổng quan** (departments and how each answered; invite or remove a department), **Thành viên** (grouped by department, message each person, heads add their own people, leave), **Công việc** (the project's tasks; the person a task is for accepts and finishes it in their own Công việc page), **Trao đổi** (one shared chat, refreshes every 8 s), **Tệp Drive** (shared folders picked from the Drive catalog). The three work tabs are disabled for someone who may only answer an invitation.
* Notifications about projects open the project; quick search and the tour know the new page. The buttons shown follow the server's hints (`canManage`, `canWork`, `respondableDepartmentIds`, `memberManageableDepartmentIds`); every action is checked again on the server.

## Phase 29 - GSAP motion

`gsap` and `@gsap/react` were added (approved) and registered once in `lib/motion.ts` (plugins: `useGSAP`, `Flip`). Everything respects reduced motion: mount-only animations run inside `gsap.matchMedia()` with `MOTION_OK`, per-update ones check `prefersReducedMotion()` first, and people who prefer less motion see the finished state at once. The pure numbers (stagger, count-up duration/format) live in `lib/motionMath.ts` (unit-tested), the tour's positioning in `features/onboarding/tourLayout.ts` (unit-tested).

1. **Login intro** (`OrbitIntroLogo`): a GSAP tween is the clock that feeds `frameAt(t)`; the unit-tested timeline maths is unchanged; skip kills the tween.
2. **Tab bar**: when a tab closes, the remaining chips slide into the gap with Flip (drags keep their own gliding in `useTabDrag`).
3. **Tour**: the lit frame and the card glide between steps, the text fades in; measurements are tagged with their step so a render right after a step change never uses the previous box.
4. **KPI numbers and charts**: `CountUp` counts the three summary numbers up; `BarChart` segments grow from the left and `ColumnChart` columns rise from the baseline.
5. **Card lists**: `AnimatedList` staggers the cards in when a list first shows (projects, departments, company page, notes); `useFlipList` makes the notes glide when searching or pinning.
6. **Reduced motion**: see above.

## Phase 30 - UI consistency (from the shadcn skill's rules)

* **Semantic colours.** About 580 raw `text/border/bg-gray-N`, `bg-white` and green/red/yellow/blue classes were replaced by tokens (`text-fg*`, `border-line*`, `bg-surface`, `success/warning/info/danger`). The block of `!important` dark-theme overrides in `globals.css` is gone: each theme (light, dark, gray, pink) now defines the tokens itself. This also fixed the yellow "waiting" boxes, which stayed bright in dark mode. Left as they are on purpose: the department colour palette (`departmentAppearance.tsx`) and the solid green success toast.
* **`Alert`** replaces the callouts that were hand-built in 7 places (forgot password, register, Drive, delete user, calendar, project invitation).
* **`Tabs`** replaces four hand-built tab lists (Messages, staff window, project page, timer) and adds the keyboard behaviour (arrows, Home/End, roving tab stop, `aria-controls`/`aria-labelledby` with the panel); the movement rule is `lib/tabsNav.ts` (unit-tested).
* **`Textarea`** replaces the hand-built text areas of the note form, company form and broadcast composer (the pinned-note widget keeps its own compact one).
* **Chat scrolling** (`lib/hooks/useStickToBottom`, rules in `lib/scrollFollow.ts`, unit-tested): both chats open at the newest line and follow it while you are at the bottom, but no longer pull you down when you scrolled up to read; a "Tin mới" button appears instead. Checked with a real second user: scrolled to the top, a colleague's message arrived, the position stayed and the button showed; clicking it went to the end.

## Phase 31 - motion on the sign-in screens

* **`StepTransition`** wraps the current step of a multi-step form: the new step slides in from the side it belongs to (forward from the right, back from the left), its fields rise one after another, the box eases to the new height and the first field gets the focus. **`StepProgress`** is the shared numbered stepper (the line fills up to the current step, the current circle pops, finished steps become check marks). Both respect reduced motion; the direction/ratio maths is in `lib/motionMath.ts` (unit-tested).
* **Register wizard** uses both (and shows an animated check while the company is being created). **Forgot password** is now three steps (get a code, new password, done): it has the same stepper, a live "Mật khẩu khớp" hint, "Đổi tên đăng nhập" to go back, and a confirmation with `AnimatedCheck` that counts down to the login page ("Đăng nhập ngay" skips the wait).
* **Login**: a wrong password shakes the form once and the message is shown in Vietnamese in an `Alert` (401: wrong name or password, 429: too many attempts).
* Checked end to end on the dev stack, including a real password reset and a registration up to the last step (using a known one-time code written into the dev database).

## Phase 32 - the sign-in frame

* **`AuthCard`** (`components/layout/AuthCard.tsx`) is the one frame for login, register and forgot-password: a raised card with a thin brand stripe, so the form reads as a single block over the backdrop. The logo sits above it and the page headings moved inside.
* **Login**: "Ghi nhớ tên đăng nhập" (only the user NAME is kept in `localStorage`, never the password; blocked storage is tolerated), a Caps Lock warning under the password, "Quên mật khẩu?" on the same row as the checkbox, a full-width primary button, then a divider and a clear secondary "Đăng ký doanh nghiệp" button instead of a loose text link. A wrong password clears the password field and keeps the name.
* The cursor goes to the first empty field once the form shows (the password when the name was remembered), but not on touch screens.
* **`Button`** shows a spinner next to its label while loading (it used to replace the label with "..."), and `buttonClassName()` lets a link look like a button.

## Phase 33 - the landing page with two windows

* `/login` (and `/register`) now render **`AuthLanding`**: the ORBIT intro plays in the middle of the screen (bigger, scale 1.6), then the logo glides up to its place and the page shows just two actions, **"Đăng nhập"** (outlined pill) and **"Bắt đầu"** (gradient pill with a sliding arrow). Each opens its own window over a dimmed, blurred page.
* **`AuthWindow`** (`components/layout/AuthWindow.tsx`): pops in with GSAP; closes with Esc, the X button or a click on the backdrop; Tab stays inside; the page behind does not scroll; the focus returns to the line that opened it. Switching between the two windows (the "Đăng ký doanh nghiệp" button / "Đã có tài khoản? Đăng nhập" link) slides the content with `StepTransition`.
* `/login?open=login` and `/register` skip the intro and open the matching window straight away (used by "back to login" on the forgot-password page and after a password reset). The intro plays once per page load and is skipped under reduced motion.
* The forgot-password page stays a separate page (with the slogan under its logo); the landing shows the slogan too, but only after the logo has settled (Phase 33c). `LoginIntro` was removed; `introTimeline.ts` / `OrbitIntroLogo` are unchanged.
* Pure helpers `parseAuthView` and `centerOffset` are in `features/auth/authView.ts` (unit-tested).

### Phase 33b - landing composition

The first version (logo with two loose text lines) looked sparse, so the landing got a proper hero: a dotted backdrop that fades toward the edges (`DottedBackdrop`), a soft glow, and three tilted rings with a small satellite on each (`OrbitHalo`, same slant as the logo's own ring; GSAP moves the satellites, static under reduced motion). The rings are centred on the logo-and-actions group and scaled from the measured content (`haloScale`, unit-tested together with `ellipsePoint`) so the inner ring encloses both instead of cutting through them, on any screen size. After the intro the logo glides up, the rings fade in, then the two pills rise in turn. Actions sit side by side from 640px up and stack full-width on a phone.

### Phase 33c - landing order, slogan, department logos

* **One timeline, fixed order** (`AuthLanding`): the ORBIT intro finishes → the logo shrinks and glides to its place → the slogan "Everything stays in orbit." appears under it → the rings fade in behind → the department logos pop in one by one → only then the two buttons rise. The buttons used to flash before the logo had shrunk because they became visible when the intro ended, in a React re-render that raced the timeline; they (and the slogan) are now held back by an inline `opacity: 0; visibility: hidden` from the first paint (so they also stay out of the tab order) and revealed by the timeline alone. The timeline animates a wrapper around each button, not the button, so it never fights the button's CSS hover transition.
* **Department logos on the rings**: `OrbitHalo` carries the icons of the sample departments (`DEPARTMENT_PRESETS` / `DEPARTMENT_ICONS`) along the three rings, 2 / 3 / 4 per ring (`HALO_RING_SLOTS`, `satelliteSlots()` in `orbitHalo.ts`, unit-tested). Kept minimal: a plain line icon in the brand text colour inside a small glass disc (`.glass-control`) - no gradient tiles. GSAP moves them (static under reduced motion), they are `aria-hidden` and never take the pointer.
* The rings are scaled from the measured group (logo + slogan + buttons) using layout sizes, so the intro's scaling of the logo does not distort the measurement.

### Phase 33d - the buttons wait for the visitor

After the intro sequence (logo, slogan, rings, department logos) the sign-in landing holds still, and "Đăng nhập" / "Bắt đầu" appear only when the visitor first shows they are there. The timeline in `AuthLanding` now ends with a callback instead of the buttons' reveal; `useRevealOnInput` (listeners only while waiting, gone after the first reveal) then calls `revealActions`, the same rise animation as before.

* **What counts**: the pointer really moving (8 px from where it was first seen: `hasMovedEnough` in `revealOnInput.ts`, unit-tested), or a press, key, scroll or touch. The 8 px matters: browsers fire synthetic mouse-move events when the layout shifts under a resting pointer, and a sensor jitters; neither reveals anything. Movement during the intro does not count; only movement after the sequence has ended.
* **A faint hint** ("Di chuyển chuột để tiếp tục", with a cursor icon) takes the buttons' place, hidden for a moment and then breathing, so a visitor who has stopped moving the mouse knows what to do. It only shows where there is a pointer (`(hover: hover)`).
* **Nobody is stuck**: on a device without hover (a phone) the buttons come 0.7 s after the sequence ends, since there is no pointer to wait for; and for everyone, after 12 s (a screen reader, voice control, a user who does not touch the mouse). With reduced motion, or when the intro is skipped (`/login?open=login`, `/register`, coming back after signing out), the page is shown finished, buttons included, as before.
* **Checked in a real Chromium** (DevTools Protocol, real input events): buttons hidden through the sequence and the wait; three jittering mouse events change nothing; a real movement shows them and removes the hint; a key press does the same; a device told it has no hover gets them 0.7 s after the sequence with no hint; and with no input at all they appear after 12 s. Not verified: a real phone, and screen readers.

## Phase 34 - glass theme

A glass ("kính") look across the app, from tokens, not per-component hacks:

* **Aurora**: a soft gradient of the theme's own colours behind the whole app (`--aurora-alpha` per theme); glass only reads as glass with something colourful behind it. It is the fixed pseudo-element `body::before` (its own compositor layer, see Phase 35), not a body background. Keep wrappers between `<body>` and the glass surfaces free of opaque backgrounds.
* **Tokens** (`app/globals.css`): `--glass-rgb`, `--glass-edge`, `--glass-highlight`, `--glass-shadow`, `--glass-shadow-raised` per theme (light/gray/pink share the light values and take their tint from the brand colour; dark uses slate with a white hairline) and `--glass-alpha-*` shared.
* **Utilities** (final form after Phase 35): `.glass` (dialogs, menus, the sign-in card, the priority drawer, the tour card: strongest fill and the only blur), `.glass-window` (floating windows: the same look, no blur), `.glass-bar` (header, sidebar, tab bar: fill and sheen), `.glass-card` (stat cards, tiles, panels, tables, notes: fill + rim + one soft shadow), `.glass-control` (secondary buttons).
* **The bars have no blur** (first version had it, on a `::before` layer so the search dialog and the dragged tab chip stayed positioned against the viewport): nothing ever scrolls beneath a bar, so the blur showed nothing and cost a GPU pass. With it gone the bars are plain translucent backgrounds again.
* **Why the scrims are siblings**: `Modal` and `AuthWindow` draw the scrim as a separate layer under the dialog (a plain dim since Phase 35; a blurred parent would also hide the page from the dialog's own backdrop-filter). `AuthWindow` now closes on any press outside the card (it used to compare against the overlay element, which the centring wrapper covered).
* **Toasts** stay coloured (white text needs the contrast) but are 90% opaque with a light ring.
* **Accessibility / fallback**: where `backdrop-filter` is missing, the layers that float over content (`.glass`, `.glass-control`) become ~97% opaque. When the system asks for less transparency (`prefers-reduced-transparency`; on Windows that is Settings > Personalization > Colors > Transparency effects being off) they only get a more opaque fill (panel 0.84 -> 0.9, control 0.55 -> 0.72) and **keep the blur** (panels only, after Phase 35): the first version also dropped the blur there, which left nothing but flat white panes on exactly the machines that report this preference.
* Elements using a glass class must not also carry `border-line`, `bg-surface` or `shadow-*` utilities (they would override the glass). The shared primitives (`Modal`, `FloatingWindow`, `Table`, `ActionMenu`, `AuthCard`) were converted; inputs, buttons and other controls stay solid on purpose.

### Phase 34b - glass, contrast and the logo (review of the first version)

* **A richer pane**: besides the translucent fill, a glass pane now has a diagonal sheen (`--glass-sheen`), a bright rim (`--glass-edge` + inset top/left highlight), a thin brand-tinted outline (`--glass-outline`, so a white pane keeps its shape on a pale page) and a two-layer shadow. The aurora is stronger and has four blobs (`--aurora-alpha` 0.3 light, 0.42 dark), because the first one was too faint for anything to refract.
* **Glass buttons**: `Button` secondary is `.glass-control`; the primary and danger buttons, the active sidebar item, the "+" button, the tour's next button and the landing's "Bắt đầu" are `.glass-button` (ring, lit top edge, shaded bottom edge, coloured glow, gloss on the upper half). `.gradient-surface` stays for gradient things that are not buttons (chart columns, banners, avatars), which a gloss would only stripe.
* **Contrast** (WCAG ratios computed against the glass card / tinted page): `--color-fg-muted` gray-500 -> gray-600 (4.2 -> 6.6 on a card), `--color-fg-faint` gray-400 -> gray-500 (2.2 -> 4.2), dark `--color-fg-faint` slate-500 -> a lighter slate (3.0 -> 4.1). New token `primary-text` (`text-primary-text`) for brand-coloured text and icons: indigo-700 / violet-400 (dark) / slate-700 (gray) / pink-700 (pink, where `primary` pink-400 is only 2.3:1 as text); every former `text-primary` now uses it. `Input` got an explicit `bg-surface text-fg` (it fell back to the browser's dark-mode grey in the dark theme).
* **The logo**: its ring was violet-200 (`#E9D5FF`), 1.2:1 against the page, so it vanished on the tinted background (header, landing, favicon). It is now violet-500 (`#8B5CF6`, 2.5:1 on the page, 3+ on a glass bar, 4.2 on dark); the intro's dashed guide orbit and the landing rings are also a little stronger.

### Phase 34c - the logo, redesigned

* **The mark**: a planet with a tilted ring that passes behind it above and in front of it below, and one satellite riding the ring ("everything stays in orbit"). A knock-out gap separates ring, planet and satellite using SVG masks, so no background colour is baked in and the mark works on any surface. **The wordmark** is five custom geometric capitals (O R B I T) drawn with the ring's stroke weight and converted to paths: nothing depends on a font being loaded, so the intro now starts at once (it used to wait up to 1.2 s for Space Grotesk) and the letters can be used in email, print and the favicon unchanged.
* **One source**: `docs/brand/build_logo.py` holds the parameters (planet radius, ring tilt and weight, gap, cap height, spacing, colours) and writes everything that carries the logo: `src/components/brand/orbitLogoGeometry.ts` (what React draws and the intro animates), the master files in `public/brand/` (lockup in full colour, reversed, black and white; the mark; the app icon), the favicon `src/app/icon.svg` (the app icon: the mark in white on the brand gradient, bolder so it holds at 16 px) and the guideline sheet `docs/brand/orbit-logo-guidelines.svg`. `orbitLogo.test.ts` fails if a master file drifts from the geometry the app draws. Rules of use (clear space, minimum sizes, colours, misuse): `docs/brand/README.md`.
* **In the app**: `OrbitWordmark` takes only a width (the height follows from the proportions, so it cannot be stretched); colours are the `--logo-*` variables (the dark theme swaps to the lighter reversed set). The intro's guide orbit and the landing rings follow the ring's tilt (`LOGO.ring.tilt`).

## Phase 35 - performance and size (desktop Chrome/Edge lagged, iOS Safari did not)

**Reported**: after the glass theme and the new login, desktop Chrome and Edge dropped frames everywhere; iPhone Safari was smooth.

**Causes found and fixed** (measured by counting backdrop layers and by build size; the actual GPU time cannot be read from a headless browser, see "Not verified"):

* `background-attachment: fixed` with four large gradients on `<body>`: Chromium cannot cache a fixed body background and repaints it whenever anything changes; iOS Safari ignores fixed backgrounds, which is why only desktop suffered. The aurora is now `body::before` (fixed, `contain: strict`, promoted with `translateZ(0)`), rasterised once.
* `backdrop-filter: blur(18px) saturate(1.6)` on the three full-width bars (header, sidebar, tab bar) and on every secondary button, plus a full-screen blurred scrim behind every dialog. The bars and buttons have nothing behind them to blur. Now only small popovers (`.glass`: menus, the notification list) blur (one at a time, 12 px, no saturate); large surfaces and windows (`.glass-window`: dialogs, the sign-in card, the priority drawer, quick search, floating windows) do not blur at all. On an idle dashboard the number of blurred elements went from 3 bars + every secondary button to 0.
* Two large soft shadows per card (and a shadow that animated on hover): one small shadow per surface, and `.card-interactive` no longer transitions its shadow.
* Landing page: the department logos are promoted to their own layers (`will-change: transform`) and the orbit layer has `contain: layout style`.
* **Opening the sign-in window** (second report: "clicking Đăng nhập is still slightly slow"): traced in Chrome with the DevTools tracing categories. The click cost one 45 ms GPU task (compositing the blurred 450 x 600 card over the landing page) and then about 7 ms of raster on every frame of the 0.45 s opening animation (the card, with its large soft shadow, was repainted each frame). Fixes: the sign-in card, `Modal`, the priority drawer and quick search are `.glass-window` (no blur: they are 84-94% opaque, so the blur showed almost nothing); the window and its dim carry `will-change` so the animation only moves textures. Total GPU time in the 1.8 s after the click went from 166 ms to about 35 ms, the longest GPU task from 48 ms to about 21 ms, raster tasks from 109 to 7. A short-lived experiment paused the orbiting logos while a window was open; with the changes above it made no difference, so it was removed and the orbit keeps moving behind the dim.
* Dev only: `experimental.optimizePackageImports: ["@phosphor-icons/react"]` stops every dev compile from pulling the whole 1,500-icon barrel.
* Rule written into `globals.css` (PERFORMANCE RULES above the glass section): blur only on layers that float over content, never on chrome, cards or buttons.

**Size** (JS a route loads, gzip, from `next build`; before = commit `6825ae5`):

| Route | Before | After the glass/login work | Now |
|---|---|---|---|
| `/login`, `/register` | 132 KB | 191 KB | **133 KB** |
| `/forgot-password` | 130 KB | 168 KB | 160 KB |
| dashboard (layout) | 216 KB | 257 KB | 258 KB |

The growth was GSAP (about 28 KB gzip) plus its Flip plugin (about 12 KB) and the new screens. The landing is back to its old size because the sign-in/registration windows are a separate chunk (`AuthWindows.tsx`, fetched 0.8 s after the page settles or on demand) and Flip is registered in `lib/motionFlip.ts`, imported only by dashboard code. The rest is GSAP itself, which the dashboard and the forgot-password steps use.

**Not verified**: real frame times on a GPU (the headless test browser has none: its frame counter ran at thousands per second whatever the CSS). Please re-test in Chrome and Edge; if anything still drops frames, say which screen and what you were doing (scrolling, a menu open, dragging a window) - the next suspects would be the landing's orbiting logos and persistent floating windows.

## Phase 36 - the marketing page

`/` is now a public marketing page (it used to be a redirect stub); the app's own entrance stays `/login`.

* **What it says** (`features/marketing/copy.vi.ts`, English in `copy.en.ts`): the slogan "Đưa doanh nghiệp của bạn trở về quỹ đạo." (the brand line "Everything stays in orbit." stays under it), a before/after of a company that has drifted off orbit and one that is back on it, nine feature cards, three steps from registration to running, what each of the four authority levels gets, and four security facts. **Every line describes something the product does today; there are no invented figures, customers or quotes**, and the task-board picture is labelled as an illustration with sample data. Google Drive is deliberately not advertised (its OAuth credentials are still pending, see backend/README). When a feature changes, change its line in both dictionaries.
* **The call to action** (`LandingCta`, used in the header, the hero and the closing block): a real link to `/login`, so it works without script and in a new tab. A plain click fades the page out (`.mk-leaving` on `<html>`, 300 ms), arms the logo intro (`replayIntro()` in `features/auth/introState.ts`, which `AuthLanding` now reads instead of its own module variable) and navigates: the sign-in page then plays the same opening as on a fresh visit - the logo circling its planet, gliding up, the slogan, the rings with the department logos, the two buttons. "Đăng nhập" links go to `/login?open=login` and skip it, as before.
* **Light by construction**: a server component with static HTML and CSS; the only script is `LandingCta`. The orbits behind the hero are pure CSS (`OrbitScene.tsx`, `.orbit-*` in `globals.css`): each icon is two nested elements whose transforms cancel the ellipse's squash and tilt, so it travels an ellipse yet stays round and upright, and only `transform` animates (compositor, off the main thread). Scroll reveals are scroll-driven CSS animations (`animation-timeline: view()`, only where supported); below-the-fold sections use `content-visibility: auto`. No GSAP, no blur, no images. `next build`: `/` is prerendered, 96.8 KB first-load JS (the shared React/Next chunks are 87.5 KB of it).
* **Plumbing**: `middleware.ts` lets `/` through for everyone (a signed-in visitor sees the page too; its button leads to `/login`, which forwards them to the dashboard); `<html lang>` is now `vi`; the page has its own title, description and Open Graph text (no image yet).
* **Publishing**: nothing separate - it is the same Next.js app, so `run-public.ps1` (the "Orbit - Public START" script) serves it at the root of https://app.stayorbit.cloud. The tunnel (`%USERPROFILE%\.cloudflared\orbit.yml`) routes only `app.stayorbit.cloud`; to also serve the bare `stayorbit.cloud` or `www`, add an ingress rule for that host plus a DNS record for it in Cloudflare.
* **Checked**: typecheck, lint, unit tests (`marketing.test.ts`: copy not empty, every menu link has its section, headings labelled, intro replay, and the language checks of Phase 36b), a production build served on a private loopback port (`/` 200 with the heading and title, `/dashboard` still redirects without a cookie, `/login` 200), desktop and phone widths in the browser pane (no horizontal overflow, one `h1`, six `h2`), and the call to action end to end (fade, then the logo intro on `/login`).
* **Not verified**: frame times on a real GPU (see Phase 35: the test browser has none), screen readers, and the page in Safari and Firefox (scroll-driven reveals are skipped where unsupported by design).

### Phase 36b - the marketing page in English

* **Two addresses, one component**: `/` is Vietnamese (the product's default language) and `/en` is English; `MarketingPage` takes a `locale`, and every word comes from that language's dictionary (`copy.vi.ts`, `copy.en.ts`, both typed as `MarketingCopy` in `copy.types.ts`, so a line added to one cannot be missing from the other). Icons are not part of the copy: they are matched by position in `icons.tsx`. Both pages are prerendered (96.8 KB first-load JS each, no script added).
* **Language switch**: `VI | EN` in the header (also on phones), plain links, so it works without script, search engines can follow it and a language can be shared by link. The current language is marked `aria-current`; each language is named in itself.
* **SEO**: each page has its own title, description and Open Graph locale, a canonical address, and `hreflang` alternates for both languages plus `x-default` (Vietnamese). They need absolute addresses: `features/marketing/metadata.ts` builds them from `SITE_URL` (default `https://app.stayorbit.cloud`; set the variable at build time to change it). The page's language is marked with `lang` on the page's own wrapper; `<html lang>` stays `vi` for the whole app (a different value per route would need separate root layouts, i.e. moving every route into route groups).
* **Section ids are English in both languages** (`#features`, `#solutions`, `#how-it-works`, `#security`), so `/en#features` reads naturally. The middleware lets every language through (`MARKETING_PATHS` in `locales.ts`, which holds no dictionaries so the middleware stays small).
* **Guards** (`marketing.test.ts`): the two dictionaries have identical shapes and list lengths, no line is empty, **no line is left untranslated** (every path must differ between the languages, except codes, ids and the initials of made-up people), **no Vietnamese letter appears in the English page**, icons match their items, every menu link has its section, and the `hreflang`/canonical metadata is right.
* **Not translated** (at the time; done in Phase 37): the call to action led to the sign-in page and the app, which were in Vietnamese. Both are bilingual now, and the language chosen on this page is remembered (`LocaleRemember`), so the sign-in page opens in it.

## Phase 37 - the whole product in English

Everything a person reads is available in Vietnamese (the default) and English: the marketing page (Phase 36b), the sign-in, registration, forgot-password and invitation pages, the whole dashboard, the guided tour, and - with the backend changes of Phase 37 - the notifications and the emails.

* **The switch**: `LanguageSwitcher` ("VI | EN", each language named in itself) sits in the corner of every pre-login page (`AuthPageShell`), in the dashboard header from the `sm` breakpoint up, and inside the account menu on phones (the header has no room there). The choice is stored in `localStorage` (`orbit-locale`), so it is per browser: the marketing page, the sign-in pages and the app share it, other open tabs follow it (storage event), and `<html lang>` follows it. Without a stored choice the product is Vietnamese.
* **How texts work** (`src/lib/i18n`, no library: it is small and the typing is the point):
  * Every text has a flat key `area.component.slug` in `vi/<area>.ts` and `en/<area>.ts`; components call `t("tasks.taskList.priority")` from `useI18n()` (`{ locale, intlLocale, t, setLocale }`). `t(key, { name })` fills `{name}`; with a numeric `count` it picks the plural form of the language (`key_one` / `key_other`; Vietnamese has one form, so both entries read the same).
  * Keys are checked by the compiler (`TranslationKey`), and the English dictionary is typed `Record<keyof vi, string>`, so a text missing from either language does not compile. Vietnamese is bundled (17 KB gzipped); English is a separate chunk fetched once, the first time it is needed (17 KB gzipped), and the page waits for it so there is no flash of Vietnamese.
  * Module-level tables cannot call `t`, so they hold **keys** (`labelKey`, `TASK_STATUS_KEYS`, `LEVEL_LABEL_KEYS`, `PRESENCE_STATUS_KEYS`...) and the component translates when it draws. A sentence with a bold name or a link is one message with `{placeholders}` rendered through `RichText` (`components/i18n`), so the translator controls the word order. Dates, times and numbers use `intlLocale` (`toLocaleDateString(intlLocale, ...)`), weekday names come from `lib/weekdays.ts`.
  * **To add a text**: add the key to both `vi/<area>.ts` and `en/<area>.ts` (keep the same `{placeholders}`), then use `t`. Do not write a Vietnamese or English sentence in a component.
* **Search (Ctrl+K)** matches the page and feature names in the current language; the hidden unaccented keywords (`cong viec`, `giao viec`...) keep working in both.
* **What the server sends**: `apiClient` adds `Accept-Language` (the product's language, not the operating system's) to every request, which the backend uses for emails and to default the first administrator's job title. Notifications arrive as `type` + `params` and are worded here (`features/notifications/notificationText.ts`); an older notification (no params) or an unknown type shows the Vietnamese text stored with it. Other messages in an API error body are English (as before) and are shown as they are, except the codes the sign-in, registration and delete-user screens translate themselves.
* **Guards** (`i18n.test.ts`, `fieldValidation.test.ts`, `featureSearch.test.ts`, `notificationText.test.ts`): both dictionaries have the same keys and the same placeholders per key, no English text contains a Vietnamese letter or is a copy of its Vietnamese text, every plural has its `other` form, **no message is unused** (a removed screen cannot leave texts behind), the interpolation/plural/fallback rules, the form-validation messages in both languages, and every notification type in both languages.
* **Checked**: typecheck, unit tests (1,063 frontend; backend unit tests below), a production build, and in the browser pane with a real session: the sign-in, forgot-password and invitation pages, every sidebar page, the company page, Settings, Ctrl+K, the account menu, the notification list (a freshly created task notification in English and in Vietnamese), the full 16-step tour, the Pomodoro window, and the switch both ways without reloading; a text scan of each page found Vietnamese only in data people typed (company, department and project names, chat messages) and in the seed data. On a phone-width viewport the language row appears in the account menu.
* **Cost**: the Vietnamese dictionary is now in the main bundle, so the first load of `/login` grew from about 133 KB to 156 KB (the marketing pages are unchanged at 97 KB). Splitting the dictionary by route would bring part of that back; it was left out on purpose to keep one simple mechanism.
* **Not verified**: the English text was written by us and has not been proofread by a native speaker; screen readers; Safari and Firefox; the registration wizard end to end in English (its steps and messages are translated and covered by the dictionary tests, but the e-mail OTP flow was not run); emails actually delivered by SMTP (see backend/README Phase 37).

### Phase 37b - creating a department opens a window

* The "Create a department" tile of the Departments page now opens `DepartmentCreateDialog` (a `Modal`, like the edit window of a department) instead of expanding a form under the tiles. It has the same fields (name, description, colour, icon, ready-made suggestions), focuses the name on opening, closes with a toast when the department is created, and keeps the message in the window when the server refuses. The tile stays in place while the window is open. Still executive-only in the UI and in the backend.
* Checked in the browser as an executive: the window opens with the name focused, creating a department closes it with a toast and adds its tile (the test department was deleted again).

## Phase 38 - terms of service and the CRM screens

### Terms of service (`features/legal`)

* **`TermsGate`**: when the profile says `termsAccepted` is false, the dashboard shows the terms (title, version and date, scrollable text) with "I have read and accept" and "Sign out" instead of the app, so no request that the server would refuse is even started. It cannot be dismissed. Accepting re-reads the profile and the app opens.
* **`TermsAgreement`** (a checkbox with the terms one click away in a window) is on the last step of the registration wizard and on the invitation form; the submit button stays disabled until it is ticked, and the version shown is the version sent (`acceptedTermsVersion`). The terms come from the server in the language of the interface, so there is one text to maintain (`backend/src/main/resources/terms/`).
* `parseTerms` turns the plain text of the terms (`## ` headings, `- ` items, paragraphs) into blocks; no markdown library.

### Customers / CRM (`features/crm`)

* **Sidebar "Customers"** (`/dashboard/crm`) for everyone; the page lists the datasets the person may use as cards (name, source, department, number of customers). Executives and department heads see "Create a dataset", the two template downloads (Excel, Word) and, executives only, the activity log. A dataset opens in its own tab (`/dashboard/crm/<id>`).
* **A dataset is a table**: click a cell to edit it in place (Enter or leaving the cell saves, Escape cancels; the browser's own date picker and the right keyboard for email, phone and numbers), "Add a customer" types a new row at the top, search (accent- and case-insensitive, after a short pause), 50 per page, a trash button on the customers the person may delete. The table scrolls sideways on narrow screens. Managers also get: import, add/rename/delete column (in the column's menu), edit details, delete the dataset (each destructive step asks first and says what will be lost). **Export to Excel is shown to executives only** (the server enforces it).
* **Import window** (`ImportDialog`): choose a file (guide, limits and the two templates are right there) -> the file's tables are read and, if there are several, one is chosen -> each column of the file is matched to a column of the dataset, skipped, or turned into a new column (a first guess from the headers: same name, "name" in any wording, email and phone words; `importMapping.ts`, tested) -> choose what to do with customers already there (skip or update) -> tick the statement that the company is lawfully allowed to process this data -> import -> counts and the first invalid cells by row and column (never their values).
* **Errors** are translated from the server's codes (`crmErrors.ts`); a cell the server refuses is explained in the language of the interface because the server words it (`Accept-Language`).
* **Also wired**: Ctrl+K entries for the CRM, a tour step, `ConfirmDialog` (a new shared primitive in `components/ui`), and the API client now reads the error body of a failed download.
* **Checked**: typecheck, lint, 1,240 unit tests (new: `parseTerms`, `importMapping`, the i18n parity tests with the new `crm` and `legal` dictionaries), and in the browser as an executive: the page, creating a dataset, adding a customer by typing, editing a cell in place, importing a CSV (one created, one duplicate skipped, one invalid email refused and listed), the activity log, and the whole CRM in English without a Vietnamese word left (names of departments aside).
* **Not verified**: the terms checkbox on the registration and invitation forms, as a person would use them (needs the e-mail OTP and an invitation), the import with a real `.xlsx` and `.docx` chosen in the browser's file dialog (the same files were imported through the API), phone-sized layouts of the dataset table, and screen readers.

## Phase 39 - staying signed in (2 hours idle, 7 days at most)

* **No password while the sign-in lasts**: the server keeps the sign-in (backend Phase 39), so `/login` forwards to the dashboard whenever either cookie is present. `middleware.ts` now treats `orbit_session` like `access_token` (the access token lasts 15 minutes, the session cookie up to 7 days; the backend renews the access token silently). Nothing is ever signed in from a username alone: "Remember my username" still only fills in the name for the next password sign-in.
* **Reporting real actions** (`features/auth/sessionActivity.ts`, `hooks/useSessionActivity.ts`, mounted in the dashboard shell): mouse, keyboard, touch and scroll events (passive, capturing listeners) set a flag; the browser calls `POST /auth/session/activity` at most every 5 minutes, either when an action arrives after the interval or at the 30-second check. The tab's own polling does not count, so a forgotten open tab still ends after 2 hours. A refused or failed report is retried at the next check and re-asks for the current user, so a session that has ended sends the person to the sign-in page without waiting for the next poll. The timing rule is a pure function with unit tests.
* **When the sign-in ended while the dashboard was open**: the dashboard layout already redirected on a 401; it now goes to `/login?expired=1` and the sign-in form shows "Your session ended because there was no activity for a long time. Please sign in again." (`auth.loginForm.sessionEnded`, both languages). Choosing **Sign out** does not show it: `useLogout` marks the sign-out as deliberate in `sessionStorage` (`lib/session.ts`), the layout reads and clears that mark, and a successful sign-in clears it too.
* **Honest limit**: because the 15-minute access token is not looked up on every request, an idle-expired session is noticed up to 15 minutes late, when the next access token would have been renewed.
* **Checked**: `tsc`, `eslint --quiet`, 1,246 unit tests (new: `sessionActivity.test.ts`), a production build, and in the browser as `binmit3` on the private dev stack: the session marked idle in the database while the dashboard was open -> once the 15-minute access token ran out the dashboard went to `/login?expired=1` by itself (no redirect loop: the backend cleared the dead session cookie) and the sign-in window showed the note; signing in again through the form; one `POST /auth/session/activity` -> 200 five minutes after the dashboard opened, on mouse movement, and not one per movement; choosing **Sign out** -> `/login` without the note and the session gone on the server (`/auth/me` 401).
* **Not verified**: the middleware forwarding `/login` to the dashboard with only the session cookie present (the access cookie cannot be removed from the in-app browser because it is httpOnly; the backend side of it was tested through the API), phone layouts of the note, and screen readers.

## Phase 41 - chat videos, downloads, forwarding and "delete for me" (1-1 chat)

* **Videos play in the conversation** (`VideoAttachment` in `MessageBubble`): `<video controls preload="metadata" playsInline>` pointed straight at `/api/v1/messages/attachments/{id}` - the API is on this site's own origin, so the session cookie rides along, and the player fetches the file in byte ranges instead of the whole video being loaded into a blob first. If the browser cannot decode it, the bubble shows the download card with "This browser can't play the video". Images now load the same way (`loading="lazy"`), no longer through `useAuthedBlobUrl`.
* **Downloads**: every attachment can be saved - the menu's Download, the file card (a direct `?download=true` link the browser streams to disk instead of a blob in memory) and a download button in the image lightbox (`ImageLightbox` gained optional `downloadHref` / `downloadName`).
* **Message menu** (shared `ActionMenu`, so it is positioned in a portal, keyboard-navigable and never clipped): Copy (text messages; `navigator.clipboard`, with an error toast when the browser refuses), Forward, Download, Delete for me, and Recall on one's own messages. The "..." button is always visible on phones and appears on hover/focus from `md` up.
* **Forward window** (`ForwardDialog`): the message preview, a search, and up to 10 people with checkboxes - the people the user already chats with first, then their colleagues (`useColleagues`, now shared with `ColleagueSearch`); the counter says how many are chosen and when the limit is reached. Copies are labelled "Forwarded".
* **Delete for me** asks first (`ConfirmDialog`), explaining that the other person still sees the message and that recall removes it for both.
* **Composer**: accepts videos (`video/mp4`, `video/quicktime`, `video/webm` and the matching extensions) up to 50 MB, other files up to 5 MB (`maxBytesFor`), and shows "Uploading N%" while a file uploads (axios `onUploadProgress`). `next.config.mjs` raises the `/api` proxy timeout to 120 s so a large upload over a slow line is not cut off at Next's default 30 s.
* **i18n**: new `messages.forwardDialog.*`, `messages.messageBubble.*`, `messages.messageComposer.*`, `messages.messengerView.*` and `ui.imageLightbox.downloadImage` keys in both languages; three keys the new UI no longer uses were removed.
* **Checked**: `tsc`, `eslint --quiet`, 1,266 unit tests, a production build, and in the browser on the private dev stack as `binmit3`: an MP4 (8 s) and a WebM (5 s) play in the thread (`readyState` 4, real dimensions); the image opens in the lightbox and its download link answers as an attachment; the menu offers Copy/Forward/Delete for me on a received message and also Recall on one's own; forwarding to two people from the window -> toast "Forwarded to 2 people", the copy labelled Forwarded, a new conversation listed; delete for me after the confirmation removes the message for this user only; a 20 MB file sent through the composer shows the upload percentage and, being unplayable, the download card with its note; at 375 px wide the menu button is visible and nothing scrolls sideways.
* **Not verified**: Copy succeeding - the in-app browser denies `clipboard-write` (the error toast appeared, as designed); a real phone and Safari; screen readers.

## Phase 42 - second security review: image optimizer off, cookie names, input limits

* **`images: { unoptimized: true }`** (`next.config.mjs`): the app never uses `next/image`, so the optimizer is off - Next 14.2 answers `/_next/image` with 404 before decoding anything. This removes the reachable surface of the AVIF RCE in Next.js < 15.5.24 (GHSA-2xp9-vwfh-vxw4, through sharp/libheif; this project has no sharp either). The Next.js upgrade itself is planned separately; until then do not add `sharp` or `remotePatterns`.
* **Cookie names**: the middleware now looks for `__Host-access_token` / `__Host-orbit_session`, the names the backend sets since this phase (a sibling subdomain cannot set `__Host-` cookies). Deploying signs everyone out once.
* **Length limits** match the server: username `maxLength={100}` and password `maxLength={128}` on the sign-in form, `maxLength={200}` for "username or email" on forgot-password.
* **Checked**: `tsc`, `eslint --quiet`, 1,266 unit tests, a production build; in the browser on the dev stack: signing in sets cookies JavaScript cannot read, `/auth/me` answers with them, `/login` then forwards to the dashboard, and `/_next/image` is 404.

## Phase 43 - whiteboards and Smart select (Alt+S)

### Whiteboards (`features/whiteboards`)

* **Excalidraw 0.18.1** (MIT; `@excalidraw/excalidraw`, exact version) is loaded only when a board is opened (`next/dynamic`, `ssr: false`); the dashboard's own bundle has none of it (checked in the production build). Its fonts are served from this app: `scripts/copy-excalidraw-assets.mjs` copies them to `public/excalidraw-assets/` before `next dev` and `next build` (`predev`/`prebuild`, not committed) and `window.EXCALIDRAW_ASSET_PATH` points there, so a board never contacts Excalidraw's CDN. The package adds about 230 dependencies; `npm audit --omit=dev` lists advisories in some of them (`nanoid` predictability with non-integer sizes, `lodash-es`/`katex` inside the optional Mermaid "text to diagram" code, `sass`/`chokidar`/`braces` that only run at build time) - none is reachable through how this app uses the editor, but they should be rechecked when Excalidraw updates.
* **Screens**: "Whiteboards" in the sidebar (`WhiteboardsPanel`: cards with the user's access and the last change, create), a board (`WhiteboardView` at `/dashboard/whiteboards/{id}`: title, save status and who edited last, share / people, rename and delete for the owner, leave for members) and `ShareWhiteboardDialog` (the owner picks colleagues from the same list chat uses, EDITOR or VIEWER, changes or removes them; others see the list). Viewers get Excalidraw's view mode.
* **Switched off** in the editor: the image tool, pasted or dropped images (refused with a toast, and removed if one slips in), web embeds, opening files from disk, the AI features, Excalidraw's own theme toggle (it follows the app's dark theme) and its social links. Excalidraw's own toolbar stays in **English**: its Vietnamese translation is 49% complete and it drops languages under 85%.
* **Keeping several people in step** (`hooks/useWhiteboardSync.ts`): a change is saved about a second later with the version it started from; while the board is on screen its version is polled every 3 s (`useWhiteboardVersion`, paused in a hidden tab); a newer version is fetched and merged with Excalidraw's `reconcileElements` (newer element version wins, what the user is drawing is kept) into the canvas without entering their undo history; a 409 on save runs the same merge and saves again. Deleted elements are sent for 24 h so the deletion reaches everyone, then dropped (`sceneSync.ts`, pure, with tests). A board that was deleted or no longer shared stops saving and polling and says so. The board query is excluded from the app-wide 30-second refetch, which would otherwise download the whole drawing again (found while testing).
* **Text from Smart select**: dropped onto a board, it lands where it was dropped; sent with "Send to a board", the board opens in a new tab and the text appears in the middle. It is wrapped at about 60 characters, cut at 4,000, and set in Nunito (the hand-drawn default font lacks Vietnamese letters).
* **Notifications**: `WHITEBOARD_SHARED` is worded in both languages (editor or view-only) and opens the board.

### Smart select (`features/smartSelect`)

* **Alt+S** anywhere in the dashboard (captured before any focused widget, so it also works while the whiteboard has the keyboard) or the new header button: the screen dims and the user drags a rectangle over the text they want, like the Windows snipping tool; Esc leaves. Text the user already highlighted is used straight away (the keyboard way in).
* **Capture** (`textCapture.ts`): every word whose middle lies in the rectangle and is actually on top there (`elementFromPoint`, so text under a dialog or scrolled away is skipped), in document order with line breaks where the text goes down, plus the values of text fields; never password or hidden fields, screen-reader-only text, or Smart select's own windows (`data-smart-select-ignore`); at most 10,000 characters. Drawings on a canvas have no text to read.
* **The panel** opens beside the selection (under it on narrow screens, a bottom sheet on phones), with the text editable and three actions (also keys 1/2/3): **1 copy**, **2 analyse**, **3 put on a whiteboard** - drag the handle onto a board open beside (split screen; the panel fades and lets the drop through while dragging) or pick one of the boards the user can edit.
* **Analysis** (`analyzeText.ts`, on the device, nothing sent): dates (`20/10/2026`, ISO, "ngày 3 tháng 12", today/tomorrow, without a year), times (`14:30`, `9h30`, "3 giờ chiều", AM/PM), emails, Vietnamese and international phone numbers, links, money (`1.500.000đ`, `500k`, "1,5 triệu", "2 tỷ đồng", `$1,200`, `30 EUR`), percentages and other numbers, plus character/word/line counts; each finding copies itself when clicked (links open in a new tab, http(s) only). **Create a task** opens the usual own-task form and **Add an event** the usual event form (`CreateOwnEventDialog`, now shared with the calendar), pre-filled with the first line, the text and the first date and time found.
* **Onboarding**: both features are steps of the tour for every role, and searchable from the Whiteboards page.

### Checked

* `tsc`, `eslint` (no errors; only the project's usual false "unused" warnings on parameter names in function types), **1,397 unit tests** (new: `sceneSync.test.ts`, `analyzeText.test.ts`, `textCapture.test.ts`, the tour and dictionary checks), a production build.
* In the browser on the private dev stack as `binmit3`: create a board, draw a rectangle -> saved (`PUT /scene` 200); share with a colleague from the dialog -> toast and the row with its role; a second person's save (through the API as `binmit4`) appears on the open board within 4 s without a reload, twice; Alt+S over the board title captures "Kế hoạch quý 4 / Đã lưu · …" with its line break; analysing a sample finds the date, time, email, phone, link and amount, and "Add an event" opens with 20/10/2026 09:30; in split screen, text captured on the Home page and dragged onto the board lands where it was dropped and is saved; "Send to a board" opens the board in a new tab with the text in the middle; Alt+S also works while the canvas has focus (after a fix); on a 375 px screen the panel is a bottom sheet.
* **Fixed while testing**: Excalidraw kept Alt+S to itself while focused (now captured first); screen-reader-only numbers were captured twice ("11" for a card showing "1"); the panel could cover the selection (now beside, under or above it); the board was re-downloaded every 30 s.
* **Not verified**: a real second browser drawing at the same moment (the second person was simulated through the API), Safari and real phones (touch drag of the selection and of the handle), screen readers, the dark theme on the board, and boards near the 2 MB limit.


## Phase 44 - clear finished tasks, whiteboard text out, file viewer, open-source licences, product specification

### "Clear all" for finished tasks (`features/tasks`)

* A small **Clear all** button in the header of the Completed and Cancelled sections - on the Tasks page (`TaskList`) and on the Home board (`TaskBoardView`) - hides the tasks that section shows from the user's own lists (backend Phase 44). A notice says how many left the list and offers **Undo** for 15 seconds (`useClearFinishedTasks`, `ClearFinishedControls`); the tooltip explains that the assigner still sees them and KPI is unchanged.
* `Task.hidden` filters the Completed/Cancelled lists and Home's done column; the statistics on Home keep counting every task. Lists over 500 tasks are sent in batches.

### Text out of a whiteboard (`features/smartSelect`, `features/whiteboards`)

* **Alt+S reads a whiteboard**: the board registers itself as a text source (`smartSelect/textSources.ts`); when the selection crosses it, Smart select asks it for the text elements whose middle is inside the rectangle (`whiteboards/boardText.ts`, pure, with tests - what the person typed, not Excalidraw's wrapped copy, in reading order), converting between screen and board coordinates. Text covered by something else is skipped as for the rest of the page.
* **4 - Save as a note**: the panel's fourth action creates a private note titled with the first line (200 characters at most) holding the whole text. Dragging the text handle onto any text box (a note being edited, for instance) drops it there too - the browser does that natively.

### File viewer (`features/fileViewer`)

* Chat file cards and the files of a task window get **Open in a tab** (the eye; the card itself in chat, a menu entry too). The attachment opens read-only in a new tab (`/dashboard/files/chat/{id}` or `/dashboard/files/task/{taskId}/{id}`, `FileViewerView`):
  * **PDF** - the browser's own viewer on a blob address;
  * **Word .docx** - `docx-preview` 0.4.1 (Apache-2.0), loaded only then, drawn inside an `<iframe sandbox="allow-same-origin">`: the app draws into it, but nothing inside can run script, open windows or navigate the app (alt chunks, comments and tracked changes are not rendered);
  * **Excel .xlsx** - `read-excel-file` 9.3.10 (MIT, `/universal` build), loaded only then; one table per sheet with sheet tabs, column letters and row numbers, at most 1,000 rows x 50 columns with a note;
  * **CSV / TXT** - decoded as UTF-8, or Windows-1252 when the bytes are not UTF-8 (`textDecoding.ts`, with its own CSV reader: quotes, comma/semicolon/tab);
  * anything else (legacy .doc/.xls/.ppt, .pptx, .zip) or a file that fails to open: a download button.
* The bytes come from the attachment's usual endpoint, so the server's permission check applies; the kind is taken from the content type the server decided, then the name. The file query is excluded from the app-wide 30-second refresh.
* Both libraries were approved for this phase; `npm audit --omit=dev` lists no advisory for them or their dependencies (`jszip`, `fflate`, `saxen`, `unzipper-esm`, `worker-f`).

### Open-source licences (`features/legal`)

* **Settings > Open-source licences** and a small muted line under the whiteboard list ("Whiteboards are built on Excalidraw, open source under the MIT licence. Licences") open `/dashboard/licenses` (`OpenSourceLicenses`): the main components with what they are used for and their licence (Excalidraw with its copyright line), the whiteboard fonts (OFL-1.1; Comic Shanns MIT), and a link to the full texts.
* `scripts/generate-licenses.mjs` writes `public/third-party-licenses.txt` before `next dev` / `next build` (not committed): every production dependency at every level, deduplicated, with version, licence, source and licence text (the standard MIT terms when a package declares MIT without shipping the text; Excalidraw's text, missing from its npm package, taken from its repository) - 311 packages today.

### Specification

* [docs/SPECIFICATION.md](../docs/SPECIFICATION.md) now describes the whole product (roles, rules, limits, data, API) and is updated with every behaviour change (rule added to `.claude/CLAUDE.md`).

### Checked

* `tsc`, `eslint` (no errors; only the project's usual false "unused" warnings on parameter names in function types), **1,452 unit tests** in 29 suites (new: `boardText.test.ts`, `fileViewer.test.ts`; dictionaries keep the same keys in both languages and no unused key).
* In the browser on the private dev stack as `binmit3`, with synthetic files only (the CRM Excel/Word templates, a hand-written PDF and CSV): from the chat, the Word file opened in a new "File" tab with its table, the Excel file with its two sheets, the CSV with its semicolons and quotes, the PDF in the browser viewer; the Word frame is sandboxed (`allow-same-origin` only) and an inline handler injected into it did not run; from a task window the eye opened the task's Word file; on the Tasks page "Clear all" under Completed showed "5 tasks cleared from your list - Undo", the section disappeared and Undo brought it back; the same on the Home board; on a whiteboard Alt+S captured the two text cards ("Tỷ lệ hoàn thành / 100% / Khối lượng công việc (Tháng 10/2026) / 1"), and Save as a note created the note (checked through the API); the credit line and the licences page rendered and `/third-party-licenses.txt` was served (200, 311 packages).
* **Not verified**: real Office files from people (only synthetic ones), large workbooks near the limits, Safari and phones for the viewer, screen readers.


## Phase 44b - sheet columns, Word in a narrow pane, windows that stay in their pane

* **Sheets could not show long values** (cells were cut with "…" at a fixed width). `SheetPreview` now starts each column at the width of its content (`autoFitWidth`, measured on a canvas, at most 480 px) and lets the reader change it: drag the edge of a column header (pointer capture), arrow keys on that edge (16 px steps), double-click to fit again, **Fit columns** to reset all; **Wrap text** breaks long values so rows grow; clicking a cell shows its full value and address in a bar above the grid (the "formula bar"). The grid uses a fixed table layout with a `<colgroup>`, so widths are exact. Pure helpers in `fileViewer/sheetLayout.ts` with tests.
* **Word broke in split screen.** A Word page has a fixed width; in a narrow pane docx-preview's centred column pushed its left side out of reach (negative overflow cannot be scrolled to). Two causes fixed: the frame's own CSS was silently removed because docx-preview empties the style container it is given, so the override is now added after rendering (`align-items: safe center`, our padding); and the document is **scaled to fit the frame width** by default (CSS `zoom` on the wrapper, recomputed by a ResizeObserver when the divider moves), with zoom out/in (50-200%) and **Fit width**. Clicks and keys inside the sandboxed frame did not reach the app, so clicking the document did not focus its pane and Alt+S/Ctrl+K/Esc stopped working while reading; the frame now passes `pointerdown` and `keydown` on to its element.
* **Windows stay in their pane** (`components/layout/PaneContext.tsx`): each tab pane provides its element, whether the screen is split, whether it is focused and whether its tab is visible. `PaneOverlay` renders a window's dimmed layer in a portal at the end of the document - over the opening pane's rectangle (tracked with a ResizeObserver) in split screen, over the whole window otherwise - so a task opened in the left half dims only the left half and the right half stays usable. `Modal` (and so every dialog built on it, including `ConfirmDialog`) and `ImageLightbox` use it; Escape closes only the focused pane's window (`useOwnsKeyboard`); a window left open in a background tab is hidden with its tab and comes back unchanged. App-wide windows (Smart select, the header's panels) are unchanged.
* **Checked**: `tsc`, `eslint` (no errors), **1,468 unit tests** in 30 suites (new `sheetLayout.test.ts`), a production build. In the browser on the private dev stack (1100x700, split screen): the Word file at 25% width was cut on the left before and now fits (44% zoom, no horizontal overflow), follows the divider back to 50%, and at 200% its left edge stays visible; clicking the Word document focused its pane; a task opened in the left half put its window and dim over that half only (438 px wide = the pane) while the right half stayed as it was; switching the left half to another tab hid the window and switching back showed it again; without split screen the window still covers the whole screen; in the Excel file the columns fitted their content, dragging a column edge widened it (116 to 212 px), arrow keys and double-click worked, Wrap text wrapped and the cell bar showed "A1" with its value.
* **Not verified**: touch dragging of column edges, Safari's support for `zoom` and `align-items: safe center` (both supported in current Safari, not tested here), and PDF in a narrow pane (the browser's own viewer handles its zoom; clicks inside it still do not focus the pane, because the PDF viewer is not part of the page).

## Phase 45 - whiteboard: Vietnamese options, one toolbar row, hiding options, right-button pan, expanding

* **Excalidraw's labels in Vietnamese.** Excalidraw 0.18 ships a `vi-VN` translation but leaves every language under 85% translated out of its `languages` list, and a `langCode` that is not in the list falls back to English. Vietnamese is about half translated, yet it covers the whole options panel (Nét, Nền, Độ dày nét, Kiểu nét, Độ trong suốt, Lớp...) and the context menu. `WhiteboardCanvas` adds `vi-VN` to that list once and passes `langCode` from the interface language; the labels it lacks ("Find on canvas", "Reset canvas", "Help") stay in English.
* **One toolbar row.** The board's own header row (back, name, status, share, rename, delete) took a row of its own above Excalidraw's toolbar, and that row is where the drawing area was lost. It is gone: `WhiteboardView` hands `WhiteboardCanvas` a `renderToolbarEnd` for Excalidraw's `renderTopRightUI` slot (name, saving status, expand, share, styled with Excalidraw's own CSS variables so they match "Library") and a list of `menuActions` that become `MainMenu.Item`s at the top of the board's menu (≡): all whiteboards, share, expand, rename and delete, or leave. The view still never imports Excalidraw (the canvas stays in its lazily loaded chunk); the actions are plain data. What fits depends on the board's width (`ToolbarFit`, measured with a ResizeObserver): from 880 px the name too, from 770 px the buttons, below that only the saving status. In Excalidraw's phone layout (under 730 px) only the status icon is added; everything stays reachable from the menu. The saving status is an icon of fixed width, so the row does not shift on every save; its words are in the tooltip and a live region, and shown on an error.
* **No shape library.** Excalidraw's library was half there: this app never stored it (no `onLibraryChange`/`libraryItems`), so shapes put in it were gone on the next visit, and "Browse libraries" leads to Excalidraw's own site. 0.18 has no option to switch it off, so `NO_LIBRARY_CLASSES` hides its ways in with Tailwind arbitrary variants on stable markup: the "Library" trigger (`label:has(>.default-sidebar-trigger)`, the whole label so its hidden checkbox is not a tab stop either; the same tunnel feeds the phone layout), the library tab of the default side panel that "Find on canvas" opens (Radix trigger id ending in `-trigger-library`; search keeps working), and "Add to library" in the context menu (`li[data-testid=addToLibrary]`) with the separator after it, since it sits alone between two. The command palette, which also lists the library, is not mounted by this app. Without the 90 px button the name and the buttons fit at narrower widths.
* **Clicking the selected tool again hides its options.** A capture-phase click handler on the canvas wrapper looks at Excalidraw's tool radio inputs (`data-testid="toolbar-<tool>"`): if the clicked tool is already the active one (read before Excalidraw switches tools) and an options panel is on screen, the panel is hidden or shown again. Picking another tool shows its options again (`onChange` sees `activeTool` change). The panel is Excalidraw's `.selected-shape-actions` section, hidden with a Tailwind arbitrary variant; that class has no underscore on purpose, because Tailwind reads `_` in an arbitrary variant as a space (`.App-menu__left` silently became `.App-menu  left`). The header brush button of the first version is removed.
* **Right button + drag moves the page.** Capture-phase pointer handlers on the canvas wrapper: a right press on the canvas starts a pan, moves past 4 px scroll the scene (`updateScene` with `scrollX/scrollY`, `CaptureUpdateAction.NEVER`, so nothing is saved or put in undo history) and are kept from Excalidraw; press and release still reach Excalidraw, which tracks every pointer (stopping them would leave a stale pointer and break pinch detection). After a pan the `contextmenu` that Windows fires on release is cancelled; a right click without moving still opens Excalidraw's menu. On macOS and Linux the menu opens on press, so there the middle button or Space + drag (Excalidraw's own) are the way to pan.
* **Expand, not browser full screen.** The first version used the Fullscreen API; the user wanted the board laid over the app with the rest dimmed instead. Expanded, the board's section becomes `fixed inset-2 sm:inset-6 z-30` and a dimming button (`bg-black/45`, as `Modal`) sits before it on the same layer; windows (`z-40`) and toasts (`z-50`) stay above, so no portal had to move (the `useFloatingHost` hook and the portal changes to toasts and Smart select that the Fullscreen API needed were taken out again). The board stays mounted in place, so nothing is lost; Excalidraw re-reads its offsets on the resize (checked: its `offsetLeft/Top` follow the board both ways). Inside, the pane context is given `split: false`, so a window opened from an expanded board in split screen dims the whole app like the board. Esc does not collapse it: Excalidraw uses Esc constantly (deselect, cancel a drawing).
* **Windows take the focus** (`components/ui/Modal.tsx`): the dialog panel is focused when it opens unless a field in it already took the focus (autoFocus), and the focus goes back to what had it when the dialog closes. Found because a dialog opened from a button inside Excalidraw left the focus in Excalidraw, which stops every Escape pressed inside it, so Esc did not close the dialog; it is also what a modal dialog should do anyway.
* **Checked**: `tsc`, `eslint` (no errors), **1,470 unit tests** in 30 suites (6 removed strings of the first version, 2 added). In the browser on the local stack, with the browser pane shown (hidden, it runs no animation frames, so no ResizeObserver either): the end of the row at board widths 1,022 / 882 / 873 / 773 / 762 / 733 px showed name + buttons, name + buttons, buttons, buttons, status only, status only, always 16 px inside the board's edge and at least 32 px from the tools; 510-710 px used Excalidraw's phone layout with the status icon. With the library hidden: no "Library" button, "Find on canvas" opened the side panel with only its search tab, and the context menu of a selected rectangle went from "Paste styles" straight to "Send backward" with one separator. Real clicks: the pencil selected showed its options, the pencil again hid them, again showed them; the rectangle afterwards showed its options; the hand had none to toggle. Expand put the board at 24 px from every edge over the dimmed app (the top-left corner of the app hit the board), Share opened above it and Esc closed it with the focus back on Share; Rename from the menu kept the focus in its field; a click on the dimmed margin brought the board back. In split screen the expanded board covered both halves and its Share window dimmed the whole window (0, 0, 1312 x 760). The board stayed "Saved" throughout.
* **Not verified**: a real right-button drag with a mouse (the test dispatched pointer events), macOS/Linux right-button behaviour, touch, keyboard-only use of the expanded board (the dimmed margin is a button; Tab can still reach the app behind it), no production build (the dev server was using `.next`).
