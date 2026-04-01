# sugar-ai-team

This repository is configured to run the `sugarai` multi-agent template.

- The root interactive session acts as `lead-orchestrator` by default.
- Team assets live in `.codex/` and project-local skills live in `.agents/skills/`.
- Launch role-scoped sessions with `python3 tools/sugarai_team.py launch <role>`.
- Role launch uses a strict skill allowlist and disables every other discovered skill at runtime.

Team workflow:

1. `product-analyst` produces `spec.md`
2. `solution-architect` produces `architecture.md` and `api-contract.yaml`
3. `frontend-engineer`, `backend-engineer`, and `ai-engineer` implement in parallel
4. `qa-reviewer` validates against specs and implementation
5. `devops-release` prepares `release-checklist.md`
6. Human approval is required before any release action

Hard gates:

- No implementation starts before architecture is complete.
- QA starts only after all three implementation roles return.
- Release starts only after QA explicitly passes.
- `lead-orchestrator` coordinates and integrates; it does not own day-to-day feature coding unless the user explicitly asks.
