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
