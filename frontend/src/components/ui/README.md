# UI primitives

Design-system components used across every feature (CLAUDE.md section 26). Add a component
here - not inline in a page - the first time a second screen needs the same visual pattern.

**Implemented:** `Button`, `EmptyState`, `Input`, `Select`, `Table`, `Badge`, `Toast`
(`ToastProvider`/`useToast`, wired into `app/providers.tsx`), `Skeleton` (loading placeholder,
used instead of a bare "Đang tải..." string wherever a `Table` is loading).

**Motion**: purposeful only, per CLAUDE.md section 25 - no bounce/parallax/decorative
animation. Defined in `tailwind.config.ts` (`fade-in`, `toast-in`, `toast-out`) and used for:
`Toast` slide/fade in-out, `Table`/`EmptyState` fade-in on first render, page content fade-in on
navigation (`app/dashboard/layout.tsx`, keyed by pathname), `Button` press feedback
(`active:scale-95`), and `Skeleton`'s pulse. Add new motion here, not ad hoc per component.

**Glass**: raised and floating layers use the shared glass utilities from `app/globals.css`, never their own
`bg-surface`/`border-line`/`shadow-*` combination - `.glass` for panels that float over content (`Modal`,
`FloatingWindow`, `ActionMenu`, popovers), `.glass-card` for in-page surfaces (`Table`, stat cards, tiles),
`.glass-bar` for app chrome, `.glass-control` for secondary buttons and `.glass-button` for gradient (primary/danger) buttons. Inputs stay solid. Details in the frontend README, Phase 34.

**Not yet implemented** (add when a real feature first needs it, following the same pattern -
Tailwind classes driven by `tailwind.config.ts` tokens, `forwardRef` where a ref is meaningful,
explicit loading/error/disabled states): `Modal`, `Dropdown`, `Card`, `Alert`, `Pagination`.

**Icons**: `@phosphor-icons/react` - never emoji. Added during a UI/UX review pass (referencing
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)'s
icon and accessibility guidance) that found two recurring gaps across the app's icon-only
buttons: emoji characters used as icons (render inconsistently across OS/browser, don't read as
a real icon in a professional UI), and missing visible focus rings on custom icon-only buttons
(flagged Critical/High severity for keyboard accessibility). Every new icon-only button should:
use a Phosphor icon (`size={16-20}`, `aria-hidden` when paired with visible text, otherwise
`aria-label` on the button itself), keep an explicit `h-8 w-8`/`h-9 w-9` hit area (≥24 CSS px per
WCAG 2.2 AA), and include
`focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary` - the same pattern
already on `Button`/`Input`.

**Added in Phase 30:** `Alert` (info/success/warning/danger callout), `Tabs` (+ `useTabsIds`; arrow-key navigation, 4 variants),
`Textarea` (multi-line `Input`, with counter), `AnimatedList`, `CountUp`, `JumpToLatest`, `ImageLightbox`, `Highlight`.
Colours are tokens, not raw Tailwind palette: text `text-fg` / `fg-soft` / `fg-muted` / `fg-faint`, borders `border-line` /
`line-strong`, status `success` / `warning` / `info` / `danger` (use `bg-success/10 text-success-text` for a tint). Every theme
defines them in `app/globals.css`, so a component using them needs no per-theme override.
