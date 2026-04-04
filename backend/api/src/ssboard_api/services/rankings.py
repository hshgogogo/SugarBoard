from __future__ import annotations

from ssboard_api.api.schemas import FilterSet, RankingItem, RankingListData, RankingType, Window
from ssboard_api.repositories.demo_data import DemoDataRepository, RankedEntity
from ssboard_api.services.common import (
    RANKING_LABELS,
    RankingSortBy,
    SortOrder,
    bar_chart,
    line_chart,
    normalize_filters,
    pagination,
    rank_change,
)


class RankingService:
    def __init__(self, repo: DemoDataRepository) -> None:
        self.repo = repo

    def get_ranking_page(
        self,
        *,
        ranking_type: RankingType,
        filters: FilterSet,
        page: int,
        page_size: int,
        sort_by: RankingSortBy,
        sort_order: SortOrder,
    ) -> tuple[RankingListData, list, object]:
        warnings: list = []
        normalized = normalize_filters(self.repo, filters, default_window=Window.d30, warnings=warnings)
        ranked = self.repo.ranked_entities(
            ranking_type=ranking_type,
            as_of=normalized.as_of,
            source_ids=normalized.source_ids,
            platform_ids=normalized.platform_ids,
            genres=normalized.genres,
        )
        sorted_items = self._sort_items(ranked, sort_by, sort_order)
        total = len(sorted_items)
        start = (page - 1) * page_size
        end = start + page_size
        paged = sorted_items[start:end]

        data = RankingListData(
            ranking_type=ranking_type,
            title=f'{RANKING_LABELS[ranking_type]}榜单',
            filters=normalized,
            items=[self._build_ranking_item(item, ranking_type, normalized) for item in paged],
            analysis_panels=[self._build_trend_panel(ranked, ranking_type, normalized), self._build_source_panel(paged, ranking_type)],
            provenance=self.repo.get_provenance(
                as_of=normalized.as_of,
                source_ids=normalized.source_ids,
                methodology_key=ranking_type.value,
            ),
        )
        return data, warnings, pagination(page, page_size, total)

    def _sort_items(self, items: list[RankedEntity], sort_by: RankingSortBy, sort_order: SortOrder) -> list[RankedEntity]:
        key_map = {
            RankingSortBy.rank: lambda item: item.rank,
            RankingSortBy.score: lambda item: item.score,
            RankingSortBy.delta_value: lambda item: item.delta_value,
            RankingSortBy.delta_percent: lambda item: item.delta_percent,
        }
        reverse = sort_order == SortOrder.desc
        return sorted(items, key=key_map[sort_by], reverse=reverse)

    def _build_ranking_item(self, item: RankedEntity, ranking_type: RankingType, filters: FilterSet) -> RankingItem:
        sparkline_points = self.repo.time_series(
            entity_id=item.entity.id,
            ranking_type=ranking_type,
            as_of=filters.as_of,
            window=Window.d7,
            source_ids=filters.source_ids,
        )
        return RankingItem(
            rank=item.rank,
            previous_rank=item.previous_rank,
            rank_change=rank_change(item.rank, item.previous_rank),
            entity=self.repo.get_entity_reference(item.entity.id),
            score=item.score,
            delta_value=item.delta_value,
            delta_percent=item.delta_percent,
            tags=item.entity.tags,
            sparkline=line_chart('7日趋势', {item.entity.name: sparkline_points}, unit='热度分'),
            source_breakdown=item.source_breakdown,
        )

    def _build_trend_panel(self, ranked: list[RankedEntity], ranking_type: RankingType, filters: FilterSet):
        series_map = {}
        for item in ranked[:3]:
            series_map[item.entity.name] = self.repo.time_series(
                entity_id=item.entity.id,
                ranking_type=ranking_type,
                as_of=filters.as_of,
                window=filters.window,
                source_ids=filters.source_ids,
            )
        return line_chart(
            f'{RANKING_LABELS[ranking_type]}趋势对比',
            series_map,
            unit='热度分',
            note='右侧辅助分析区默认展示当前 Top3 的时间序列。',
        )

    def _build_source_panel(self, ranked: list[RankedEntity], ranking_type: RankingType):
        distribution = self.repo.source_distribution(ranked[:10])
        return bar_chart(
            f'{RANKING_LABELS[ranking_type]}来源拆解',
            distribution,
            unit='热度分',
            note='聚合当前页 Top10 的来源贡献值。',
        )
