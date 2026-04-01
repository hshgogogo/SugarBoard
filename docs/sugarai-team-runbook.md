# sugar-ai-team runbook

这套团队已经按项目级方式落在当前仓库里：

- 团队配置：`.codex/config.toml`
- 角色说明：`.codex/instructions/`
- 角色与 skill 白名单：`.codex/team_roles.json`
- 项目本地 skills：`.agents/skills/`
- 启动器：`tools/sugarai_team.py`

## 你现在得到的能力

1. 当前仓库默认以 `lead-orchestrator` 视角组织协作。
2. 每个角色都有独立指令层。
3. 启动某个角色时，启动器会扫描当前机器上已发现的 skill，并把不在该角色白名单里的 skill 全部禁用。
4. `frontend-engineer`、`backend-engineer`、`ai-engineer`、`qa-reviewer` 已经预留独立 worktree 路径。

## 查看角色

```bash
python3 tools/sugarai_team.py roles
```

## 只打印某个角色的启动命令

```bash
python3 tools/sugarai_team.py launch lead-orchestrator --print-only
python3 tools/sugarai_team.py launch ai-engineer --print-only
```

## 真正启动某个角色

```bash
python3 tools/sugarai_team.py launch lead-orchestrator
python3 tools/sugarai_team.py launch frontend-engineer
python3 tools/sugarai_team.py launch ai-engineer
```

## 初始化 git 与 worktree

当前目录还不是 git 仓库，所以 worktree 还不能直接创建。你可以用下面的方式初始化：

```bash
python3 tools/sugarai_team.py bootstrap --init-git
```

如果你希望它顺手创建一个空初始提交并拉起编码角色 worktree：

```bash
python3 tools/sugarai_team.py bootstrap --init-git --create-worktrees --empty-initial-commit --task-id init
```

这会生成类似下面的分支：

- `sugar-ai/frontend-engineer/init`
- `sugar-ai/backend-engineer/init`
- `sugar-ai/ai-engineer/init`
- `sugar-ai/qa-reviewer/init`

## 当前角色与 skill 绑定

- `lead-orchestrator` -> `super-powers`
- `product-analyst` -> `product-spec-writer`
- `solution-architect` -> `architecture-contract-designer`
- `frontend-engineer` -> `frontend-design`
- `backend-engineer` -> `backend-service-builder`
- `ai-engineer` -> `langchain-fundamentals`, `langchain-middleware`, `langgraph-fundamentals`, `langgraph-persistence`, `langgraph-human-in-the-loop`, `langsmith-trace`, `langsmith-dataset`, `langsmith-evaluator`
- `qa-reviewer` -> `qa-gatekeeper`
- `devops-release` -> `release-planner`

## 阶段门禁

1. `spec.md` 没有定稿前，不进架构与实现。
2. `architecture.md` 和 `api-contract.yaml` 没有定稿前，不允许实现角色开工。
3. 前端、后端、AI 三个实现角色结果未回齐前，不允许 QA 启动。
4. QA 未明确通过前，不允许 Release 启动。
5. Release 只出计划，不自动发布。
