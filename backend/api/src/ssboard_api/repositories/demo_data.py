from __future__ import annotations

import math
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from uuid import UUID, NAMESPACE_URL, uuid5

from ssboard_api.api.schemas import (
    AuthorizationStatus,
    EntityReference,
    EntityType,
    FreshnessStatus,
    MethodologyRef,
    ProvenanceBlock,
    RankingType,
    SourceAttribution,
    SourceMetricBreakdown,
    SourceType,
    Window,
    WorkType,
)
from ssboard_api.core.errors import ApiException
from ssboard_api.domain.models import EntityRecord, PlatformRecord, RankingMetricRecord, RelatedRecord, SourceRecord, TimelineRecord

UTC = timezone.utc
LATEST_SNAPSHOT_DATE = date(2026, 3, 31)
REFRESHED_AT = datetime(2026, 4, 1, 9, 30, tzinfo=UTC)
DATE_SERIES = [LATEST_SNAPSHOT_DATE - timedelta(days=offset) for offset in range(34, -1, -1)]
WINDOW_TO_DAYS = {Window.d7: 7, Window.d30: 30, Window.d90: 35, Window.d365: 35}


@dataclass(frozen=True, slots=True)
class RankedEntity:
    entity: EntityRecord
    score: float
    delta_value: float
    delta_percent: float
    source_breakdown: list[SourceMetricBreakdown]
    previous_rank: int | None
    rank: int


@lru_cache(maxsize=1)
def stable_uuid(key: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"ssboard:{key}")


class DemoDataRepository:
    def __init__(self) -> None:
        self.sources = self._build_sources()
        self.platforms = self._build_platforms()
        self.entities = self._build_entities()
        self.metrics = self._build_metrics()

    def available_dates(self) -> list[date]:
        return list(reversed(DATE_SERIES))

    def latest_snapshot_date(self) -> date:
        return LATEST_SNAPSHOT_DATE

    def resolve_as_of(self, as_of: date | None) -> date:
        if as_of is None:
            return LATEST_SNAPSHOT_DATE
        if as_of not in DATE_SERIES:
            raise ApiException(
                status_code=400,
                code="SNAPSHOT_NOT_AVAILABLE",
                message="Requested snapshot date is not available.",
                hint="Use GET /api/v1/bootstrap/filters to fetch available_dates.",
                details={"as_of": as_of.isoformat()},
            )
        return as_of

    def get_source_records(self, source_ids: list[UUID] | None = None) -> list[SourceRecord]:
        if not source_ids:
            return list(self.sources.values())
        return [self.sources[source_id] for source_id in source_ids if source_id in self.sources]

    def get_platform_records(self) -> list[PlatformRecord]:
        return list(self.platforms.values())

    def get_entities_for_ranking(self, ranking_type: RankingType) -> list[EntityRecord]:
        return [entity for entity in self.entities.values() if entity.ranking_type == ranking_type.value]

    def get_entity(self, entity_id: UUID) -> EntityRecord:
        try:
            return self.entities[entity_id]
        except KeyError as exc:
            raise ApiException(
                status_code=404,
                code="ENTITY_NOT_FOUND",
                message="Requested entity was not found.",
                hint="Verify the entity id from the ranking/detail navigation context.",
                details={"entity_id": str(entity_id)},
            ) from exc

    def get_entity_reference(self, entity_id: UUID) -> EntityReference:
        entity = self.get_entity(entity_id)
        work_type = WorkType(entity.work_type) if entity.work_type else None
        return EntityReference(
            id=entity.id,
            entity_type=EntityType(entity.entity_type),
            name=entity.name,
            subtitle=entity.subtitle,
            work_type=work_type,
            avatar_url=entity.avatar_url,
            tags=entity.tags,
        )

    def get_provenance(self, *, as_of: date, source_ids: list[UUID] | None = None, methodology_key: str) -> ProvenanceBlock:
        source_records = self.get_source_records(source_ids)
        methods = [
            MethodologyRef(
                key=f"{methodology_key}_score_v1",
                label="SSBoard 综合热度分",
                metric_or_ranking_type=methodology_key,
                formula_summary="综合近窗热度、来源权重、平台曝光与趋势变化后归一化得到 0-100 分。",
                caliber_note="仅使用已发布快照；过滤条件改变时会重新汇总。",
                notes=["v1 为演示口径，正式版将接入真实 mart 视图。"],
            ),
            MethodologyRef(
                key="freshness_v1",
                label="快照新鲜度",
                metric_or_ranking_type="freshness",
                formula_summary="若当前查询日期等于最新发布快照日期，则 freshness_status=fresh。",
                notes=["所有 UI 读请求均指向 published snapshot。"],
            ),
        ]
        freshness = FreshnessStatus.fresh if as_of == LATEST_SNAPSHOT_DATE else FreshnessStatus.delayed
        return ProvenanceBlock(
            snapshot_id=stable_uuid(f"snapshot:{as_of.isoformat()}"),
            snapshot_date=as_of,
            refreshed_at=REFRESHED_AT,
            freshness_status=freshness,
            sources=[
                SourceAttribution(
                    id=record.id,
                    source_name=record.source_name,
                    source_type=SourceType(record.source_type),
                    authorization_status=AuthorizationStatus(record.authorization_status),
                    ingested_at=record.ingested_at,
                    updated_at=record.updated_at,
                    caliber_note=record.caliber_note,
                )
                for record in source_records
            ],
            methodology_refs=methods,
        )

    def filter_entities(
        self,
        *,
        ranking_type: RankingType | None = None,
        platform_ids: list[UUID] | None = None,
        genres: list[str] | None = None,
    ) -> list[EntityRecord]:
        items = list(self.entities.values())
        if ranking_type is not None:
            items = [entity for entity in items if entity.ranking_type == ranking_type.value]
        if platform_ids:
            selected = set(platform_ids)
            items = [entity for entity in items if selected.intersection(entity.platform_ids)]
        if genres:
            genre_set = set(genres)
            items = [entity for entity in items if genre_set.intersection(entity.genres)]
        return items

    def ranked_entities(
        self,
        *,
        ranking_type: RankingType,
        as_of: date,
        source_ids: list[UUID] | None = None,
        platform_ids: list[UUID] | None = None,
        genres: list[str] | None = None,
    ) -> list[RankedEntity]:
        current_records: list[tuple[EntityRecord, RankingMetricRecord]] = []
        previous_records: list[tuple[EntityRecord, float]] = []
        for entity in self.filter_entities(ranking_type=ranking_type, platform_ids=platform_ids, genres=genres):
            current = self.metrics[(ranking_type.value, entity.id, as_of)]
            current_score = self._score_from_sources(current, source_ids)
            if current_score <= 0:
                continue
            current_records.append((entity, current))
            previous_date = self._previous_date(as_of)
            if previous_date is not None:
                previous_metric = self.metrics[(ranking_type.value, entity.id, previous_date)]
                previous_records.append((entity, self._score_from_sources(previous_metric, source_ids)))
        ranked_now = sorted(current_records, key=lambda item: item[1].base_score if not source_ids else self._score_from_sources(item[1], source_ids), reverse=True)
        previous_rank_map = {}
        if previous_records:
            sorted_prev = sorted(previous_records, key=lambda item: item[1], reverse=True)
            previous_rank_map = {entity.id: idx for idx, (entity, _) in enumerate(sorted_prev, start=1)}
        results: list[RankedEntity] = []
        for idx, (entity, metric) in enumerate(ranked_now, start=1):
            selected_score = round(self._score_from_sources(metric, source_ids), 2)
            breakdown = self._source_breakdown(metric, source_ids)
            results.append(
                RankedEntity(
                    entity=entity,
                    rank=idx,
                    previous_rank=previous_rank_map.get(entity.id),
                    score=selected_score,
                    delta_value=round(metric.delta_value, 2),
                    delta_percent=round(metric.delta_percent, 2),
                    source_breakdown=breakdown,
                )
            )
        return results

    def time_series(
        self,
        *,
        entity_id: UUID,
        ranking_type: RankingType,
        as_of: date,
        window: Window,
        source_ids: list[UUID] | None = None,
    ) -> list[tuple[date, float]]:
        days = WINDOW_TO_DAYS[window]
        eligible = [d for d in DATE_SERIES if d <= as_of][-days:]
        series = []
        for snapshot_date in eligible:
            metric = self.metrics[(ranking_type.value, entity_id, snapshot_date)]
            series.append((snapshot_date, round(self._score_from_sources(metric, source_ids), 2)))
        return series

    def ranking_history(
        self,
        *,
        entity_id: UUID,
        ranking_type: RankingType,
        as_of: date,
        platform_ids: list[UUID] | None = None,
        genres: list[str] | None = None,
        source_ids: list[UUID] | None = None,
        days: int = 7,
    ) -> list[tuple[date, int]]:
        target_dates = [d for d in DATE_SERIES if d <= as_of][-days:]
        history: list[tuple[date, int]] = []
        for snapshot_date in target_dates:
            ranked = self.ranked_entities(
                ranking_type=ranking_type,
                as_of=snapshot_date,
                source_ids=source_ids,
                platform_ids=platform_ids,
                genres=genres,
            )
            for item in ranked:
                if item.entity.id == entity_id:
                    history.append((snapshot_date, item.rank))
                    break
        return history

    def platform_distribution(self, *, ranking_type: RankingType | None, as_of: date, platform_ids: list[UUID] | None = None, genres: list[str] | None = None) -> dict[str, int]:
        entities = self.filter_entities(ranking_type=ranking_type, platform_ids=platform_ids, genres=genres)
        counts: dict[str, int] = {}
        for entity in entities:
            for platform_id in entity.platform_ids:
                platform = self.platforms[platform_id]
                counts[platform.label] = counts.get(platform.label, 0) + 1
        return counts

    def genre_distribution(self, *, ranking_type: RankingType | None, platform_ids: list[UUID] | None = None, genres: list[str] | None = None) -> dict[str, int]:
        entities = self.filter_entities(ranking_type=ranking_type, platform_ids=platform_ids, genres=genres)
        counts: dict[str, int] = {}
        for entity in entities:
            for genre in entity.genres:
                counts[genre] = counts.get(genre, 0) + 1
        return counts

    def source_distribution(self, ranked_entities: list[RankedEntity]) -> dict[str, float]:
        counts: dict[str, float] = {}
        for item in ranked_entities:
            for piece in item.source_breakdown:
                counts[piece.source_name] = round(counts.get(piece.source_name, 0.0) + piece.metric_value, 2)
        return counts

    def _previous_date(self, as_of: date) -> date | None:
        index = DATE_SERIES.index(as_of)
        return DATE_SERIES[index - 1] if index > 0 else None

    def _score_from_sources(self, metric: RankingMetricRecord, source_ids: list[UUID] | None) -> float:
        if not source_ids:
            return metric.base_score
        return round(sum(metric.source_metrics.get(source_id, 0.0) for source_id in source_ids), 2)

    def _source_breakdown(self, metric: RankingMetricRecord, source_ids: list[UUID] | None) -> list[SourceMetricBreakdown]:
        chosen_ids = source_ids or list(metric.source_metrics.keys())
        total = sum(metric.source_metrics.get(source_id, 0.0) for source_id in chosen_ids)
        rows = []
        for source_id in chosen_ids:
            if source_id not in metric.source_metrics:
                continue
            metric_value = round(metric.source_metrics[source_id], 2)
            ratio = round(metric_value / total, 4) if total else None
            rows.append(
                SourceMetricBreakdown(
                    source_id=source_id,
                    source_name=self.sources[source_id].source_name,
                    metric_value=metric_value,
                    metric_ratio=ratio,
                )
            )
        return rows

    def _build_sources(self) -> dict[UUID, SourceRecord]:
        base_time = datetime(2026, 3, 31, 8, 0, tzinfo=UTC)
        rows = [
            SourceRecord(
                id=stable_uuid("source:maoyan"),
                source_name="猫眼专业版",
                source_type=SourceType.controlled_collection.value,
                authorization_status=AuthorizationStatus.public.value,
                ingested_at=base_time - timedelta(hours=6),
                updated_at=base_time,
                caliber_note="覆盖电影上映/票房热度与部分宣发信号。",
            ),
            SourceRecord(
                id=stable_uuid("source:yunhe"),
                source_name="云合数据",
                source_type=SourceType.partner_export.value,
                authorization_status=AuthorizationStatus.licensed.value,
                ingested_at=base_time - timedelta(hours=5),
                updated_at=base_time - timedelta(minutes=10),
                caliber_note="覆盖剧集有效播放与平台热度趋势。",
            ),
            SourceRecord(
                id=stable_uuid("source:disclosure"),
                source_name="公开宣发日历",
                source_type=SourceType.public_disclosure.value,
                authorization_status=AuthorizationStatus.public.value,
                ingested_at=base_time - timedelta(hours=4),
                updated_at=base_time - timedelta(minutes=20),
                caliber_note="用于定档/官宣/上映等事件时间线。",
            ),
            SourceRecord(
                id=stable_uuid("source:manual"),
                source_name="内部人工校对",
                source_type=SourceType.manual_import.value,
                authorization_status=AuthorizationStatus.internal_manual.value,
                ingested_at=base_time - timedelta(hours=3),
                updated_at=base_time - timedelta(minutes=5),
                caliber_note="补齐角色、演职员和口径备注。",
            ),
        ]
        return {row.id: row for row in rows}

    def _build_platforms(self) -> dict[UUID, PlatformRecord]:
        rows = [
            PlatformRecord(id=stable_uuid("platform:tencent"), label="腾讯视频"),
            PlatformRecord(id=stable_uuid("platform:iqiyi"), label="爱奇艺"),
            PlatformRecord(id=stable_uuid("platform:youku"), label="优酷"),
            PlatformRecord(id=stable_uuid("platform:mango"), label="芒果TV"),
            PlatformRecord(id=stable_uuid("platform:cinema"), label="院线"),
        ]
        return {row.id: row for row in rows}

    def _build_entities(self) -> dict[UUID, EntityRecord]:
        platform = {row.label: row.id for row in self.platforms.values()}
        raw_entities = [
            {
                "key": "work:cangqiongzhicheng",
                "entity_type": "work",
                "ranking_type": "series",
                "name": "苍穹之城",
                "subtitle": "科幻悬疑剧",
                "work_type": "series",
                "tags": ["悬疑", "科幻", "腾讯独播"],
                "genres": ["悬疑", "科幻"],
                "platform_ids": [platform["腾讯视频"]],
                "description": "围绕未来城市失控事件展开的多线叙事剧集。",
                "hero_facts": [("作品类型", "剧集"), ("平台", "腾讯视频"), ("题材", "悬疑 / 科幻")],
            },
            {
                "key": "work:wugangmizong",
                "entity_type": "work",
                "ranking_type": "series",
                "name": "雾港迷踪",
                "subtitle": "都市罪案剧",
                "work_type": "series",
                "tags": ["罪案", "都市"],
                "genres": ["悬疑", "都市"],
                "platform_ids": [platform["爱奇艺"]],
                "description": "以港口失踪案为主线的都市罪案题材。",
                "hero_facts": [("作品类型", "剧集"), ("平台", "爱奇艺"), ("题材", "悬疑 / 都市")],
            },
            {
                "key": "work:chunyelieche",
                "entity_type": "work",
                "ranking_type": "series",
                "name": "春夜列车",
                "subtitle": "爱情群像剧",
                "work_type": "series",
                "tags": ["爱情", "公路"],
                "genres": ["爱情", "剧情"],
                "platform_ids": [platform["优酷"]],
                "description": "一趟跨城列车串联起多位年轻人的命运。",
                "hero_facts": [("作品类型", "剧集"), ("平台", "优酷"), ("题材", "爱情 / 剧情")],
            },
            {
                "key": "work:beiweisanshiliudu",
                "entity_type": "work",
                "ranking_type": "series",
                "name": "北纬三十六度",
                "subtitle": "现实题材剧",
                "work_type": "series",
                "tags": ["现实", "家庭"],
                "genres": ["剧情", "家庭"],
                "platform_ids": [platform["芒果TV"]],
                "description": "聚焦沿海小城家庭与产业升级的现实题材。",
                "hero_facts": [("作品类型", "剧集"), ("平台", "芒果TV"), ("题材", "剧情 / 家庭")],
            },
            {
                "key": "work:xingheguitu",
                "entity_type": "work",
                "ranking_type": "series",
                "name": "星河归途",
                "subtitle": "古装传奇剧",
                "work_type": "series",
                "tags": ["古装", "传奇"],
                "genres": ["古装", "剧情"],
                "platform_ids": [platform["腾讯视频"], platform["爱奇艺"]],
                "description": "以边塞群像和家国抉择为主线的古装传奇。",
                "hero_facts": [("作品类型", "剧集"), ("平台", "腾讯视频 / 爱奇艺"), ("题材", "古装 / 剧情")],
            },
            {
                "key": "work:xuexianxingdong",
                "entity_type": "work",
                "ranking_type": "movies",
                "name": "雪线行动",
                "subtitle": "动作电影",
                "work_type": "movie",
                "tags": ["动作", "犯罪"],
                "genres": ["动作", "犯罪"],
                "platform_ids": [platform["院线"]],
                "description": "高海拔缉毒任务中的多线动作片。",
                "hero_facts": [("作品类型", "电影"), ("平台", "院线"), ("题材", "动作 / 犯罪")],
            },
            {
                "key": "work:changyejintou",
                "entity_type": "work",
                "ranking_type": "movies",
                "name": "长夜尽头",
                "subtitle": "悬疑电影",
                "work_type": "movie",
                "tags": ["悬疑", "口碑发酵"],
                "genres": ["悬疑", "剧情"],
                "platform_ids": [platform["院线"]],
                "description": "一场跨越二十年的悬疑案件终于迎来真相。",
                "hero_facts": [("作品类型", "电影"), ("平台", "院线"), ("题材", "悬疑 / 剧情")],
            },
            {
                "key": "work:nifenghechangtuan",
                "entity_type": "work",
                "ranking_type": "movies",
                "name": "逆风合唱团",
                "subtitle": "青春音乐电影",
                "work_type": "movie",
                "tags": ["青春", "音乐"],
                "genres": ["青春", "剧情"],
                "platform_ids": [platform["院线"]],
                "description": "讲述县城少年组建合唱团的热血故事。",
                "hero_facts": [("作品类型", "电影"), ("平台", "院线"), ("题材", "青春 / 剧情")],
            },
            {
                "key": "work:haishangjiumeng",
                "entity_type": "work",
                "ranking_type": "movies",
                "name": "海上旧梦",
                "subtitle": "文艺电影",
                "work_type": "movie",
                "tags": ["文艺", "爱情"],
                "genres": ["爱情", "剧情"],
                "platform_ids": [platform["院线"]],
                "description": "在港口城市展开的文艺爱情长片。",
                "hero_facts": [("作品类型", "电影"), ("平台", "院线"), ("题材", "爱情 / 剧情")],
            },
            {
                "key": "work:zhuiguangderen",
                "entity_type": "work",
                "ranking_type": "movies",
                "name": "追光的人",
                "subtitle": "现实主义电影",
                "work_type": "movie",
                "tags": ["现实", "励志"],
                "genres": ["剧情", "现实"],
                "platform_ids": [platform["院线"]],
                "description": "摄影师在西北追逐极光与人生答案。",
                "hero_facts": [("作品类型", "电影"), ("平台", "院线"), ("题材", "剧情 / 现实")],
            },
            {
                "key": "person:linche",
                "entity_type": "person",
                "ranking_type": "artists",
                "name": "林澈",
                "subtitle": "演员 / 歌手",
                "work_type": None,
                "tags": ["全能型", "社媒热度高"],
                "genres": ["剧情", "青春"],
                "platform_ids": [platform["腾讯视频"], platform["院线"]],
                "description": "近期开启电影与剧集双线曝光的青年演员。",
                "hero_facts": [("身份", "演员 / 歌手"), ("近期代表作", "雪线行动 / 苍穹之城"), ("主活跃平台", "腾讯视频 / 院线")],
            },
            {
                "key": "person:zhoulan",
                "entity_type": "person",
                "ranking_type": "artists",
                "name": "周岚",
                "subtitle": "演员",
                "work_type": None,
                "tags": ["口碑稳定", "悬疑赛道"],
                "genres": ["悬疑", "剧情"],
                "platform_ids": [platform["爱奇艺"], platform["院线"]],
                "description": "在悬疑题材中保持稳定口碑与热度。",
                "hero_facts": [("身份", "演员"), ("近期代表作", "雾港迷踪 / 长夜尽头"), ("主活跃平台", "爱奇艺 / 院线")],
            },
            {
                "key": "person:chenye",
                "entity_type": "person",
                "ranking_type": "artists",
                "name": "陈野",
                "subtitle": "演员",
                "work_type": None,
                "tags": ["动作赛道", "票房拉动"],
                "genres": ["动作", "犯罪"],
                "platform_ids": [platform["院线"]],
                "description": "在动作片赛道表现突出的男演员。",
                "hero_facts": [("身份", "演员"), ("近期代表作", "雪线行动"), ("主活跃平台", "院线")],
            },
            {
                "key": "person:suyao",
                "entity_type": "person",
                "ranking_type": "artists",
                "name": "苏遥",
                "subtitle": "演员",
                "work_type": None,
                "tags": ["古装适配", "女性受众高"],
                "genres": ["古装", "剧情"],
                "platform_ids": [platform["腾讯视频"], platform["爱奇艺"]],
                "description": "凭古装与现实题材双线作品提升热度。",
                "hero_facts": [("身份", "演员"), ("近期代表作", "星河归途"), ("主活跃平台", "腾讯视频 / 爱奇艺")],
            },
            {
                "key": "person:guming",
                "entity_type": "person",
                "ranking_type": "artists",
                "name": "顾鸣",
                "subtitle": "演员 / 导演",
                "work_type": None,
                "tags": ["跨界", "行业讨论度高"],
                "genres": ["剧情", "现实"],
                "platform_ids": [platform["芒果TV"], platform["院线"]],
                "description": "兼具演员与导演身份的创作者。",
                "hero_facts": [("身份", "演员 / 导演"), ("近期代表作", "北纬三十六度 / 追光的人"), ("主活跃平台", "芒果TV / 院线")],
            },
            {
                "key": "character:guqinghe",
                "entity_type": "character",
                "ranking_type": "characters",
                "name": "顾清禾",
                "subtitle": "苍穹之城",
                "work_type": None,
                "tags": ["高智角色", "讨论度高"],
                "genres": ["悬疑", "科幻"],
                "platform_ids": [platform["腾讯视频"]],
                "description": "《苍穹之城》中的女主角，带动大量话题讨论。",
                "hero_facts": [("所属作品", "苍穹之城"), ("角色定位", "核心主角"), ("热度来源", "剧情反转 / 角色成长")],
            },
            {
                "key": "character:linyao",
                "entity_type": "character",
                "ranking_type": "characters",
                "name": "林曜",
                "subtitle": "雾港迷踪",
                "work_type": None,
                "tags": ["灰色人物", "反差感"],
                "genres": ["悬疑", "都市"],
                "platform_ids": [platform["爱奇艺"]],
                "description": "《雾港迷踪》中的关键灰色人物。",
                "hero_facts": [("所属作品", "雾港迷踪"), ("角色定位", "关键嫌疑人"), ("热度来源", "人物反转")],
            },
            {
                "key": "character:xuzhixia",
                "entity_type": "character",
                "ranking_type": "characters",
                "name": "许知夏",
                "subtitle": "春夜列车",
                "work_type": None,
                "tags": ["成长线", "女性观众喜爱"],
                "genres": ["爱情", "剧情"],
                "platform_ids": [platform["优酷"]],
                "description": "《春夜列车》中的成长型角色。",
                "hero_facts": [("所属作品", "春夜列车"), ("角色定位", "成长主角"), ("热度来源", "情感线")],
            },
            {
                "key": "character:shenyan",
                "entity_type": "character",
                "ranking_type": "characters",
                "name": "沈砚",
                "subtitle": "星河归途",
                "work_type": None,
                "tags": ["古装权谋", "二创活跃"],
                "genres": ["古装", "剧情"],
                "platform_ids": [platform["腾讯视频"], platform["爱奇艺"]],
                "description": "《星河归途》中兼具家国与权谋线的角色。",
                "hero_facts": [("所属作品", "星河归途"), ("角色定位", "男主角"), ("热度来源", "人物弧光 / 名场面")],
            },
            {
                "key": "character:zhaonanxing",
                "entity_type": "character",
                "ranking_type": "characters",
                "name": "赵南星",
                "subtitle": "雪线行动",
                "work_type": None,
                "tags": ["动作担当", "高燃"],
                "genres": ["动作", "犯罪"],
                "platform_ids": [platform["院线"]],
                "description": "《雪线行动》中承担高燃动作场面的角色。",
                "hero_facts": [("所属作品", "雪线行动"), ("角色定位", "核心行动角色"), ("热度来源", "动作戏 / 短视频切片")],
            },
        ]
        rows: dict[UUID, EntityRecord] = {}
        updated_at = datetime(2026, 3, 31, 10, 0, tzinfo=UTC)
        for index, raw in enumerate(raw_entities, start=1):
            entity_id = stable_uuid(raw["key"])
            rows[entity_id] = EntityRecord(
                id=entity_id,
                entity_type=raw["entity_type"],
                ranking_type=raw["ranking_type"],
                name=raw["name"],
                subtitle=raw["subtitle"],
                work_type=raw["work_type"],
                avatar_url=f"https://assets.ssboard.local/{raw['key'].replace(':', '_')}.jpg",
                description=raw["description"],
                tags=raw["tags"],
                genres=raw["genres"],
                platform_ids=raw["platform_ids"],
                hero_facts=raw["hero_facts"],
                updated_at=updated_at + timedelta(minutes=index),
            )
        return self._attach_relationships(rows)

    def _attach_relationships(self, rows: dict[UUID, EntityRecord]) -> dict[UUID, EntityRecord]:
        mapping: dict[str, UUID] = {entity.name: entity.id for entity in rows.values()}

        def event(key: str, when: date, event_type: str, title: str, description: str, source_name: str) -> TimelineRecord:
            return TimelineRecord(id=stable_uuid(f"timeline:{key}:{when.isoformat()}:{title}"), event_date=when, event_type=event_type, title=title, description=description, source_name=source_name)

        updates: dict[UUID, EntityRecord] = {}
        updates[mapping["苍穹之城"]] = replace(
            rows[mapping["苍穹之城"]],
            related_groups={
                "演员阵容": [RelatedRecord(mapping["林澈"], "主演", "热度贡献", 36.2), RelatedRecord(mapping["苏遥"], "特别出演", "热度贡献", 24.8)],
                "核心角色": [RelatedRecord(mapping["顾清禾"], "角色", "讨论占比", 0.29)],
            },
            timeline=[
                event("cangqiong", date(2026, 3, 12), "announcement", "终极预告发布", "发布未来都市主线预告。", "公开宣发日历"),
                event("cangqiong", date(2026, 3, 20), "release", "开播", "剧集正式上线。", "公开宣发日历"),
                event("cangqiong", date(2026, 3, 29), "ranking_peak", "系列热榜峰值", "登顶剧集热榜。", "云合数据"),
            ],
        )
        updates[mapping["雾港迷踪"]] = replace(
            rows[mapping["雾港迷踪"]],
            related_groups={
                "演员阵容": [RelatedRecord(mapping["周岚"], "主演", "热度贡献", 31.4)],
                "核心角色": [RelatedRecord(mapping["林曜"], "角色", "讨论占比", 0.24)],
            },
            timeline=[
                event("wugang", date(2026, 3, 10), "announcement", "先导海报释出", "公布悬疑主视觉。", "公开宣发日历"),
                event("wugang", date(2026, 3, 18), "release", "剧集上线", "平台首播。", "云合数据"),
            ],
        )
        updates[mapping["春夜列车"]] = replace(
            rows[mapping["春夜列车"]],
            related_groups={"角色列表": [RelatedRecord(mapping["许知夏"], "主角", "讨论占比", 0.21)]},
            timeline=[event("chunye", date(2026, 3, 8), "release", "剧集开播", "平台首播。", "公开宣发日历")],
        )
        updates[mapping["北纬三十六度"]] = replace(
            rows[mapping["北纬三十六度"]],
            related_groups={"主创": [RelatedRecord(mapping["顾鸣"], "导演 / 主演", "讨论占比", 0.18)]},
            timeline=[event("beiwei", date(2026, 3, 5), "release", "剧集开播", "现实题材上线。", "公开宣发日历")],
        )
        updates[mapping["星河归途"]] = replace(
            rows[mapping["星河归途"]],
            related_groups={
                "演员阵容": [RelatedRecord(mapping["苏遥"], "主演", "热度贡献", 28.9)],
                "核心角色": [RelatedRecord(mapping["沈砚"], "角色", "讨论占比", 0.27)],
            },
            timeline=[event("xinghe", date(2026, 3, 22), "release", "剧集开播", "古装传奇上线。", "公开宣发日历")],
        )
        updates[mapping["雪线行动"]] = replace(
            rows[mapping["雪线行动"]],
            related_groups={
                "演员阵容": [RelatedRecord(mapping["林澈"], "主演", "票房带动", 42.0), RelatedRecord(mapping["陈野"], "主演", "票房带动", 38.4)],
                "核心角色": [RelatedRecord(mapping["赵南星"], "角色", "切片热度", 0.33)],
            },
            timeline=[
                event("xuexian", date(2026, 3, 14), "premiere", "首映礼", "主创出席首映。", "公开宣发日历"),
                event("xuexian", date(2026, 3, 21), "release", "全国上映", "院线正式上映。", "猫眼专业版"),
            ],
        )
        updates[mapping["长夜尽头"]] = replace(
            rows[mapping["长夜尽头"]],
            related_groups={"演员阵容": [RelatedRecord(mapping["周岚"], "主演", "口碑贡献", 35.2)]},
            timeline=[event("changye", date(2026, 3, 19), "release", "全国上映", "口碑场扩散。", "猫眼专业版")],
        )
        updates[mapping["逆风合唱团"]] = replace(
            rows[mapping["逆风合唱团"]],
            timeline=[event("nifeng", date(2026, 3, 11), "announcement", "主题曲发布", "主创释出主题曲。", "公开宣发日历")],
        )
        updates[mapping["海上旧梦"]] = replace(
            rows[mapping["海上旧梦"]],
            timeline=[event("haishang", date(2026, 3, 9), "premiere", "电影节展映", "口碑传播起量。", "公开宣发日历")],
        )
        updates[mapping["追光的人"]] = replace(
            rows[mapping["追光的人"]],
            related_groups={"主创": [RelatedRecord(mapping["顾鸣"], "导演 / 主演", "讨论占比", 0.22)]},
            timeline=[event("zhuiguang", date(2026, 3, 28), "award", "入围青年影展", "入围消息带来热度提升。", "公开宣发日历")],
        )
        updates[mapping["林澈"]] = replace(
            rows[mapping["林澈"]],
            related_groups={
                "代表作品": [RelatedRecord(mapping["雪线行动"], "主演作品", "当前得分", 92.1), RelatedRecord(mapping["苍穹之城"], "主演作品", "当前得分", 90.4)],
                "近期合作": [RelatedRecord(mapping["苏遥"], "合作艺人", "同框讨论度", 0.18)],
            },
            timeline=[event("linche", date(2026, 3, 23), "announcement", "品牌联动官宣", "社媒讨论提升。", "公开宣发日历")],
        )
        updates[mapping["周岚"]] = replace(
            rows[mapping["周岚"]],
            related_groups={
                "代表作品": [RelatedRecord(mapping["雾港迷踪"], "主演作品", "当前得分", 88.6), RelatedRecord(mapping["长夜尽头"], "主演作品", "当前得分", 86.7)],
            },
            timeline=[event("zhoulan", date(2026, 3, 24), "ranking_peak", "艺人榜进入 Top3", "口碑扩散带动排名提升。", "内部人工校对")],
        )
        updates[mapping["陈野"]] = replace(
            rows[mapping["陈野"]],
            related_groups={"代表作品": [RelatedRecord(mapping["雪线行动"], "主演作品", "当前得分", 92.1)]},
        )
        updates[mapping["苏遥"]] = replace(
            rows[mapping["苏遥"]],
            related_groups={
                "代表作品": [RelatedRecord(mapping["星河归途"], "主演作品", "当前得分", 85.4), RelatedRecord(mapping["苍穹之城"], "特别出演", "当前得分", 90.4)],
                "近期合作": [RelatedRecord(mapping["林澈"], "合作艺人", "同框讨论度", 0.18)],
            },
        )
        updates[mapping["顾鸣"]] = replace(
            rows[mapping["顾鸣"]],
            related_groups={
                "代表作品": [RelatedRecord(mapping["北纬三十六度"], "导演 / 主演", "当前得分", 77.6), RelatedRecord(mapping["追光的人"], "导演 / 主演", "当前得分", 73.5)],
            },
        )
        updates[mapping["顾清禾"]] = replace(
            rows[mapping["顾清禾"]],
            related_groups={
                "所属作品": [RelatedRecord(mapping["苍穹之城"], "角色所属", "当前得分", 90.4)],
                "饰演者": [RelatedRecord(mapping["苏遥"], "饰演者", "角色讨论占比", 0.29)],
            },
        )
        updates[mapping["林曜"]] = replace(
            rows[mapping["林曜"]],
            related_groups={
                "所属作品": [RelatedRecord(mapping["雾港迷踪"], "角色所属", "当前得分", 88.6)],
                "饰演者": [RelatedRecord(mapping["周岚"], "饰演者", "角色讨论占比", 0.24)],
            },
        )
        updates[mapping["许知夏"]] = replace(
            rows[mapping["许知夏"]],
            related_groups={"所属作品": [RelatedRecord(mapping["春夜列车"], "角色所属", "当前得分", 80.1)]},
        )
        updates[mapping["沈砚"]] = replace(
            rows[mapping["沈砚"]],
            related_groups={
                "所属作品": [RelatedRecord(mapping["星河归途"], "角色所属", "当前得分", 85.4)],
                "饰演者": [RelatedRecord(mapping["苏遥"], "关联艺人", "角色讨论占比", 0.27)],
            },
        )
        updates[mapping["赵南星"]] = replace(
            rows[mapping["赵南星"]],
            related_groups={
                "所属作品": [RelatedRecord(mapping["雪线行动"], "角色所属", "当前得分", 92.1)],
                "饰演者": [RelatedRecord(mapping["陈野"], "饰演者", "角色讨论占比", 0.33)],
            },
        )
        rows.update(updates)
        return rows

    def _build_metrics(self) -> dict[tuple[str, UUID, date], RankingMetricRecord]:
        params = {
            "苍穹之城": (81, 0.46, 3.0, 0.1, [0.24, 0.41, 0.17, 0.18]),
            "雾港迷踪": (79, 0.39, 2.4, 1.1, [0.18, 0.46, 0.2, 0.16]),
            "春夜列车": (72, 0.28, 1.9, 0.6, [0.14, 0.34, 0.23, 0.29]),
            "北纬三十六度": (68, 0.22, 1.4, 1.8, [0.08, 0.26, 0.31, 0.35]),
            "星河归途": (76, 0.33, 2.7, 2.2, [0.15, 0.43, 0.17, 0.25]),
            "雪线行动": (83, 0.5, 3.3, 0.4, [0.46, 0.21, 0.14, 0.19]),
            "长夜尽头": (78, 0.37, 2.8, 1.0, [0.39, 0.23, 0.21, 0.17]),
            "逆风合唱团": (70, 0.26, 1.8, 2.0, [0.31, 0.19, 0.22, 0.28]),
            "海上旧梦": (67, 0.19, 1.2, 2.5, [0.27, 0.18, 0.28, 0.27]),
            "追光的人": (65, 0.23, 1.5, 0.8, [0.21, 0.24, 0.22, 0.33]),
            "林澈": (85, 0.44, 2.9, 0.7, [0.22, 0.31, 0.16, 0.31]),
            "周岚": (81, 0.35, 2.1, 1.9, [0.17, 0.37, 0.18, 0.28]),
            "陈野": (76, 0.29, 1.8, 2.1, [0.34, 0.23, 0.16, 0.27]),
            "苏遥": (80, 0.41, 2.5, 1.3, [0.18, 0.36, 0.15, 0.31]),
            "顾鸣": (72, 0.24, 1.6, 0.2, [0.12, 0.22, 0.24, 0.42]),
            "顾清禾": (84, 0.46, 3.1, 0.9, [0.19, 0.39, 0.12, 0.3]),
            "林曜": (79, 0.32, 2.2, 1.4, [0.15, 0.42, 0.14, 0.29]),
            "许知夏": (71, 0.22, 1.6, 2.3, [0.13, 0.28, 0.22, 0.37]),
            "沈砚": (77, 0.36, 2.4, 0.4, [0.16, 0.41, 0.14, 0.29]),
            "赵南星": (75, 0.33, 2.6, 2.8, [0.33, 0.21, 0.11, 0.35]),
        }
        records: dict[tuple[str, UUID, date], RankingMetricRecord] = {}
        sources = list(self.sources.keys())
        entities_by_name = {entity.name: entity for entity in self.entities.values()}
        for entity_name, (base, slope, amplitude, phase, shares) in params.items():
            entity = entities_by_name[entity_name]
            previous_score = None
            for index, snapshot_date in enumerate(DATE_SERIES):
                raw_score = base + slope * index + amplitude * math.sin(index / 4 + phase)
                if snapshot_date >= LATEST_SNAPSHOT_DATE - timedelta(days=2):
                    raw_score += 1.8
                score = round(raw_score, 2)
                delta_value = round(score - previous_score, 2) if previous_score is not None else 0.0
                delta_percent = round((delta_value / previous_score) * 100, 2) if previous_score else 0.0
                source_metrics = {sources[idx]: round(score * share, 2) for idx, share in enumerate(shares)}
                records[(entity.ranking_type or "", entity.id, snapshot_date)] = RankingMetricRecord(
                    snapshot_date=snapshot_date,
                    ranking_type=entity.ranking_type or "",
                    entity_id=entity.id,
                    base_score=score,
                    delta_value=delta_value,
                    delta_percent=delta_percent,
                    source_metrics=source_metrics,
                )
                previous_score = score
        return records


repository = DemoDataRepository()
