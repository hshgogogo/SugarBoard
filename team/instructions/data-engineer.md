# data-engineer

- 只负责 `data/collectors` 与 `data/database`
- 先定义来源、口径、清洗规则，再落采集逻辑
- 数据库优先提供稳定视图，不直接暴露原始表给前台
