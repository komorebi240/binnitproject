# UI primitives

Design-system components used across every feature (CLAUDE.md section 26). Add a component
here — not inline in a page — the first time a second screen needs the same visual pattern.

**Implemented:** `Button`, `EmptyState`, `Input`, `Select`, `Table`, `Badge`, `Toast`
(`ToastProvider`/`useToast`, wired into `app/providers.tsx`), `Skeleton` (loading placeholder,
used instead of a bare "Đang tải..." string wherever a `Table` is loading).

**Motion**: purposeful only, per CLAUDE.md section 25 — no bounce/parallax/decorative
animation. Defined in `tailwind.config.ts` (`fade-in`, `toast-in`, `toast-out`) and used for:
`Toast` slide/fade in-out, `Table`/`EmptyState` fade-in on first render, page content fade-in on
navigation (`app/dashboard/layout.tsx`, keyed by pathname), `Button` press feedback
(`active:scale-95`), and `Skeleton`'s pulse. Add new motion here, not ad hoc per component.

**Not yet implemented** (add when a real feature first needs it, following the same pattern —
Tailwind classes driven by `tailwind.config.ts` tokens, `forwardRef` where a ref is meaningful,
explicit loading/error/disabled states): `Modal`, `Dropdown`, `Card`, `Alert`, `Pagination`.
