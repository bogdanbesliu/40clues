---
description: Automatically check UI/UX and Accessibility after commits involving UI components and before pushing
trigger: always_on
---

# Post-Commit & Pre-Push UI/UX & Accessibility Audit Directive

Whenever a commit touches UI components, styles, or user-facing interactions:
1. **Trigger Before Push**:
   - Before running `git push`, invoke the `ui-ux-accessibility-auditor` subagent using `invoke_subagent`.
   - Inspect the modified components against WCAG 2.1/2.2 AA standards and responsive design requirements.
2. **Key Checklist**:
   - **Contrast**: Ensure minimum 4.5:1 for body copy (slate-100/200/300) and 3:1 for large text/icons on dark surfaces (`bg-slate-950`, `bg-slate-900`).
   - **Touch Targets**: Minimum 44x44px for buttons, links, and close triggers (especially on mobile viewports).
   - **Focus Management**: Trap focus within modals, return focus to the trigger on close, and retain visible focus rings (`focus-visible:ring-2 focus-visible:ring-amber-400`).
   - **Comboboxes & Forms**: Ensure `role="combobox"` has `aria-haspopup="listbox"`, `aria-expanded`, `aria-activedescendant`, and error inputs have `aria-invalid="true"` with `aria-describedby`.
   - **Reduced Motion**: Guard all CSS animations, shake effects, confetti bursts, and score tickers with `prefers-reduced-motion` media queries.
   - **Live Announcements**: Avoid dual conflicting `aria-live` updates; consolidate status messages into polite, single announcements.
3. **Action & Remediation**:
   - If flaws or regressions are detected:
     - Clearly explain what is wrong.
     - Apply fixes to resolve the issues.
     - Commit the fixes before pushing to remote.
