from __future__ import annotations

from collections import Counter
from datetime import date

from ssboard_api.api.schemas import DateOption, FilterBootstrapData, FilterOption, FilterSet, RecommendedQuestion, Window
from ssboard_api.repositories.demo_data import DemoDataRepository
from ssboard_api.services.common import normalize_filters


class BootstrapService:
    def __init__(self, repo: DemoDataRepository) -> None:
        self.repo = repo

    def get_filters(self, *, as_of: date | None = None) -> tuple[FilterBootstrapData, list]:
        warnings: list = []
        normalized = normalize_filters(
            self.repo,
            FilterSet(as_of=as_of),
            default_window=Window.d30,
            warnings=warnings,
        )

        platform_counts = Counter()
        genre_counts = Counter()
        for entity in self.repo.entities.values():
            platform_counts.update(str(platform_id) for platform_id in entity.platform_ids)
            genre_counts.update(entity.genres)

        data = FilterBootstrapData(
            default_filters=FilterSet(as_of=normalized.as_of, window=Window.d30),
            available_dates=[
                DateOption(
                    value=snapshot_date,
                    label=f"{snapshot_date.isoformat()}（最新可用快照）" if snapshot_date == self.repo.latest_snapshot_date() else snapshot_date.isoformat(),
                )
                for snapshot_date in self.repo.available_dates()
            ],
            sources=[
                FilterOption(id=str(record.id), label=record.source_name, count=len(self.repo.entities))
                for record in sorted(self.repo.get_source_records(), key=lambda item: item.source_name)
            ],
            platforms=[
                FilterOption(id=str(record.id), label=record.label, count=platform_counts.get(str(record.id), 0))
                for record in sorted(self.repo.get_platform_records(), key=lambda item: item.label)
            ],
            genres=[
                FilterOption(id=genre, label=genre, count=count)
                for genre, count in sorted(genre_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            recommended_questions=[
                RecommendedQuestion(id='movies_top10', label='电影榜前十', question='最近一周电影热榜前十是谁？'),
                RecommendedQuestion(id='series_trend', label='剧集走势对比', question='对比《苍穹之城》《雾港迷踪》《星河归途》最近90天走势'),
                RecommendedQuestion(id='platform_distribution', label='平台分布', question='当前剧集热榜按平台分布如何？'),
                RecommendedQuestion(id='artist_volatility', label='艺人波动', question='最近7天艺人榜波动最大的对象是谁？'),
                RecommendedQuestion(id='entity_deep_dive', label='实体深挖', question='《苍穹之城》最近30天为什么热度上升？'),
            ],
        )
        return data, warnings
