from __future__ import annotations

import importlib
import os
import sys
from datetime import datetime
from pathlib import Path
from types import ModuleType
from uuid import UUID

from ssboard_api.api.schemas import AnalysisContext, AnalysisJob, AnalysisPlan, FilterSet, ProvenanceBlock


class AICoreAdapter:
    def __init__(self) -> None:
        self._package = self._load_package()
        self._models = importlib.import_module('ssboard_ai_core.models') if self._package else None
        self._engine = self._package.SSBoardAICore() if self._package else None

    @property
    def available(self) -> bool:
        return self._engine is not None and self._models is not None

    def plan(self, *, question: str, context: AnalysisContext, filters: FilterSet) -> AnalysisPlan:
        self._ensure_available()
        core_plan = self._engine.plan(question, self._to_core_context(context, filters))
        return AnalysisPlan.model_validate(core_plan.to_dict())

    def create_job(
        self,
        *,
        question: str,
        context: AnalysisContext,
        filters: FilterSet,
        table_rows: list[dict] | None,
        provenance: ProvenanceBlock,
        job_id: UUID,
        now: datetime,
    ) -> AnalysisJob:
        self._ensure_available()
        core_job = self._engine.create_job(
            question=question,
            context=self._to_core_context(context, filters),
            table_rows=table_rows,
            provenance=self._to_core_provenance(provenance),
            job_id=str(job_id),
            now=now,
        )
        return AnalysisJob.model_validate(core_job.to_dict())

    def _ensure_available(self) -> None:
        if not self.available:
            raise RuntimeError('ssboard_ai_core is not available')

    def _load_package(self) -> ModuleType | None:
        try:
            return importlib.import_module('ssboard_ai_core')
        except ImportError:
            pass

        repo_root = Path(__file__).resolve().parents[5]
        candidates = [
            os.getenv('SSBOARD_AI_CORE_SRC'),
            repo_root / 'packages' / 'ai-core' / 'src',
            repo_root.parent / 'ai-engineer' / 'packages' / 'ai-core' / 'src',
        ]
        for candidate in candidates:
            if not candidate:
                continue
            candidate_path = Path(candidate).resolve()
            if not candidate_path.exists():
                continue
            if str(candidate_path) not in sys.path:
                sys.path.insert(0, str(candidate_path))
            try:
                return importlib.import_module('ssboard_ai_core')
            except ImportError:
                continue
        return None

    def _to_core_context(self, context: AnalysisContext, filters: FilterSet):
        core_filter_set = self._models.FilterSet(
            as_of=filters.as_of.isoformat() if filters.as_of else None,
            window=filters.window.value if filters.window else None,
            source_ids=[str(item) for item in filters.source_ids],
            platform_ids=[str(item) for item in filters.platform_ids],
            genres=list(filters.genres),
        )
        entity_refs = [
            self._models.EntityReference(
                id=str(entity.id),
                entity_type=entity.entity_type.value,
                name=entity.name,
                subtitle=entity.subtitle,
                work_type=entity.work_type.value if entity.work_type else None,
                avatar_url=str(entity.avatar_url) if entity.avatar_url else None,
                tags=list(entity.tags),
            )
            for entity in context.entity_refs
        ]
        return self._models.AnalysisContext(
            filters=core_filter_set,
            ranking_type=context.ranking_type.value if context.ranking_type else None,
            entity_refs=entity_refs,
        )

    def _to_core_provenance(self, provenance: ProvenanceBlock):
        return self._models.ProvenanceBlock(
            snapshot_id=str(provenance.snapshot_id),
            snapshot_date=provenance.snapshot_date.isoformat(),
            refreshed_at=provenance.refreshed_at.isoformat(),
            freshness_status=provenance.freshness_status.value,
            sources=[
                self._models.SourceAttribution(
                    id=str(source.id),
                    source_name=source.source_name,
                    source_type=source.source_type.value,
                    authorization_status=source.authorization_status.value,
                    ingested_at=source.ingested_at.isoformat(),
                    updated_at=source.updated_at.isoformat(),
                    caliber_note=source.caliber_note,
                )
                for source in provenance.sources
            ],
            methodology_refs=[
                self._models.MethodologyRef(
                    key=ref.key,
                    label=ref.label,
                    metric_or_ranking_type=ref.metric_or_ranking_type,
                    formula_summary=ref.formula_summary,
                    caliber_note=ref.caliber_note,
                    notes=list(ref.notes),
                )
                for ref in provenance.methodology_refs
            ],
        )
