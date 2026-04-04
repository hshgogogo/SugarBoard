from __future__ import annotations

from .models import AnalysisPlan, Intent, ProvenanceBlock, TablePreview


def build_summary(question: str, plan: AnalysisPlan, table_preview: TablePreview, provenance: ProvenanceBlock) -> str:
    row_count = len(table_preview.rows)
    source_names = "、".join(source.source_name for source in provenance.sources[:3]) or "未知来源"
    methodology = "、".join(ref.label for ref in provenance.methodology_refs[:2]) or "默认口径"

    if row_count == 0:
        return (
            f"- 问题：{question}\n"
            f"- 结果：当前筛选范围内没有命中数据，请调整时间、来源或对象范围后重试。\n"
            f"- 数据说明：快照日期为 {provenance.snapshot_date}，来源为 {source_names}。"
        )

    if plan.intent == Intent.RANKING_COMPARE:
        top_row = table_preview.rows[0]
        top_name = top_row.get("entity_name", "未知对象")
        score = top_row.get("score", top_row.get("metric_value", "未知"))
        return (
            f"- 问题：{question}\n"
            f"- 结论：当前结果中排在最前的是 **{top_name}**，核心指标约为 **{score}**。\n"
            f"- 数据范围：共返回 {row_count} 条记录，快照日期为 {provenance.snapshot_date}。\n"
            f"- 来源与口径：来源包含 {source_names}；方法学参考为 {methodology}。"
        )

    if plan.intent == Intent.TREND_EXPLAIN and row_count >= 2:
        first_row = table_preview.rows[0]
        last_row = table_preview.rows[-1]
        entity_name = last_row.get("entity_name", first_row.get("entity_name", "目标对象"))
        start_value = first_row.get("metric_value", first_row.get("score", 0))
        end_value = last_row.get("metric_value", last_row.get("score", 0))
        direction = "上升" if float(end_value) >= float(start_value) else "回落"
        return (
            f"- 问题：{question}\n"
            f"- 结论：**{entity_name}** 在当前窗口内整体呈 **{direction}** 趋势，区间末值约为 **{end_value}**。\n"
            f"- 数据范围：共返回 {row_count} 个点位，快照截至 {provenance.snapshot_date}。\n"
            f"- 来源与口径：来源包含 {source_names}；方法学参考为 {methodology}。"
        )

    if plan.intent == Intent.SOURCE_COMPARE:
        top_row = max(
            table_preview.rows,
            key=lambda row: float(row.get("metric_value", row.get("score", row.get("rank", 0))) or 0),
        )
        source_name = top_row.get("source_name", "未知来源")
        metric_value = top_row.get("metric_value", top_row.get("score", "未知"))
        return (
            f"- 问题：{question}\n"
            f"- 结论：当前结果中 **{source_name}** 的表现最突出，指标值约为 **{metric_value}**。\n"
            f"- 数据范围：共返回 {row_count} 条来源拆解记录，快照截至 {provenance.snapshot_date}。\n"
            f"- 来源与口径：来源包含 {source_names}；方法学参考为 {methodology}。"
        )

    return (
        f"- 问题：{question}\n"
        f"- 结论：本次分析返回了 {row_count} 条可展示记录，可在图表和表格预览中继续查看细节。\n"
        f"- 数据范围：快照日期为 {provenance.snapshot_date}，来源为 {source_names}。\n"
        f"- 来源与口径：方法学参考为 {methodology}。"
    )
