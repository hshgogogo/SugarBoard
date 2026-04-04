# SugarBoard

SugarBoard 是一个面向中国影视行业的数据分析平台，包含前端看板、后端 API、AI 分析能力，以及后续的数据采集与数据库层。

## 当前目录结构

```text
frontend/
  web/              # Next.js 前端
backend/
  api/              # FastAPI 后端
ai/
  ai-core/          # AI 分析核心能力
data/
  collectors/       # 数据采集与接入
  database/         # 数据库迁移、种子、视图
docs/               # 产品、原型、规范文档
```

## 本地启动

### 前端

```bash
cd frontend/web
npm install
npm run dev -- --hostname 127.0.0.1 --port 3001
```

### 后端

```bash
cd backend/api
python -m pip install -e '.[dev]'
uvicorn ssboard_api.main:app --reload
```

### AI 模块

```bash
cd ai/ai-core
python -m pip install -e .
```

## 主要文档

- 产品需求：[spec.md](/Users/hsh/Desktop/ssboard/spec.md)
- 架构设计：[architecture.md](/Users/hsh/Desktop/ssboard/architecture.md)
- API 契约：[api-contract.yaml](/Users/hsh/Desktop/ssboard/api-contract.yaml)
- 项目规范：[docs/project-standards.md](/Users/hsh/Desktop/ssboard/docs/project-standards.md)
