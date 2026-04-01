# sugar-ai-team contract

## Identity

- Template: `sugarai`
- Team: `sugar-ai-team`
- Controller role: `lead-orchestrator`
- Repository mode: `single repo + multiple git worktrees`

## Roles

- `lead-orchestrator`
- `product-analyst`
- `solution-architect`
- `frontend-engineer`
- `backend-engineer`
- `ai-engineer`
- `qa-reviewer`
- `devops-release`

## Shared artifacts

- `spec.md`
- `architecture.md`
- `api-contract.yaml`
- `test-plan.md`
- `release-checklist.md`

## Phase order

1. Requirement clarification
2. Architecture sign-off
3. Parallel implementation
4. QA review
5. Release preparation
6. Human release approval

## Gates

- Architecture must exist before implementation roles start.
- QA must wait for frontend, backend, and AI implementation outputs.
- Release planning must wait for explicit QA pass.
- Release planning never means automatic deployment.

## Standard task packet

- `Goal`
- `Deliverable`
- `Inputs`
- `Constraints`
- `Done Definition`
- `Return Format`

## Standard return format

- `Summary`
- `Changed/Proposed Files`
- `Tests/Checks`
- `Open Risks`
- `Next Handoff`

## Worktree rule

- Coding roles use branch pattern `sugar-ai/<role>/<task-id>`.
- Worktree root is `.worktrees/`.
- `lead-orchestrator` coordinates; it should not become the default coding role.
