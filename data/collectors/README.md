# Data Collectors

这里放数据采集与接入逻辑。

建议后续按来源拆分，例如：

- `platform_api/`
- `manual_import/`
- `public_signals/`

每个采集器都应明确：

- 数据来源
- 更新频率
- 字段映射
- 清洗规则
- 风险与合规说明
