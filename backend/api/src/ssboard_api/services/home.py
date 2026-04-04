from __future__ import annotations

from datetime import timedelta

from ssboard_api.api.schemas import FilterSet, HomeOverviewData, KpiCard, RankingPanel, RankingPreviewItem, RankingType, Window
from ssboard_api.repositories.demo_data import DemoDataRepository
from ssboard_api.services.analysis import AnalysisService
from ssboard_api.services.common import RANKING_LABELS, bar_chart, line_chart, normalize_filters


class HomeService:
    def __init__(self, repo: DemoDataRepository, analysis_service: AnalysisService) -> None:
        self.repo = repo
        self.analysis_service = analysis_service

    def get_overview(self, filters: FilterSet) -> tuple[HomeOverviewData, list]:
        warnings: list = []
        normalized = normalize_filters(self.repo, filters, default_window=Window.d30, warnings=warnings)

        data = HomeOverviewData(
            filters=normalized,
            kpis=self._build_kpis(normalized),
            ranking_panels=[self._build_ranking_panel(ranking_type, normalized) for ranking_type in RankingType],
            analysis_panels=[self._build_market_trend_panel(normalized), self._build_platform_distribution_panel(normalized)],
            recent_analysis_jobs=self.analysis_service.recent_summaries(limit=5),
            provenance=self.repo.get_provenance(
                as_of=normalized.as_of,
                source_ids=normalized.source_ids,
                methodology_key='home_overview',
            ),
        )
        return data, warnings

    def _build_kpis(self, filters: FilterSet) -> list[KpiCard]:
        work_entities = [
            entity
            for entity in self.repo.filter_entities(platform_ids=filters.platform_ids, genres=filters.genres)
            if entity.entity_type == 'work'
        ]
        as_of = filters.as_of
        recent_threshold = as_of - timedelta(days=6)
        new_releases = sum(
            1
            for entity in work_entities
            for event in entity.timeline
            if recent_threshold <= event.event_date <= as_of and event.event_type in {'announcement', 'premiere', 'release'}
        )

        rising_candidates = []
        for ranking_type in RankingType:
            rising_candidates.extend(
                self.repo.ranked_entities(
                    ranking_type=ranking_type,
                    as_of=as_of,
                    source_ids=filters.source_ids,
                    platform_ids=filters.platform_ids,
                    genres=filters.genres,
                )
            )
        champion = max(rising_candidates, key=lambda item: item.delta_percent, default=None)
        source_count = len(filters.source_ids) if filters.source_ids else len(self.repo.sources)
        coverage = round(source_count / len(self.repo.sources) * 100, 1)

        return [
            KpiCard(key='works_in_scope', label='在榜作品数', value=float(len(work_entities)), unit='个'),
            KpiCard(key='new_releases', label='上新作品数', value=float(new_releases), unit='个'),
            KpiCard(
                key='heat_growth_champion',
                label='热度涨幅冠军',
                value=float(champion.delta_percent if champion else 0.0),
                unit='%',
                emphasis=champion.entity.name if champion else '暂无',
                delta_value=float(champion.delta_value) if champion else None,
                delta_percent=float(champion.delta_percent) if champion else None,
            ),
            KpiCard(key='coverage_rate', label='数据覆盖率', value=float(coverage), unit='%'),
        ]

    def _build_ranking_panel(self, ranking_type: RankingType, filters: FilterSet) -> RankingPanel:
        items = self.repo.ranked_entities(
            ranking_type=ranking_type,
            as_of=filters.as_of,
            source_ids=filters.source_ids,
            platform_ids=filters.platform_ids,
            genres=filters.genres,
        )[:5]
        return RankingPanel(
            ranking_type=ranking_type,
            title=f'{RANKING_LABELS[ranking_type]} Top 5',
            items=[
                RankingPreviewItem(
                    rank=item.rank,
                    entity=self.repo.get_entity_reference(item.entity.id),
                    score=item.score,
                    delta_percent=item.delta_percent,
                    tags=item.entity.tags,
                )
                for item in items
            ],
            provenance=self.repo.get_provenance(
                as_of=filters.as_of,
                source_ids=filters.source_ids,
                methodology_key=ranking_type.value,
            ),
        )

    def _build_market_trend_panel(self, filters: FilterSet):
        end_date = filters.as_of
        start_date = max(self.repo.available_dates()[-1], end_date - timedelta(days=29))
        target_dates = [snapshot_date for snapshot_date in self.repo.available_dates()[::-1] if start_date <= snapshot_date <= end_date]
        target_dates.reverse()

        series_map: dict[str, list[tuple[str, float]]] = {}
        for ranking_type in RankingType:
            points = []
            for snapshot_date in target_dates:
                ranked = self.repo.ranked_entities(
                    ranking_type=ranking_type,
                    as_of=snapshot_date,
                    source_ids=filters.source_ids,
                    platform_ids=filters.platform_ids,
                    genres=filters.genres,
                )[:5]
                average_score = round(sum(item.score for item in ranked) / len(ranked), 2) if ranked else 0.0
                points.append((snapshot_date.isoformat(), average_score))
            series_map[RANKING_LABELS[ranking_type]] = points
        return line_chart('大盘趋势对比', series_map, unit='热度分', note='基于四类榜单 Top5 均值生成。')

    def _build_platform_distribution_panel(self, filters: FilterSet):
        distribution = self.repo.platform_distribution(
            ranking_type=None,
            as_of=filters.as_of,
            platform_ids=filters.platform_ids,
            genres=filters.genres,
        )
        return bar_chart('平台分布', distribution, unit='实体数', note='统计当前筛选范围内实体覆盖的平台数量。')
