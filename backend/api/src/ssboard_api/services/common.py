from __future__ import annotations

from datetime import date
from enum import Enum
from uuid import UUID

from ssboard_api.api.schemas import (
    ApiWarning,
    ChartPoint,
    ChartSeries,
    ChartSpec,
    ChartType,
    EntityType,
    FilterSet,
    PaginationMeta,
    RankingType,
    TrendDirection,
    Window,
)
from ssboard_api.core.errors import ApiException
from ssboard_api.repositories.demo_data import DemoDataRepository


RANKING_LABELS = {
    RankingType.artists: '艺人热榜',
    RankingType.characters: '角色热榜',
    RankingType.series: '剧集热榜',
    RankingType.movies: '电影热榜',
}


ENTITY_LABELS = {
    EntityType.work: '作品',
    EntityType.person: '艺人',
    EntityType.character: '角色',
}


TERMINAL_ANALYSIS_STATUSES = {'succeeded', 'failed', 'blocked', 'needs_refine', 'cancelled'}
WINDOW_TO_DAYS = {Window.d7: 7, Window.d30: 30, Window.d90: 90, Window.d365: 365}


class SortOrder(str, Enum):
    asc = 'asc'
    desc = 'desc'


class RankingSortBy(str, Enum):
    rank = 'rank'
    score = 'score'
    delta_value = 'delta_value'
    delta_percent = 'delta_percent'


def pagination(page: int, page_size: int, total: int) -> PaginationMeta:
    return PaginationMeta(page=page, page_size=page_size, total=total)


def warning(code: str, message: str, details: dict | None = None) -> ApiWarning:
    return ApiWarning(code=code, message=message, details=details or {})


def push_warning(warnings: list[ApiWarning], item: ApiWarning) -> None:
    if any(existing.code == item.code and existing.details == item.details for existing in warnings):
        return
    warnings.append(item)


def window_or_default(window: Window | None, default: Window = Window.d30) -> Window:
    return window or default


def trend_direction_for(value: float | None) -> TrendDirection | None:
    if value is None:
        return None
    if value > 0:
        return TrendDirection.up
    if value < 0:
        return TrendDirection.down
    return TrendDirection.flat


def rank_change(rank: int, previous_rank: int | None) -> int | None:
    if previous_rank is None:
        return None
    return previous_rank - rank


def days_for_window(window: Window) -> int:
    return WINDOW_TO_DAYS[window]


def normalize_filters(
    repo: DemoDataRepository,
    filters: FilterSet | None,
    *,
    default_window: Window | None = None,
    warnings: list[ApiWarning] | None = None,
    allow_as_of_fallback: bool = True,
) -> FilterSet:
    filters = filters or FilterSet()
    warnings_ref = warnings if warnings is not None else []

    validate_filter_ids(repo, filters)
    as_of = filters.as_of
    if as_of is None:
        as_of = repo.latest_snapshot_date()
    elif as_of not in set(repo.available_dates()):
        if not allow_as_of_fallback:
            raise ApiException(
                status_code=400,
                code='INVALID_FILTER',
                message='Requested snapshot date is not available.',
                hint='Use GET /api/v1/bootstrap/filters to fetch available_dates.',
                details={'field': 'as_of', 'value': as_of.isoformat()},
            )
        push_warning(
            warnings_ref,
            warning(
                'AS_OF_FALLBACK_APPLIED',
                'Requested snapshot date is unavailable; latest published snapshot was used instead.',
                {'requested_as_of': as_of.isoformat(), 'fallback_as_of': repo.latest_snapshot_date().isoformat()},
            ),
        )
        as_of = repo.latest_snapshot_date()

    normalized = FilterSet(
        as_of=as_of,
        window=window_or_default(filters.window, default_window or Window.d30) if default_window is not None or filters.window is not None else None,
        source_ids=list(filters.source_ids),
        platform_ids=list(filters.platform_ids),
        genres=list(filters.genres),
    )
    add_context_warnings(repo, normalized, warnings_ref)
    return normalized


def validate_filter_ids(repo: DemoDataRepository, filters: FilterSet) -> None:
    unknown_sources = [str(source_id) for source_id in filters.source_ids if source_id not in repo.sources]
    if unknown_sources:
        raise ApiException(
            status_code=400,
            code='INVALID_FILTER',
            message='One or more source_ids are not supported.',
            hint='Use GET /api/v1/bootstrap/filters to fetch valid source options.',
            details={'field': 'source_ids', 'unknown_ids': unknown_sources},
        )

    unknown_platforms = [str(platform_id) for platform_id in filters.platform_ids if platform_id not in repo.platforms]
    if unknown_platforms:
        raise ApiException(
            status_code=400,
            code='INVALID_FILTER',
            message='One or more platform_ids are not supported.',
            hint='Use GET /api/v1/bootstrap/filters to fetch valid platform options.',
            details={'field': 'platform_ids', 'unknown_ids': unknown_platforms},
        )


def add_context_warnings(repo: DemoDataRepository, filters: FilterSet, warnings: list[ApiWarning]) -> None:
    if filters.as_of and filters.as_of < repo.latest_snapshot_date():
        push_warning(
            warnings,
            warning(
                'STALE_DATA',
                'You are viewing an older published snapshot.',
                {'snapshot_date': filters.as_of.isoformat(), 'latest_published_snapshot': repo.latest_snapshot_date().isoformat()},
            ),
        )

    if len(filters.source_ids) > 1:
        push_warning(
            warnings,
            warning(
                'MULTI_SOURCE_AGGREGATED',
                'The response aggregates metrics from multiple selected sources.',
                {'source_ids': [str(source_id) for source_id in filters.source_ids]},
            ),
        )
    elif not filters.source_ids and len(repo.sources) > 1:
        push_warning(
            warnings,
            warning(
                'MULTI_SOURCE_AGGREGATED',
                'The response aggregates metrics from all published sources by default.',
                {'source_count': len(repo.sources)},
            ),
        )


def line_chart(
    title: str,
    series_map: dict[str, list[tuple[date | str, float]]],
    *,
    subtitle: str | None = None,
    unit: str | None = None,
    note: str | None = None,
) -> ChartSpec:
    return ChartSpec(
        chart_type=ChartType.line,
        title=title,
        subtitle=subtitle,
        x_axis_label='日期',
        y_axis_label=unit or '数值',
        unit=unit,
        series=[
            ChartSeries(
                name=name,
                points=[
                    ChartPoint(
                        x=point_date.isoformat() if isinstance(point_date, date) else str(point_date),
                        y=float(value),
                    )
                    for point_date, value in points
                ],
            )
            for name, points in series_map.items()
        ],
        note=note,
    )


def bar_chart(
    title: str,
    mapping: dict[str, float | int],
    *,
    subtitle: str | None = None,
    unit: str | None = None,
    note: str | None = None,
    chart_type: ChartType = ChartType.bar,
) -> ChartSpec:
    return ChartSpec(
        chart_type=chart_type,
        title=title,
        subtitle=subtitle,
        x_axis_label='维度',
        y_axis_label=unit or '数值',
        unit=unit,
        series=[
            ChartSeries(
                name=title,
                points=[ChartPoint(x=label, y=float(value)) for label, value in mapping.items()],
            )
        ],
        stacked=chart_type == ChartType.stacked_bar,
        note=note,
    )
