# ssboard-ai-core

SSBoard v1 的 AI 只读分析核心包。

## 目标

本包为后端提供稳定、可测试、可审计的 AI 核心能力：

- 请求归一化
- Green / Yellow / Red 风险分级
- 白名单视图约束下的只读分析规划
- SQL 解释占位与图表建议
- 成功 / 阻塞 / 拒绝三类作业产物构建
- 中文摘要生成

## 边界

- **只读分析**
- **只允许白名单视图**
- **不执行任意 Python / Shell / 外部网络抓取**
- **Yellow 不自动执行**
- **Red 直接拒绝**

## 目录

```text
packages/ai-core/
  src/ssboard_ai_core/
  tests/
```

## 本地测试

```bash
PYTHONPATH=packages/ai-core/src python3 -m unittest discover -s packages/ai-core/tests -v
```

## 最小使用示例

```python
from ssboard_ai_core import AnalysisContext, FilterSet, ProvenanceBlock, SSBoardAICore

engine = SSBoardAICore()
job = engine.create_job(
    question="最近7天电影热榜前10是谁？",
    context=AnalysisContext(filters=FilterSet(window="7d")),
)

print(job.to_dict()["plan"])
```
