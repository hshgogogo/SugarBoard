from __future__ import annotations

from collections import defaultdict

from .models import ChartPoint, ChartSeries, ChartSpec, ChartType, Intent, TablePreview


def placeholder_chart(intent: Intent, title: str) -> ChartSpec:
    chart_type = _chart_type_for_intent(intent, 0)
    return ChartSpec(
        chart_type=chart_type,
        title=title,
        series=[],
        note="执行后将基于结果集自动补全图表。",
    )


def build_chart(intent: Intent, question: str, table_preview: TablePreview) -> ChartSpec:
    rows = table_preview.rows
    chart_type = _chart_type_for_intent(intent, len(rows))
    if not rows:
        return ChartSpec(chart_type=chart_type, title=question, series=[], note="当前结果为空。")

    if intent == Intent.TREND_EXPLAIN and "snapshot_date" in rows[0]:
        groups: dict[str, list[ChartPoint]] = defaultdict(list)
        for row in rows:
            series_name = str(row.get("entity_name") or row.get("source_name") or "指标")
            y_value = _as_float(row.get("metric_value", row.get("score", 0)))
            groups[series_name].append(
                ChartPoint(x=str(row.get("snapshot_date")), y=y_value, label=str(row.get("entity_name") or ""))
            )
        return ChartSpec(
            chart_type=chart_type,
            title=question,
            x_axis_label="日期",
            y_axis_label="指标值",
            series=[ChartSeries(name=name, points=points) for name, points in groups.items()],
        )

    x_key = _first_existing_key(rows[0], ["entity_name", "source_name", "snapshot_date", "rank"])
    y_key = _first_existing_key(rows[0], ["score", "metric_value", "delta_value", "rank"])
    points = [ChartPoint(x=str(row.get(x_key)), y=_as_float(row.get(y_key, 0))) for row in rows]
    return ChartSpec(
        chart_type=chart_type,
        title=question,
        x_axis_label=x_key,
        y_axis_label=y_key,
        series=[ChartSeries(name="结果", points=points)],
        stacked=chart_type == ChartType.STACKED_BAR,
    )


def _chart_type_for_intent(intent: Intent, row_count: int) -> ChartType:
    if intent == Intent.TREND_EXPLAIN:
        return ChartType.LINE
    if intent == Intent.SOURCE_COMPARE and row_count and row_count <= 5:
        return ChartType.PIE
    if intent == Intent.SOURCE_COMPARE:
        return ChartType.STACKED_BAR
    if intent == Intent.RANKING_COMPARE:
        return ChartType.BAR
    if intent == Intent.ENTITY_DEEP_DIVE:
        return ChartType.AREA
    return ChartType.BAR


def _first_existing_key(row: dict[str, object], candidates: list[str]) -> str:
    for key in candidates:
        if key in row:
            return key
    return next(iter(row.keys()))


def _as_float(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return 0.0
