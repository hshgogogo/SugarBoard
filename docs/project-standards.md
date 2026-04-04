# SSBoard 项目代码规范与操作规范

## 1. 目标

这份规范只服务于当前 SSBoard 项目，目标是两件事：

- 让代码结构长期可维护
- 让多人并行开发时不互相污染

## 2. 仓库职责边界

主仓库只保留三类内容：

- 项目文档：`spec.md`、`architecture.md`、`api-contract.yaml`、`docs/`
- 项目工具：`tools/`
- 项目管理文件：`README.md`、`LICENSE`、`test-plan.md`、`release-checklist.md`

以下内容禁止进入主仓库：

- 演示音频、视频、PPT、Canva 导出物
- 本地构建产物
- 调试缓存
- 临时下载的第三方源码副本
- 大体积二进制附件

## 3. 目录约定

### 3.1 文档

- `docs/` 只放长期有效的项目文档
- 产品说明、交互说明、架构补充、运行手册统一放 `docs/`
- 一次性演示材料、导出 HTML、旁白脚本不放 `docs/`

### 3.2 工具

- `tools/` 只保留当前项目仍会使用的脚本
- 脚本命名使用动词开头，例如 `generate_*`、`launch_*`、`ensure_*`
- 脚本必须有清晰输入、输出和用途，避免“只在某次任务里用过一次”的残留脚本

### 3.3 前端

- 前端统一按 `Next.js + TypeScript` 管理
- 路由页面只负责组装页面，不堆业务细节
- 公共组件放 `src/components`
- 纯数据映射和静态配置放 `src/lib`
- 页面级样式优先复用全局设计变量，不写散乱的临时颜色和尺寸

### 3.4 后端

- 后端统一按 `FastAPI + Python 3.11+` 管理
- 按 `api / services / repositories / domain / core` 分层
- 路由层不直接拼业务规则
- 业务逻辑进入 `services`
- 数据读取和存储进入 `repositories`
- 跨模块的错误、响应、依赖统一收敛

## 4. 代码规范

### 4.1 通用规范

- 默认使用 ASCII；只有内容本身需要中文时才保留中文文本
- 文件名统一小写，使用 `kebab-case` 或 `snake_case`
- 不提交调试日志、临时注释、无用代码块
- 不保留注释掉的大段旧实现
- 公共常量必须抽取，不允许魔法数字和魔法字符串散落

### 4.2 TypeScript / React 规范

- 打开 `strict` 后不得用 `any` 逃避类型问题
- 组件名使用 `PascalCase`
- hooks 只在需要时使用，不为了“看起来高级”强行上状态
- 页面组件优先保持无副作用，数据预处理放在 `lib` 或服务层
- 一个组件只做一件事，超过 200 行优先拆分
- 样式优先复用变量，不直接反复硬编码颜色值
- 路由参数、查询参数、接口返回值都必须显式定义类型

### 4.3 Python / FastAPI 规范

- 函数、变量、模块统一使用 `snake_case`
- 类型注解必须完整，尤其是 service 和 repository 层
- API schema 不和 domain model 混写
- 路由函数只做参数接收、调用 service、返回响应
- 数据访问逻辑不写进 API 层
- 新增接口时必须同时补充测试

### 4.4 测试规范

- 前端至少保证 `typecheck` 和 `build` 通过
- 后端至少保证 `pytest` 通过
- 修 bug 必须补对应回归测试或至少补一个最小验证用例
- 不能把“我本地看起来可以”当成完成标准

## 5. 文档规范

- 文档只保留对后续开发仍有价值的内容
- 任何被删除文件的引用必须同步移除
- 文档标题明确，不使用“最终版”“最新版”“临时版”这类模糊命名
- 设计文档和实现文档分开，避免一个文档里同时堆产品、架构、操作步骤

## 6. Git 与分支规范

- 不直接在不清楚状态的工作区里乱改
- 改动前先看 `git status`
- 只处理自己这次任务涉及的文件
- 不回滚别人的改动
- 不使用 `git reset --hard`
- 分支名应表达任务意图，例如：
  - `feat/dashboard-overview`
  - `fix/api-analysis-status`
  - `docs/project-standards`

提交信息建议格式：

- `feat: add dashboard overview widgets`
- `fix: correct analysis job status transition`
- `docs: add project standards`
- `chore: remove obsolete presentation artifacts`

## 7. 操作规范

### 7.1 开工前

1. 先看 `spec.md`、`architecture.md`、`api-contract.yaml`
2. 再确认自己改动落在哪一层
3. 改前先确认不会和其他 worktree 冲突

### 7.2 开发时

1. 一次任务只解决一个明确目标
2. 先改源码，再跑最小验证
3. 涉及接口变更时同步更新文档
4. 涉及删除文件时同步清理引用和忽略规则

### 7.3 提交前

前端改动至少执行：

```bash
npm run typecheck
npm run build
```

后端改动至少执行：

```bash
pytest
```

文档或工具改动至少执行：

```bash
git diff --stat
git status --short
```

### 7.4 合并前

- 确认没有把生成物带进仓库
- 确认没有坏链接
- 确认没有本地绝对路径泄漏到面向用户的文档中
- 确认说明文档和实现状态一致

## 8. 生成物管理规范

以下目录和文件默认视为生成物或本地缓存，不应入库：

- `.pdf-export/`
- `voiceover/`
- `deliverables/`
- `external/`
- `node_modules/`
- `.next/`
- `__pycache__/`
- `.pytest_cache/`

如果未来确实需要保留某个导出物，必须满足两个条件：

1. 它是项目正式交付的一部分
2. 它有长期复用价值，而不是某次沟通中的中间产物

## 9. 协作规范

- 产品问题先回到 `spec.md`
- 接口问题先回到 `api-contract.yaml`
- 模块边界问题先回到 `architecture.md`
- 不在聊天结论和口头约定上长期依赖记忆
- 任何阶段性临时方案，如果会长期存在，就必须落成文档

## 10. 完成定义

一次任务只有在以下条件都满足时才算完成：

- 代码或文档改动已落地
- 最小验证已执行
- 引用关系已清理
- 仓库没有额外脏文件
- 最终说明能让下一个人接手继续干
