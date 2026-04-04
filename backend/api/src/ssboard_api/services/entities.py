from __future__ import annotations

from statistics import mean
from uuid import UUID

from ssboard_api.api.schemas import (
    EntityDetailData,
    EntityProfile,
    EntityType,
    EventType,
    FilterSet,
    LabelValue,
    MetricCard,
    RankingHistoryEntry,
    RankingType,
    RelatedEntityItem,
    RelatedGroup,
    TimelineEvent,
    Window,
)
from ssboard_api.core.errors import ApiException
from ssboard_api.repositories.demo_data import DemoDataRepository
from ssboard_api.services.common import bar_chart, line_chart, normalize_filters, push_warning, trend_direction_for, warning


class EntityDetailService:
    def __init__(self, repo: DemoDataRepository) -> None:
        self.repo = repo

    def get_entity_detail(
        self,
        *,
        entity_type: EntityType,
        entity_id: UUID,
        as_of,
        trend_window: Window,
    ) -> tuple[EntityDetailData, list]:
        warnings: list = []
        filters = normalize_filters(
            self.repo,
            FilterSet(as_of=as_of, window=trend_window),
            default_window=Window.d30,
            warnings=warnings,
        )
        entity = self.repo.get_entity(entity_id)
        if entity.entity_type != entity_type.value:
            raise ApiException(
                status_code=404,
                code='ENTITY_NOT_FOUND',
                message='Requested entity type and id combination was not found.',
                hint='Verify the entity type and id from the ranking/detail navigation context.',
                details={'entity_type': entity_type.value, 'entity_id': str(entity_id)},
            )

        ranking_type = RankingType(entity.ranking_type)
        ranked = self.repo.ranked_entities(ranking_type=ranking_type, as_of=filters.as_of)
        current_item = next((item for item in ranked if item.entity.id == entity_id), None)
        time_series = self.repo.time_series(
            entity_id=entity_id,
            ranking_type=ranking_type,
            as_of=filters.as_of,
            window=filters.window,
        )
        ranking_history = self.repo.ranking_history(
            entity_id=entity_id,
            ranking_type=ranking_type,
            as_of=filters.as_of,
            days=7,
        )

        missing_sections = []
        if not entity.related_groups:
            missing_sections.append('related_groups')
        if not entity.timeline:
            missing_sections.append('timeline')
        if missing_sections:
            push_warning(
                warnings,
                warning(
                    'PARTIAL_SECTION_UNAVAILABLE',
                    'Some optional detail sections are empty in the demo dataset.',
                    {'sections': missing_sections, 'entity_id': str(entity_id)},
                ),
            )

        values = [value for _, value in time_series] or [0.0]
        data = EntityDetailData(
            entity=EntityProfile(
                id=entity.id,
                entity_type=entity_type,
                name=entity.name,
                subtitle=entity.subtitle,
                avatar_url=entity.avatar_url,
                description=entity.description,
                hero_facts=[LabelValue(label=label, value=value) for label, value in entity.hero_facts],
                tags=entity.tags,
                updated_at=entity.updated_at,
            ),
            metric_cards=[
                MetricCard(
                    key='current_score',
                    label='当前热度分',
                    value=float(current_item.score if current_item else values[-1]),
                    unit='分',
                    delta_value=float(current_item.delta_value) if current_item else None,
                    delta_percent=float(current_item.delta_percent) if current_item else None,
                    trend_direction=trend_direction_for(current_item.delta_value if current_item else None),
                ),
                MetricCard(
                    key='current_rank',
                    label='当前排名',
                    value=float(current_item.rank if current_item else 0),
                    unit='名',
                ),
                MetricCard(key='window_peak', label='窗口峰值', value=float(max(values)), unit='分'),
                MetricCard(key='window_avg', label='窗口均分', value=float(round(mean(values), 2)), unit='分'),
            ],
            trend_panels=[
                line_chart(f'{entity.name} 热度趋势', {entity.name: time_series}, unit='热度分'),
                bar_chart(
                    f'{entity.name} 来源贡献',
                    {piece.source_name: piece.metric_value for piece in (current_item.source_breakdown if current_item else [])},
                    unit='热度分',
                ),
            ],
            ranking_history=[
                RankingHistoryEntry(snapshot_date=snapshot_date, ranking_type=ranking_type, rank=rank)
                for snapshot_date, rank in ranking_history
            ],
            related_groups=[
                RelatedGroup(
                    title=title,
                    items=[
                        RelatedEntityItem(
                            entity=self.repo.get_entity_reference(record.entity_id),
                            relation_label=record.relation_label,
                            metric_label=record.metric_label,
                            metric_value=record.metric_value,
                        )
                        for record in records
                    ],
                )
                for title, records in entity.related_groups.items()
            ],
            timeline=[
                TimelineEvent(
                    id=record.id,
                    event_date=record.event_date,
                    event_type=EventType(record.event_type),
                    title=record.title,
                    description=record.description,
                    source_name=record.source_name,
                )
                for record in entity.timeline
            ],
            provenance=self.repo.get_provenance(as_of=filters.as_of, methodology_key='entity_detail'),
        )
        return data, warnings
