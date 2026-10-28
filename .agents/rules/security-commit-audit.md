---
description: Automatically trigger the security-commit-auditor subagent whenever a new git commit is created or code changes are committed
trigger: model_decision
---

# Post-Commit Security Review Directive

Whenever a git commit is created (`git commit`) or new changes are committed to the codebase:
1. **Trigger Security Subagent**:
   - Immediately invoke the `security-commit-auditor` subagent using `invoke_subagent`.
   - Provide the prompt instructing it to inspect the latest commit (e.g., `git show --stat` and `git diff HEAD~1 HEAD` or the relevant commit hash).
2. **Review Scope**:
   - Secrets or private keys committed to the repository.
   - Authentication, authorization, and session verification regressions.
   - Data exposure, client bundle leakage, or unsanitized input vulnerabilities.
   - Information leakage in API routes or error handlers.
3. **Action**:
   - If flaws are flagged by the auditor, alert the user with the findings and recommended remediation immediately before pushing or proceeding.
