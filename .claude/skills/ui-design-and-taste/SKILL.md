# UI Design & Visual Quality Skill

## Purpose

Create interfaces that are visually coherent, professional, modern, accessible, and production-ready.

The goal is not merely to make the UI "beautiful". The goal is to create a consistent visual system where typography, spacing, colors, components, hierarchy, interaction, and responsive behavior work together.

---

# 1. Core Design Philosophy

Prioritize the following:

1. Clarity
2. Visual hierarchy
3. Consistency
4. Usability
5. Accessibility
6. Responsiveness
7. Visual refinement
8. Performance

Never add visual complexity merely for decoration.

A simpler interface with strong hierarchy is preferable to a visually complicated interface with weak hierarchy.

---

# 2. Before Implementing UI

Before creating or modifying a page/component:

1. Inspect the existing UI architecture.
2. Inspect existing reusable components.
3. Inspect design tokens, CSS variables, theme configuration, and typography.
4. Identify existing patterns for:

   * Buttons
   * Inputs
   * Forms
   * Cards
   * Tables
   * Navigation
   * Modals
   * Dropdowns
   * Alerts
   * Empty states
   * Loading states
5. Reuse existing components whenever possible.
6. Do not introduce a new visual pattern if an existing pattern can solve the problem.
7. If the existing design system is insufficient, improve the shared system rather than creating a one-off solution.

---

# 3. Visual Direction

The default visual direction should feel:

* Modern
* Professional
* Premium
* Minimal
* Clean
* Calm
* Intentional
* Information-dense without feeling cluttered

Use established high-quality product interfaces as visual references when appropriate.

Useful references include:

* Linear
* Vercel
* Stripe
* Apple
* Notion
* Microsoft Fluent
* Material Design

Do NOT copy these products directly.

Use them only as references for:

* Visual hierarchy
* Typography
* Spacing
* Component behavior
* Interaction patterns
* Information architecture
* Accessibility
* Visual consistency

---

# 4. Design System

Use a consistent design system throughout the application.

## Color

Prefer a restrained palette:

* Primary color
* Optional accent color
* Neutral background colors
* Neutral surface colors
* Text colors
* Semantic colors for:

  * Success
  * Warning
  * Error
  * Information

Do not introduce arbitrary colors for individual components.

Do not use bright colors simply to make a UI appear more visually interesting.

Semantic colors must have consistent meanings throughout the application.

---

# 5. Typography

Typography must establish a clear hierarchy.

Define consistent levels for:

* Display
* Page title
* Section title
* Subheading
* Body
* Secondary text
* Caption
* Labels

Avoid using excessively large headings unless the context requires them.

Avoid using many different font sizes without a systematic reason.

Prefer a maximum of two font families.

Use appropriate font weights to establish hierarchy instead of relying only on font size.

---

# 6. Spacing

Use a consistent spacing system.

Prefer a 4px/8px-based spacing scale.

For example:

```text
4
8
12
16
24
32
40
48
64
```

Do not use arbitrary spacing values unless there is a specific design reason.

Maintain consistent spacing between:

* Sections
* Components
* Labels
* Inputs
* Buttons
* Table rows
* Cards
* Navigation elements

Whitespace should be used intentionally to establish hierarchy.

---

# 7. Border Radius

Use a limited and consistent radius system.

For example:

```text
small
medium
large
```

Do not randomly assign different border-radius values to different components.

Avoid excessive rounding.

Not every element needs to be inside a heavily rounded card.

---

# 8. Shadows and Borders

Use shadows sparingly.

Avoid:

* Heavy shadows
* Multiple shadows stacked together
* Excessive glow effects
* Decorative shadows

Prefer subtle elevation when necessary.

Borders should communicate structure rather than decorate every element.

Do not automatically add borders to every section.

---

# 9. Cards

Do not put every piece of content inside a card.

Use cards when they provide meaningful grouping or hierarchy.

Avoid:

```text
Card
 └── Card
      └── Card
           └── Content
```

Prefer open layouts when cards do not provide meaningful value.

---

# 10. Buttons

Buttons must have clear hierarchy.

Define consistent variants such as:

* Primary
* Secondary
* Tertiary/Ghost
* Destructive

Do not make every button visually dominant.

Primary actions should be visually stronger than secondary actions.

Button text should clearly communicate the action.

Avoid unnecessary icons inside buttons.

---

# 11. Forms

Forms must prioritize clarity and completion speed.

Requirements:

* Clear labels
* Logical grouping
* Consistent input dimensions
* Visible focus states
* Clear validation states
* Helpful error messages
* Appropriate spacing
* Keyboard accessibility

Do not rely only on placeholder text as a field label.

Validation errors should explain what went wrong and how to fix it.

---

# 12. Tables and Data-Dense Interfaces

For enterprise applications, prioritize readability over decoration.

Tables should have:

* Clear column hierarchy
* Consistent alignment
* Appropriate row height
* Readable typography
* Clear hover/focus states
* Useful sorting/filtering controls
* Responsive behavior where appropriate

Do not over-style every row.

Use visual emphasis only when it helps users understand important information.

---

# 13. Navigation

Navigation must make the application's information architecture obvious.

Users should be able to understand:

* Where they are
* Where they can go
* Which section is active
* How to return to previous context

Avoid unnecessary navigation elements.

Do not create multiple competing navigation systems unless the application genuinely requires them.

---

# 14. Responsive Design

Every UI must consider:

* Desktop
* Tablet
* Mobile

Do not simply shrink the desktop layout.

Consider how information should reflow or transform on smaller screens.

Examples:

```text
Desktop table
      ↓
Scrollable table / condensed table / card representation
```

```text
Desktop sidebar
      ↓
Collapsed sidebar / drawer
```

Touch targets should remain usable on mobile devices.

---

# 15. Accessibility

Follow accessible UI principles.

Consider:

* Sufficient color contrast
* Keyboard navigation
* Visible focus states
* Semantic HTML
* Proper labels
* Accessible buttons
* Accessible form errors
* Screen-reader compatibility
* Reduced-motion preferences where relevant

Never communicate important information using color alone.

---

# 16. States

Every interactive component should consider its relevant states.

Examples:

```text
Default
Hover
Focus
Active
Disabled
Loading
Success
Error
Empty
```

For pages:

```text
Loading
Loaded
Empty
Error
Permission denied
Offline / network failure
```

Do not design only the happy path.

---

# 17. Micro-interactions

Animations should communicate state or improve usability.

Good uses:

* Loading feedback
* Modal transitions
* Dropdown transitions
* Hover feedback
* Success feedback
* Page transitions when appropriate

Avoid:

* Excessive animations
* Constant movement
* Decorative animations
* Long transitions

Animations should be subtle and fast enough to preserve productivity.

---

# 18. Avoid Generic AI-Generated UI

Do NOT automatically produce the following patterns:

* Excessive rounded cards
* Excessive gradients
* Excessive glassmorphism
* Excessive shadows
* Random colorful icons
* Huge headings without purpose
* Excessive badges
* Excessive pills
* Every section wrapped in a card
* Every button using a bright primary color
* Random border-radius values
* Random spacing values
* Decorative elements without functional purpose
* Excessive empty space
* Excessive visual effects
* Generic "dashboard template" layouts without considering the application's actual information architecture

The UI must feel intentionally designed for the product.

---

# 19. Component Consistency

A component should look and behave consistently wherever it is used.

If the application already has:

```text
Button
Input
Select
Modal
Card
Table
Toast
Dropdown
```

reuse those components.

Do not create:

```text
Button
ButtonNew
ButtonModern
ButtonCustom
ButtonV2
ButtonSpecial
```

unless there is a legitimate architectural reason.

If a component needs a new capability, extend the shared component when appropriate.

---

# 20. Visual Hierarchy Review

After implementing a UI, review:

### Hierarchy

Ask:

* What should users notice first?
* What is the primary action?
* What information is most important?
* Is secondary information visually subordinate?

### Alignment

Check:

* Are elements aligned?
* Are containers using consistent widths?
* Are text and controls aligned correctly?

### Spacing

Check:

* Are sections too close?
* Are elements excessively separated?
* Is spacing consistent?

### Typography

Check:

* Are headings distinguishable?
* Is body text readable?
* Are secondary texts sufficiently subordinate?

### Color

Check:

* Is the palette coherent?
* Are semantic colors consistent?
* Is anything unnecessarily colorful?

### Density

Check:

* Is the interface too empty?
* Is it too crowded?
* Can users scan the content quickly?

---

# 21. Visual QA Workflow

After implementing or significantly modifying UI:

1. Run the application.
2. Open the affected page.
3. Inspect the actual rendered interface.
4. Review desktop layout.
5. Review mobile layout.
6. Check component consistency.
7. Check typography.
8. Check spacing.
9. Check alignment.
10. Check colors and contrast.
11. Check interaction states.
12. Check loading, empty, and error states.
13. Fix obvious visual problems.
14. Re-check the affected page after modifications.

Do not consider a UI task complete simply because the code compiles.

The rendered result is the final source of truth.

---

# 22. Regression Protection

When modifying an existing UI:

* Preserve existing functionality.
* Avoid unnecessary changes to unrelated components.
* Do not introduce a new visual system for a single page.
* Check other pages that use modified shared components.
* Verify responsive behavior after changing shared styles.
* Verify accessibility after modifying interactive components.

A visual improvement must not break existing functionality.

---

# 23. Performance

Do not sacrifice application performance for visual effects.

Avoid unnecessary:

* Large images
* Heavy animations
* Excessive DOM elements
* Expensive visual effects
* Unnecessary client-side rendering

Prefer lightweight CSS solutions when possible.

---

# 24. Final UI Quality Gate

Before declaring a UI task complete, verify:

```text
[ ] Consistent with existing design system
[ ] Clear visual hierarchy
[ ] Consistent spacing
[ ] Consistent typography
[ ] Consistent colors
[ ] Appropriate use of cards
[ ] Appropriate use of shadows
[ ] Responsive
[ ] Accessible
[ ] Loading state handled
[ ] Empty state handled
[ ] Error state handled
[ ] Interactive states handled
[ ] No unnecessary visual decoration
[ ] No duplicated component patterns
[ ] No obvious alignment issues
[ ] No obvious spacing issues
[ ] No obvious mobile issues
[ ] Existing functionality preserved
[ ] Actual rendered UI reviewed
```

The final implementation should feel like one coherent product, not a collection of independently generated pages.
