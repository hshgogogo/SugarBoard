# SSBoard v1 分阶段执行计划

更新时间：2026-04-01

## 目标

在严格遵循 `/Users/hsh/Desktop/team.md` 与仓库内 team contract 的前提下，交付 SSBoard 内部 Web 原型第一版，并按以下顺序推进：

1. 需求冻结：先完成可执行 `spec.md`
2. 架构冻结：再完成 `architecture.md` 与 `api-contract.yaml`
3. 并行实现：前端 / 后端 / AI 角色基于已冻结架构并行推进
4. QA 门禁：只在三条实现线全部返回后开始
5. 发布准备：只在 QA 明确通过后开始
6. 人工批准：发布动作必须等待人工确认

## 输入依据

- Team contract: `/Users/hsh/Desktop/team.md`
- PRD: `docs/ssboard-prd-v1.md`
- Wireframes: `docs/ssboard-flow-and-wireframes.html`
- Shared artifacts: `spec.md`, `architecture.md`, `api-contract.yaml`, `test-plan.md`, `release-checklist.md`

## 非协商门禁

- `architecture.md` / `api-contract.yaml` 未完成前，任何编码角色不得开工。
- `frontend-engineer`、`backend-engineer`、`ai-engineer` 未全部返回前，`qa-reviewer` 不得开工。
- `qa-reviewer` 未明确给出 pass 结论前，`devops-release` 不得开工。
- `devops-release` 只输出 rollout / rollback 方案，不自动部署。
- 编码角色必须使用仓库已准备好的 worktree：`.worktrees/frontend-engineer`、`.worktrees/backend-engineer`、`.worktrees/ai-engineer`（QA 复核使用 `.worktrees/qa-reviewer`）。

## v1 最小闭环

本轮必须跑通以下业务闭环：

1. 首页看到 KPI、四类榜单概览、趋势区与 AI 入口
2. 榜单页支持日期 / 来源 / 平台 / 题材筛选与趋势侧栏
3. 实体详情页支持作品 / 艺人 / 角色三类详情与趋势/关系/时间线模块
4. AI 工作台支持自然语言输入、SQL 解释、风险等级、图表结果、中文摘要
5. 所有榜单与分析结果都能展示来源、更新时间、口径说明或风险提示

## Phase Plan

### Phase 1 — Requirement Freeze

- Owner: `product-analyst`
- Deliverable: `spec.md`
- Scope:
  - 将 PRD 收束为可执行范围
  - 明确首页、榜单页、详情页、AI 工作台的用户故事与验收标准
  - 锁定数据来源优先级、来源追溯要求、AI 只读边界与异步任务边界
- Exit Criteria:
  - `spec.md` 包含范围、非范围、页面能力、接口需求、验收标准、风险边界
  - 明确“3 分钟闭环”成功路径：查看榜单 -> 下钻详情 -> 发起 AI 分析

### Phase 2 — Architecture + Contract Freeze

- Owner: `solution-architect`
- Deliverables: `architecture.md`, `api-contract.yaml`
- Depends on: Phase 1 sign-off
- Scope:
  - 冻结模块边界、数据流、任务状态机、前后端契约、AI 安全边界
  - 保证前端、后端、AI 三线能基于契约并行开发
- Exit Criteria:
  - API contract 覆盖首页、榜单、详情、AI 查询、任务状态接口
  - Architecture 说明数据源适配、缓存、异步任务、审计、只读分析视图

### Phase 3 — Parallel Implementation

#### 3A Frontend
- Owner: `frontend-engineer`
- Worktree: `.worktrees/frontend-engineer`
- Deliverable: 首页、榜单页、详情页、AI 工作台的 Next.js 原型
- Depends on: Phase 2 sign-off

#### 3B Backend
- Owner: `backend-engineer`
- Worktree: `.worktrees/backend-engineer`
- Deliverable: FastAPI 原型接口、示例数据链路、异步任务状态接口
- Depends on: Phase 2 sign-off

#### 3C AI
- Owner: `ai-engineer`
- Worktree: `.worktrees/ai-engineer`
- Deliverable: 只读 NL2SQL、风险分级、图表建议、摘要生成、异步任务编排骨架
- Depends on: Phase 2 sign-off

### Phase 4 — QA Gate

- Owner: `qa-reviewer`
- Worktree: `.worktrees/qa-reviewer`
- Deliverable: `test-plan.md` + pass/fail gate
- Depends on: Frontend / Backend / AI 三方全部返回
- Exit Criteria:
  - 核验“首页 -> 榜单 -> 详情 -> AI”闭环
  - 核验来源、更新时间、空态、报错态、AI 只读约束、任务状态流

### Phase 5 — Release Preparation

- Owner: `devops-release`
- Deliverable: `release-checklist.md`
- Depends on: QA explicit pass
- Exit Criteria:
  - 输出环境变量、compose/CI 草案、发布步骤、回滚步骤、人工批准点
  - 不执行真实部署

### Phase 6 — Human Release Approval

- Owner: Human
- Deliverable: 是否批准发布的决定
- Depends on: Phase 5

## 当前任务图（2026-04-01）

| Phase | Task ID | Owner | Status | Gate |
| --- | --- | --- | --- | --- |
| Requirement Freeze | `f7b00145` | `product-analyst` | `in_progress` | 活跃中 |
| Architecture Freeze | `31193947` | `solution-architect` | `blocked` | blocked by `f7b00145` |
| Frontend | `b2b890b2` | `frontend-engineer` | `blocked` | blocked by `31193947` |
| Backend | `650bed0d` | `backend-engineer` | `blocked` | blocked by `31193947` |
| AI | `62fda75f` | `ai-engineer` | `blocked` | blocked by `31193947` |
| QA | `ce4de328` | `qa-reviewer` | `blocked` | blocked by implementation trio |
| Release | `2767d1fd` | `devops-release` | `blocked` | blocked by `ce4de328` |

## 当前协调动作

1. 督促 `product-analyst` 先完成 `spec.md`
2. 让 `solution-architect` 预读 PRD / wireframes，但不得在 spec 冻结前擅自完成架构定稿
3. 将实现、QA、Release 任务显式标记为 blocked，避免越级开工
4. 待 `spec.md` 完成后，立即切换到架构冻结与三线并行准备
