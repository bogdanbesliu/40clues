---
description: Automatically check UI/UX and Accessibility on every major visual change
trigger: model_decision
---

# UI/UX & Accessibility Audit Directive

Whenever a major visual, layout, or design change is made to 40Clues:
1. **Trigger Audit**: Invoke the `ui-ux-accessibility-auditor` subagent or perform a rigorous accessibility review against WCAG 2.1/2.2 AA standards.
2. **Key Checklist**:
   - **Contrast**: Ensure minimum 4.5:1 for body copy (slate-100/200/300) and 3:1 for large text/icons on dark surfaces (`bg-slate-950`, `bg-slate-900`).
   - **Touch Targets**: Minimum 44x44px for buttons, links, and close triggers (especially on mobile viewports).
   - **Focus Management**: Trap focus within modals, return focus to the trigger on close, and retain visible focus rings (`focus-visible:ring-2 focus-visible:ring-amber-400`).
   - **Comboboxes & Forms**: Ensure `role="combobox"` has `aria-haspopup="listbox"`, `aria-expanded`, `aria-activedescendant`, and error inputs have `aria-invalid="true"` with `aria-describedby`.
   - **Reduced Motion**: Guard all CSS animations, shake effects, confetti bursts, and score tickers with `prefers-reduced-motion` media queries.
   - **Live Announcements**: Avoid dual conflicting `aria-live` updates; consolidate status messages into polite, single announcements.
