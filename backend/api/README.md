# SSBoard API

SSBoard v1 的 FastAPI 原型后端，覆盖：

- `GET /api/v1/bootstrap/filters`
- `GET /api/v1/home/overview`
- `GET /api/v1/rankings/{rankingType}`
- `GET /api/v1/entities/{entityType}/{entityId}`
- `GET /api/v1/analysis/jobs`
- `POST /api/v1/analysis/jobs`
- `GET /api/v1/analysis/jobs/{jobId}`
- `POST /api/v1/analysis/jobs/{jobId}/cancel`

## 本地运行

```bash
cd apps/api
python -m pip install -e '.[dev]'
uvicorn ssboard_api.main:app --reload
```

## 测试

```bash
cd apps/api
pytest
```

## 可选：接入 ai-core（与主仓 `ai/ai-core` 对齐）

当前后端会优先尝试加载 `packages/ai-core`。在多 worktree 开发下，如需显式安装对应实现：

```bash
python -m pip install -e ../../ai/ai-core
```

也可通过环境变量指定源码目录：

```bash
export SSBOARD_AI_CORE_SRC=../../ai/ai-core/src
```

## 示例请求

```bash
curl 'http://127.0.0.1:8000/api/v1/bootstrap/filters'
curl 'http://127.0.0.1:8000/api/v1/home/overview?genres=悬疑'
curl 'http://127.0.0.1:8000/api/v1/rankings/series?page=1&page_size=10&sort_by=score&sort_order=desc'
curl 'http://127.0.0.1:8000/api/v1/entities/work/0ad4e3f5-0f4d-4b42-b9f1-675e1f3f0a01'
curl -X POST 'http://127.0.0.1:8000/api/v1/analysis/jobs' -H 'content-type: application/json' -d '{"question":"最近一周电影热榜前十是谁？"}'
```

## 设计说明

- 使用 demo / in-memory 数据，方便并行联调。
- 榜单、详情、分析结果统一返回 provenance，满足来源与更新时间要求。
- AI 查询优先对接 `packages/ai-core`，并在缺失时回退到本地只读规划逻辑。
- 异步分析任务以 in-memory job store + 轮询状态流模拟队列执行过程。
