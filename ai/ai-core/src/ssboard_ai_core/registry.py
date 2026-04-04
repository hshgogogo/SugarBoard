from __future__ import annotations

from dataclasses import dataclass

from .models import Intent

DEFAULT_ROW_LIMIT = 50
SYNC_TIMEOUT_MS = 4_000
ASYNC_TIMEOUT_MS = 8_000
MAX_GREEN_ROWS = 200


@dataclass(frozen=True)
class WhitelistView:
    name: str
    description: str
    supported_intents: tuple[Intent, ...]


WHITELIST_VIEWS = {
    "ai_read_rankings": WhitelistView(
        name="ai_read_rankings",
        description="Published ranking facts for artists / characters / series / movies.",
        supported_intents=(Intent.OVERVIEW, Intent.RANKING_COMPARE, Intent.SOURCE_COMPARE),
    ),
    "ai_read_entity_metrics": WhitelistView(
        name="ai_read_entity_metrics",
        description="Published entity metric time series and score trends.",
        supported_intents=(Intent.TREND_EXPLAIN, Intent.ENTITY_DEEP_DIVE, Intent.SOURCE_COMPARE),
    ),
    "ai_read_release_events": WhitelistView(
        name="ai_read_release_events",
        description="Published release and public event timeline for works.",
        supported_intents=(Intent.ENTITY_DEEP_DIVE,),
    ),
    "ai_read_entity_relations": WhitelistView(
        name="ai_read_entity_relations",
        description="Published entity-to-entity relation edges for workbench drill-down summaries.",
        supported_intents=(Intent.ENTITY_DEEP_DIVE,),
    ),
}


INTENT_TO_VIEWS = {
    Intent.OVERVIEW: ["ai_read_rankings"],
    Intent.RANKING_COMPARE: ["ai_read_rankings"],
    Intent.TREND_EXPLAIN: ["ai_read_entity_metrics"],
    Intent.ENTITY_DEEP_DIVE: ["ai_read_entity_metrics", "ai_read_entity_relations"],
    Intent.SOURCE_COMPARE: ["ai_read_rankings"],
    Intent.ANOMALY_DETECTION: ["ai_read_entity_metrics"],
    Intent.CUSTOM_READONLY_SQL: ["ai_read_rankings"],
}


def allowed_views_for_intent(intent: Intent) -> list[str]:
    return list(INTENT_TO_VIEWS.get(intent, []))
