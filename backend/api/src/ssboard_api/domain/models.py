from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class SourceRecord:
    id: UUID
    source_name: str
    source_type: str
    authorization_status: str
    ingested_at: datetime
    updated_at: datetime
    caliber_note: str | None = None


@dataclass(frozen=True, slots=True)
class PlatformRecord:
    id: UUID
    label: str


@dataclass(frozen=True, slots=True)
class RelatedRecord:
    entity_id: UUID
    relation_label: str
    metric_label: str | None = None
    metric_value: float | None = None


@dataclass(frozen=True, slots=True)
class TimelineRecord:
    id: UUID
    event_date: date
    event_type: str
    title: str
    description: str | None = None
    source_name: str | None = None


@dataclass(frozen=True, slots=True)
class EntityRecord:
    id: UUID
    entity_type: str
    ranking_type: str | None
    name: str
    subtitle: str | None
    work_type: str | None
    avatar_url: str | None
    description: str | None
    tags: list[str]
    genres: list[str]
    platform_ids: list[UUID]
    hero_facts: list[tuple[str, str]]
    updated_at: datetime
    related_groups: dict[str, list[RelatedRecord]] = field(default_factory=dict)
    timeline: list[TimelineRecord] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class RankingMetricRecord:
    snapshot_date: date
    ranking_type: str
    entity_id: UUID
    base_score: float
    delta_value: float
    delta_percent: float
    source_metrics: dict[UUID, float]
