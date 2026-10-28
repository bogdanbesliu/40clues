---
description: Automatically trigger the security-commit-auditor subagent after a git commit and before pushing to remote
trigger: always_on
---

# Post-Commit & Pre-Push Security Review Directive

Whenever a git commit is created or changes are committed:
1. **Trigger Before Push**:
   - Before running `git push`, invoke the `security-commit-auditor` subagent using `invoke_subagent`.
   - Instruct it to inspect the commit diff (`git show --stat`, `git diff HEAD~1 HEAD` or the relevant commit range).
2. **Review Scope**:
   - Secrets, tokens, or private keys committed to the repository.
   - Authentication, authorization, and session verification regressions.
   - Data exposure, client bundle leakage, or unsanitized input vulnerabilities.
   - Information leakage in API routes or error handlers.
3. **Action & Remediation**:
   - If flaws or vulnerabilities are detected:
     - Clearly explain what is wrong.
     - Apply fixes to resolve the issues.
     - Commit the fixes before pushing to remote.
