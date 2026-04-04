from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from uuid import UUID

from fastapi import Query

from ssboard_api.api.schemas import FilterSet, Window
from ssboard_api.core.errors import ApiException
from ssboard_api.repositories.demo_data import DemoDataRepository, repository
from ssboard_api.services.analysis import AnalysisService
from ssboard_api.services.bootstrap import BootstrapService
from ssboard_api.services.entities import EntityDetailService
from ssboard_api.services.home import HomeService
from ssboard_api.services.rankings import RankingService


@dataclass(slots=True)
class CommonFilters:
    as_of: date | None
    window: Window | None
    source_ids: list[UUID]
    platform_ids: list[UUID]
    genres: list[str]

    def to_filter_set(self) -> FilterSet:
        return FilterSet(
            as_of=self.as_of,
            window=self.window,
            source_ids=self.source_ids,
            platform_ids=self.platform_ids,
            genres=self.genres,
        )


def _parse_csv_uuid(raw: str | None, field_name: str) -> list[UUID]:
    if not raw:
        return []

    values: list[UUID] = []
    for item in raw.split(','):
        value = item.strip()
        if not value:
            continue
        try:
            values.append(UUID(value))
        except ValueError as exc:
            raise ApiException(
                status_code=400,
                code='INVALID_FILTER',
                message=f'Invalid UUID in {field_name}.',
                hint=f'Use comma-separated UUID values for {field_name}.',
                details={'field': field_name, 'value': value},
            ) from exc
    return values


def _parse_csv_str(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split(',') if item.strip()]


def shared_filters(
    as_of: date | None = Query(default=None),
    source_ids: str | None = Query(default=None),
    platform_ids: str | None = Query(default=None),
    genres: str | None = Query(default=None),
) -> CommonFilters:
    return CommonFilters(
        as_of=as_of,
        window=None,
        source_ids=_parse_csv_uuid(source_ids, 'source_ids'),
        platform_ids=_parse_csv_uuid(platform_ids, 'platform_ids'),
        genres=_parse_csv_str(genres),
    )


def ranking_filters(
    as_of: date | None = Query(default=None),
    window: Window | None = Query(default=Window.d30),
    source_ids: str | None = Query(default=None),
    platform_ids: str | None = Query(default=None),
    genres: str | None = Query(default=None),
) -> CommonFilters:
    return CommonFilters(
        as_of=as_of,
        window=window,
        source_ids=_parse_csv_uuid(source_ids, 'source_ids'),
        platform_ids=_parse_csv_uuid(platform_ids, 'platform_ids'),
        genres=_parse_csv_str(genres),
    )


@lru_cache(maxsize=1)
def get_repository() -> DemoDataRepository:
    return repository


@lru_cache(maxsize=1)
def get_analysis_service() -> AnalysisService:
    return AnalysisService(get_repository())


@lru_cache(maxsize=1)
def get_bootstrap_service() -> BootstrapService:
    return BootstrapService(get_repository())


@lru_cache(maxsize=1)
def get_home_service() -> HomeService:
    return HomeService(get_repository(), get_analysis_service())


@lru_cache(maxsize=1)
def get_ranking_service() -> RankingService:
    return RankingService(get_repository())


@lru_cache(maxsize=1)
def get_entity_detail_service() -> EntityDetailService:
    return EntityDetailService(get_repository())
