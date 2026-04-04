# Backend

当前后端代码统一放在 `backend/api`。

- 技术栈：FastAPI + Pydantic
- 运行入口：`backend/api`

启动命令：

```bash
cd backend/api
python -m pip install -e '.[dev]'
uvicorn ssboard_api.main:app --reload
```
