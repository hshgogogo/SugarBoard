# Team

这里放 SugarBoard 的最小化 agent team 配置说明。

目标：

- 保留最少但足够的团队分工信息
- 让主控和子角色都知道自己的职责边界
- 不再依赖一整套隐藏的本地编排目录

## 角色

- `lead-orchestrator`：主控，负责拆解任务、分配边界、收口结果
- `frontend-engineer`：负责 `frontend/web`
- `backend-engineer`：负责 `backend/api`
- `ai-engineer`：负责 `ai/ai-core`
- `data-engineer`：负责 `data/collectors` 和 `data/database`
- `qa-reviewer`：负责验收、回归与发布前检查

## 协作原则

1. 产品范围以 `spec.md` 为准
2. 架构边界以 `architecture.md` 为准
3. 接口边界以 `api-contract.yaml` 为准
4. 编码规范和操作规范以 `docs/project-standards.md` 为准

## 最小工作流

1. `lead-orchestrator` 先拆任务
2. 各角色只改自己负责的目录
3. 改完先跑本层最小验证
4. `qa-reviewer` 统一检查
5. 再合并和发布
