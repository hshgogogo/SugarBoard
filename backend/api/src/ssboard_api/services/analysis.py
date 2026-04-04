from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID, uuid4

from ssboard_api.api.schemas import (
    AnalysisArtifact,
    AnalysisContext,
    AnalysisJob,
    AnalysisStatus,
    AnalysisJobData,
    AnalysisJobError,
    AnalysisJobSummary,
    AnalysisPlan,
    AnalysisProgress,
    AnalysisRequest,
    AnalysisResult,
    AnalysisStep,
    ArtifactType,
    ChartSpec,
    ExecutionMode,
    FilterSet,
    GuardrailSummary,
    IntentType,
    ProgressStep,
    RankingType,
    RiskLevel,
    StepName,
    StepStatus,
    TableColumn,
    TableDataType,
    TablePreview,
    Window,
)
from ssboard_api.core.errors import ApiException
from ssboard_api.repositories.demo_data import DemoDataRepository, RankedEntity, repository
from ssboard_api.repositories.job_store import InMemoryJobStore, StoredJob
from ssboard_api.services.ai_core_adapter import AICoreAdapter
from ssboard_api.services.common import RANKING_LABELS, TERMINAL_ANALYSIS_STATUSES, RankingSortBy, bar_chart, line_chart, normalize_filters

UTC = timezone.utc
TOP_N_PATTERN = re.compile(r'(?:top\s*|前)(\d{1,3})', re.IGNORECASE)
TITLE_PATTERN = re.compile(r'《([^》]+)》')


class AnalysisService:
    def __init__(self, repo: DemoDataRepository) -> None:
        self.repo = repo
        self.store = InMemoryJobStore()
        self.ai_core = AICoreAdapter()
        self._seed_jobs()

    def list_jobs(self, *, page: int, page_size: int, status: str | None = None) -> tuple[list[AnalysisJobSummary], int]:
        jobs = [self._refresh_if_needed(item).job for item in self.store.list()]
        if status is not None:
            jobs = [job for job in jobs if job.status.value == status]
        total = len(jobs)
        start = (page - 1) * page_size
        end = start + page_size
        items = [AnalysisJobSummary.model_validate(job.model_dump()) for job in jobs[start:end]]
        return items, total

    def recent_summaries(self, limit: int = 5) -> list[AnalysisJobSummary]:
        jobs = [self._refresh_if_needed(item).job for item in self.store.list()[:limit]]
        return [AnalysisJobSummary.model_validate(job.model_dump()) for job in jobs]

    def get_job(self, job_id: UUID) -> AnalysisJob:
        stored = self.store.get(job_id)
        if stored is None:
            raise ApiException(
                status_code=404,
                code='JOB_NOT_FOUND',
                message='Requested analysis job was not found.',
                hint='Use GET /api/v1/analysis/jobs to inspect recent jobs.',
                details={'job_id': str(job_id)},
            )
        return self._refresh_if_needed(stored).job

    def create_job(self, payload: AnalysisRequest) -> tuple[int, AnalysisJob]:
        question = payload.question.strip()
        context = payload.context or AnalysisContext()
        filters = normalize_filters(self.repo, context.filters, default_window=Window.d30, allow_as_of_fallback=True)
        context = AnalysisContext(filters=filters, ranking_type=context.ranking_type, entity_refs=context.entity_refs)
        provenance = self.repo.get_provenance(as_of=filters.as_of, source_ids=filters.source_ids, methodology_key='analysis')
        plan = self._plan(question, context, filters)
        now = self._utcnow()
        job_id = uuid4()

        if plan.risk_level == RiskLevel.red:
            job = self._build_job(question, context, filters, plan, None, provenance, job_id, now)
            self.store.upsert(StoredJob(job=job, created_at=now))
            raise ApiException(
                status_code=422,
                code=job.last_error.code if job.last_error else 'GUARDRAIL_REJECTED',
                message=job.status_message or 'The analysis request was rejected by guardrails.',
                hint='Keep the request read-only and scoped to SSBoard rankings, trends, or source comparisons.',
                details={'job_id': str(job.id), 'risk_level': job.risk_level.value, 'status': job.status.value},
            )

        if plan.risk_level == RiskLevel.yellow:
            job = self._build_job(question, context, filters, plan, None, provenance, job_id, now)
            self.store.upsert(StoredJob(job=job, created_at=now))
            return 200, job

        rows = self._materialize_rows(question, context, plan, filters)
        if plan.execution_mode == ExecutionMode.async_sql:
            initial = self._build_job(question, context, filters, plan, None, provenance, job_id, now)
            target = self._build_job(question, context, filters, plan, rows, provenance, job_id, now)
            self.store.upsert(StoredJob(job=initial, target_job=target, created_at=now))
            return 202, initial

        job = self._build_job(question, context, filters, plan, rows, provenance, job_id, now)
        self.store.upsert(StoredJob(job=job, created_at=now))
        return 200, job

    def cancel_job(self, job_id: UUID) -> AnalysisJob:
        stored = self.store.get(job_id)
        if stored is None:
            raise ApiException(
                status_code=404,
                code='JOB_NOT_FOUND',
                message='Requested analysis job was not found.',
                hint='Use GET /api/v1/analysis/jobs to inspect recent jobs.',
                details={'job_id': str(job_id)},
            )
        stored = self._refresh_if_needed(stored)
        if stored.job.status.value in TERMINAL_ANALYSIS_STATUSES:
            raise ApiException(
                status_code=409,
                code='JOB_NOT_CANCELLABLE',
                message='The analysis job is already in a terminal state.',
                hint='Only queued/planning/running/summarizing jobs can be cancelled.',
                details={'job_id': str(job_id), 'status': stored.job.status.value},
            )

        now = self._utcnow()
        updated = stored.job.model_copy(
            update={
                'status': AnalysisStatus.cancelled,
                'updated_at': now,
                'finished_at': now,
                'can_cancel': False,
                'status_message': '任务已取消，未再继续执行 SQL 或摘要生成。',
                'progress': AnalysisProgress(current_step=ProgressStep.running, percent=100, message='已取消'),
                'last_error': AnalysisJobError(code='CANCELLED_BY_USER', message='Job cancelled by user.', retryable=False, step='running'),
                'steps': self._cancelled_steps(stored.job.steps, now),
            }
        )
        stored.job = AnalysisJob.model_validate(updated.model_dump())
        stored.target_job = None
        self.store.upsert(stored)
        return stored.job

    def _plan(self, question: str, context: AnalysisContext, filters: FilterSet) -> AnalysisPlan:
        if self.ai_core.available:
            return self.ai_core.plan(question=question, context=context, filters=filters)
        return self._build_local_plan(question=question, context=context, filters=filters)

    def _build_job(
        self,
        question: str,
        context: AnalysisContext,
        filters: FilterSet,
        plan: AnalysisPlan,
        rows: list[dict] | None,
        provenance,
        job_id: UUID,
        now: datetime,
    ) -> AnalysisJob:
        if self.ai_core.available:
            return self.ai_core.create_job(
                question=question,
                context=context,
                filters=filters,
                table_rows=rows,
                provenance=provenance,
                job_id=job_id,
                now=now,
            )
        return self._build_local_job(question=question, context=context, plan=plan, rows=rows, provenance=provenance, job_id=job_id, now=now)

    def _build_local_plan(self, *, question: str, context: AnalysisContext, filters: FilterSet) -> AnalysisPlan:
        ranking_type = self._infer_ranking_type(question, context)
        intent = self._infer_intent(question, context)
        guardrails = GuardrailSummary(
            allowed_views=['ai_read_rankings', 'ai_read_entity_metrics', 'ai_read_release_events', 'ai_read_entity_relations'],
            row_limit=200,
            timeout_ms=8000 if intent in {IntentType.trend_explain, IntentType.entity_deep_dive, IntentType.source_compare, IntentType.anomaly_detection} else 4000,
            notes=['Only SELECT-style analytical access is allowed.', 'Yellow requests are never auto-executed.'],
        )
        preview = bar_chart(
            f'{RANKING_LABELS[ranking_type]}示意图',
            {item.entity.name: item.score for item in self.repo.ranked_entities(ranking_type=ranking_type, as_of=filters.as_of)[:5]},
            unit='热度分',
            note='将复用统一的图表规范。',
        )
        lower = question.lower()
        if any(token in lower for token in ['drop ', 'delete ', 'update ', 'insert ', 'python', 'shell', 'script', '脚本', '爬虫', '写回', '联网']):
            return AnalysisPlan(
                intent=intent,
                risk_level=RiskLevel.red,
                execution_mode=None,
                sql_text=None,
                sql_explanation='请求触发写入/脚本/越权语义，未生成 SQL。',
                guardrail_summary=guardrails,
                data_scope=filters,
                recommended_visualization=None,
                risk_reason='请求超出 SSBoard v1 只读分析边界。',
                refine_suggestions=['改为只读问题，例如最近 7 天电影热榜前十。'],
            )
        if any(token in question for token in ['整个市场', '全行业', '全部数据', '所有来源全部对比', '所有艺人', '所有电影', '所有剧集']):
            return AnalysisPlan(
                intent=intent,
                risk_level=RiskLevel.yellow,
                execution_mode=None,
                sql_text=None,
                sql_explanation='问题范围过宽，未生成 SQL。',
                guardrail_summary=guardrails,
                data_scope=filters,
                recommended_visualization=preview,
                risk_reason='问题过宽，建议缩小到单一榜单、时间窗或实体集合。',
                refine_suggestions=['限定榜单类型，例如电影榜或剧集榜。', '限定时间范围，例如最近 7 天或 30 天。'],
            )
        if len(question) < 8 or any(token in question for token in ['分析一下', '看看最近情况', '说说看', '总结最近']):
            return AnalysisPlan(
                intent=intent,
                risk_level=RiskLevel.yellow,
                execution_mode=None,
                sql_text=None,
                sql_explanation='问题缺少足够上下文，未生成 SQL。',
                guardrail_summary=guardrails,
                data_scope=filters,
                recommended_visualization=preview,
                risk_reason='问题仍然模糊，需要补充时间范围或对象。',
                refine_suggestions=['补充时间范围，例如最近 7 天。', '补充对象，例如电影、剧集、艺人或角色。'],
            )
        execution_mode = ExecutionMode.async_sql if intent in {IntentType.trend_explain, IntentType.entity_deep_dive, IntentType.source_compare, IntentType.anomaly_detection} else ExecutionMode.sync_sql
        ranking_sql = f"SELECT * FROM ai_read_rankings WHERE ranking_type = '{ranking_type.value}' AND snapshot_date = '{filters.as_of.isoformat()}'"
        sql_text = ranking_sql + ' ORDER BY score DESC LIMIT 50;'
        if intent in {IntentType.trend_explain, IntentType.entity_deep_dive, IntentType.anomaly_detection}:
            sql_text = (
                "SELECT snapshot_date, entity_name, metric_value, source_name FROM ai_read_entity_metrics "
                f"WHERE snapshot_date <= '{filters.as_of.isoformat()}' ORDER BY snapshot_date ASC LIMIT 200;"
            )
        elif intent == IntentType.source_compare:
            sql_text = ranking_sql + ' GROUP BY source_name ORDER BY score DESC LIMIT 50;'
        return AnalysisPlan(
            intent=intent,
            risk_level=RiskLevel.green,
            execution_mode=execution_mode,
            sql_text=sql_text,
            sql_explanation=f'从白名单视图读取 {RANKING_LABELS[ranking_type]} 的已发布快照，只做聚合与排序。',
            guardrail_summary=guardrails,
            data_scope=filters,
            recommended_visualization=preview,
            risk_reason='问题满足只读、白名单视图、范围受控的执行条件。',
            refine_suggestions=[],
        )

    def _build_local_job(
        self,
        *,
        question: str,
        context: AnalysisContext,
        plan: AnalysisPlan,
        rows: list[dict] | None,
        provenance,
        job_id: UUID,
        now: datetime,
    ) -> AnalysisJob:
        if plan.risk_level == RiskLevel.red:
            return AnalysisJob(
                id=job_id,
                question=question,
                status='failed',
                risk_level=plan.risk_level,
                execution_mode=None,
                created_at=now,
                updated_at=now,
                finished_at=now,
                can_cancel=False,
                context=context,
                plan=plan,
                status_message=plan.risk_reason,
                progress=AnalysisProgress(current_step=ProgressStep.planning, percent=100, message='已拒绝执行'),
                steps=[
                    AnalysisStep(name=StepName.planning, status=StepStatus.failed, started_at=now, finished_at=now, error_code='GUARDRAIL_REJECTED'),
                    AnalysisStep(name=StepName.sql_execution, status=StepStatus.skipped, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.chart_compilation, status=StepStatus.skipped, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.summary_generation, status=StepStatus.skipped, started_at=now, finished_at=now),
                ],
                last_error=AnalysisJobError(code='GUARDRAIL_REJECTED', message=plan.risk_reason, retryable=False, step='planning'),
                result=None,
            )
        if plan.risk_level == RiskLevel.yellow:
            status = 'blocked' if '过宽' in plan.risk_reason else 'needs_refine'
            code = 'QUESTION_TOO_BROAD' if status == 'blocked' else 'AMBIGUOUS_SCOPE'
            return AnalysisJob(
                id=job_id,
                question=question,
                status=status,
                risk_level=plan.risk_level,
                execution_mode=None,
                created_at=now,
                updated_at=now,
                finished_at=now,
                can_cancel=False,
                context=context,
                plan=plan,
                status_message=plan.risk_reason,
                progress=AnalysisProgress(current_step=ProgressStep.planning, percent=100, message='需要缩小问题范围'),
                steps=[
                    AnalysisStep(name=StepName.planning, status=StepStatus.succeeded, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.sql_execution, status=StepStatus.skipped, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.chart_compilation, status=StepStatus.skipped, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.summary_generation, status=StepStatus.skipped, started_at=now, finished_at=now),
                ],
                last_error=AnalysisJobError(code=code, message=plan.risk_reason, retryable=False, step='planning', details={'refine_suggestions': plan.refine_suggestions}),
                result=None,
            )
        if rows is None:
            return AnalysisJob(
                id=job_id,
                question=question,
                status='queued' if plan.execution_mode == ExecutionMode.async_sql else 'planning',
                risk_level=plan.risk_level,
                execution_mode=plan.execution_mode,
                created_at=now,
                updated_at=now,
                can_cancel=True,
                context=context,
                plan=plan,
                status_message='分析计划已生成，等待 SQL 执行。',
                progress=AnalysisProgress(current_step=ProgressStep.queued if plan.execution_mode == ExecutionMode.async_sql else ProgressStep.planning, percent=10, message='计划完成'),
                steps=[
                    AnalysisStep(name=StepName.planning, status=StepStatus.succeeded, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.sql_execution, status=StepStatus.pending, started_at=now),
                    AnalysisStep(name=StepName.chart_compilation, status=StepStatus.pending, started_at=now),
                    AnalysisStep(name=StepName.summary_generation, status=StepStatus.pending, started_at=now),
                ],
                result=None,
            )
        if not rows:
            return AnalysisJob(
                id=job_id,
                question=question,
                status='failed',
                risk_level=plan.risk_level,
                execution_mode=plan.execution_mode,
                created_at=now,
                updated_at=now,
                finished_at=now,
                can_cancel=False,
                context=context,
                plan=plan,
                status_message='当前筛选范围内没有可展示的数据。',
                progress=AnalysisProgress(current_step=ProgressStep.running, percent=100, message='查询完成但未命中数据'),
                steps=[
                    AnalysisStep(name=StepName.planning, status=StepStatus.succeeded, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.sql_execution, status=StepStatus.failed, started_at=now, finished_at=now, error_code='NO_DATA_IN_SCOPE'),
                    AnalysisStep(name=StepName.chart_compilation, status=StepStatus.skipped, started_at=now, finished_at=now),
                    AnalysisStep(name=StepName.summary_generation, status=StepStatus.skipped, started_at=now, finished_at=now),
                ],
                last_error=AnalysisJobError(code='NO_DATA_IN_SCOPE', message='当前筛选范围内没有可展示的数据。', retryable=False, step='sql_execution'),
                result=None,
            )

        chart = self._build_local_chart(plan.intent, question, rows)
        finished_at = self._utcnow()
        result = AnalysisResult(
            summary_markdown=self._build_local_summary(question, plan, rows),
            chart=chart,
            table_preview=self._table_preview(rows),
            artifacts=self._artifacts(),
            provenance=provenance,
        )
        return AnalysisJob(
            id=job_id,
            question=question,
            status='succeeded',
            risk_level=plan.risk_level,
            execution_mode=plan.execution_mode,
            created_at=now,
            updated_at=finished_at,
            finished_at=finished_at,
            execution_duration_ms=int((finished_at - now).total_seconds() * 1000),
            can_cancel=False,
            context=context,
            plan=plan,
            status_message='分析已完成，可在工作台内查看结果。',
            progress=AnalysisProgress(current_step=ProgressStep.summarizing, percent=100, message='已生成图表与摘要'),
            steps=[
                AnalysisStep(name=StepName.planning, status=StepStatus.succeeded, started_at=now, finished_at=now),
                AnalysisStep(name=StepName.sql_execution, status=StepStatus.succeeded, started_at=now, finished_at=finished_at),
                AnalysisStep(name=StepName.chart_compilation, status=StepStatus.succeeded, started_at=now, finished_at=finished_at),
                AnalysisStep(name=StepName.summary_generation, status=StepStatus.succeeded, started_at=now, finished_at=finished_at),
            ],
            result=result,
        )

    def _refresh_if_needed(self, stored: StoredJob) -> StoredJob:
        if stored.target_job is None or stored.job.status.value in TERMINAL_ANALYSIS_STATUSES:
            return stored
        now = self._utcnow()
        elapsed = (now - (stored.created_at or now)).total_seconds()
        if elapsed < 1.0:
            return stored
        if elapsed < 2.0:
            stored.job = stored.job.model_copy(
                update={
                    'status': AnalysisStatus.running,
                    'updated_at': now,
                    'status_message': '正在执行只读 SQL。',
                    'progress': AnalysisProgress(current_step=ProgressStep.running, percent=55, message='SQL 执行中'),
                    'steps': [
                        stored.job.steps[0],
                        AnalysisStep(name=StepName.sql_execution, status=StepStatus.running, started_at=stored.created_at or now),
                        AnalysisStep(name=StepName.chart_compilation, status=StepStatus.pending, started_at=stored.created_at or now),
                        AnalysisStep(name=StepName.summary_generation, status=StepStatus.pending, started_at=stored.created_at or now),
                    ],
                }
            )
            self.store.upsert(stored)
            return stored
        if elapsed < 3.0:
            stored.job = stored.job.model_copy(
                update={
                    'status': AnalysisStatus.summarizing,
                    'updated_at': now,
                    'status_message': '正在生成图表与摘要。',
                    'progress': AnalysisProgress(current_step=ProgressStep.summarizing, percent=85, message='结果编排中'),
                    'steps': [
                        stored.job.steps[0],
                        AnalysisStep(name=StepName.sql_execution, status=StepStatus.succeeded, started_at=stored.created_at or now, finished_at=now),
                        AnalysisStep(name=StepName.chart_compilation, status=StepStatus.succeeded, started_at=stored.created_at or now, finished_at=now),
                        AnalysisStep(name=StepName.summary_generation, status=StepStatus.running, started_at=stored.created_at or now),
                    ],
                }
            )
            self.store.upsert(stored)
            return stored
        duration_ms = int((now - (stored.created_at or now)).total_seconds() * 1000)
        final_job = stored.target_job.model_copy(update={'updated_at': now, 'finished_at': now, 'execution_duration_ms': duration_ms, 'can_cancel': False})
        stored.job = AnalysisJob.model_validate(final_job.model_dump())
        stored.target_job = None
        self.store.upsert(stored)
        return stored

    def _cancelled_steps(self, steps: list[AnalysisStep], now: datetime) -> list[AnalysisStep]:
        updated = []
        for step in steps:
            if step.status == StepStatus.succeeded:
                updated.append(step)
            elif step.status == StepStatus.running:
                updated.append(AnalysisStep(name=step.name, status=StepStatus.failed, started_at=step.started_at, finished_at=now, error_code='CANCELLED_BY_USER'))
            else:
                updated.append(AnalysisStep(name=step.name, status=StepStatus.skipped, started_at=step.started_at, finished_at=now))
        return updated

    def _materialize_rows(self, question: str, context: AnalysisContext, plan: AnalysisPlan, filters: FilterSet) -> list[dict]:
        ranking_type = self._infer_ranking_type(question, context)
        if plan.intent == IntentType.source_compare:
            ranked = self.repo.ranked_entities(
                ranking_type=ranking_type,
                as_of=filters.as_of,
                source_ids=filters.source_ids,
                platform_ids=filters.platform_ids,
                genres=filters.genres,
            )
            mapping = self.repo.source_distribution(ranked[:10])
            return [{'source_name': name, 'metric_value': value} for name, value in mapping.items()]

        if plan.intent == IntentType.trend_explain:
            rows = []
            entity_ids = self._resolve_entity_ids(question, context, ranking_type, filters)[:2]
            source_name = self._source_label(filters)
            for entity_id in entity_ids:
                entity = self.repo.get_entity(entity_id)
                series = self.repo.time_series(
                    entity_id=entity_id,
                    ranking_type=ranking_type,
                    as_of=filters.as_of,
                    window=filters.window,
                    source_ids=filters.source_ids,
                )
                rows.extend(
                    {'snapshot_date': snapshot_date.isoformat(), 'entity_name': entity.name, 'metric_value': value, 'source_name': source_name}
                    for snapshot_date, value in series
                )
            return rows

        if plan.intent == IntentType.entity_deep_dive:
            entity_ids = self._resolve_entity_ids(question, context, ranking_type, filters)[:1]
            if not entity_ids:
                return []
            entity = self.repo.get_entity(entity_ids[0])
            rows = []
            for records in entity.related_groups.values():
                for record in records:
                    related = self.repo.get_entity(record.entity_id)
                    rows.append(
                        {
                            'entity_name': related.name,
                            'metric_value': float(record.metric_value or 0.0),
                            'relation_label': record.relation_label,
                        }
                    )
            if rows:
                return rows
            return [
                {'snapshot_date': snapshot_date.isoformat(), 'entity_name': entity.name, 'metric_value': value, 'source_name': self._source_label(filters)}
                for snapshot_date, value in self.repo.time_series(entity_id=entity.id, ranking_type=ranking_type, as_of=filters.as_of, window=filters.window)
            ]

        if plan.intent == IntentType.anomaly_detection:
            ranked = self.repo.ranked_entities(
                ranking_type=ranking_type,
                as_of=filters.as_of,
                source_ids=filters.source_ids,
                platform_ids=filters.platform_ids,
                genres=filters.genres,
            )
            return [
                {
                    'entity_name': item.entity.name,
                    'metric_value': abs(item.delta_percent),
                    'delta_percent': item.delta_percent,
                    'rank': item.rank,
                }
                for item in sorted(ranked, key=lambda row: abs(row.delta_percent), reverse=True)[:5]
            ]

        ranked = self.repo.ranked_entities(
            ranking_type=ranking_type,
            as_of=filters.as_of,
            source_ids=filters.source_ids,
            platform_ids=filters.platform_ids,
            genres=filters.genres,
        )
        top_n = self._extract_top_n(question)
        return [
            {
                'rank': item.rank,
                'entity_name': item.entity.name,
                'score': item.score,
                'delta_value': item.delta_value,
                'delta_percent': item.delta_percent,
            }
            for item in ranked[:top_n]
        ]

    def _build_local_chart(self, intent: IntentType, question: str, rows: list[dict]) -> ChartSpec:
        if intent == IntentType.trend_explain:
            series_map: dict[str, list[tuple[str, float]]] = {}
            for row in rows:
                series_map.setdefault(str(row['entity_name']), []).append((str(row['snapshot_date']), float(row['metric_value'])))
            return line_chart(question, series_map, unit='热度分')
        if intent == IntentType.source_compare:
            return bar_chart(question, {str(row['source_name']): float(row['metric_value']) for row in rows}, unit='热度分')
        if intent in {IntentType.anomaly_detection, IntentType.entity_deep_dive}:
            return bar_chart(question, {str(row['entity_name']): float(row['metric_value']) for row in rows}, unit='指标值')
        return bar_chart(question, {str(row['entity_name']): float(row['score']) for row in rows}, unit='热度分')

    def _build_local_summary(self, question: str, plan: AnalysisPlan, rows: list[dict]) -> str:
        if not rows:
            return f'- 问题：{question}\n- 结果：当前筛选范围内没有命中数据。\n- 说明：请调整时间、来源或对象范围后重试。'
        first = rows[0]
        return (
            f'- 问题：{question}\n'
            f'- 风险等级：{plan.risk_level.value}，执行模式：{plan.execution_mode.value if plan.execution_mode else "none"}\n'
            f'- 核心发现：当前结果第一项为 **{first.get("entity_name", first.get("source_name", "未知对象"))}**。\n'
            f'- 返回行数：{len(rows)} 行，均来自已发布快照与白名单只读视图。'
        )

    def _table_preview(self, rows: list[dict]) -> TablePreview:
        if not rows:
            return TablePreview(columns=[], rows=[])
        columns = []
        for key, value in rows[0].items():
            if isinstance(value, int):
                dtype = TableDataType.integer
            elif isinstance(value, float):
                dtype = TableDataType.number
            elif isinstance(value, str) and len(value) == 10 and value[4:5] == '-' and value[7:8] == '-':
                dtype = TableDataType.date
            elif isinstance(value, str) and 'T' in value and ':' in value:
                dtype = TableDataType.datetime
            else:
                dtype = TableDataType.string
            columns.append(TableColumn(key=key, label=key, data_type=dtype))
        return TablePreview(columns=columns, rows=rows)

    def _artifacts(self) -> list[AnalysisArtifact]:
        now = self._utcnow()
        return [
            AnalysisArtifact(
                id=uuid4(),
                artifact_type=ArtifactType.chart,
                label='图表结果',
                mime_type='application/json',
                download_url=f'https://ssboard.local/artifacts/{uuid4()}',
                expires_at=now,
            ),
            AnalysisArtifact(
                id=uuid4(),
                artifact_type=ArtifactType.table_snapshot,
                label='表格预览',
                mime_type='application/json',
                download_url=f'https://ssboard.local/artifacts/{uuid4()}',
                expires_at=now,
            ),
            AnalysisArtifact(
                id=uuid4(),
                artifact_type=ArtifactType.sql_text,
                label='SQL 说明',
                mime_type='text/plain',
                download_url=f'https://ssboard.local/artifacts/{uuid4()}',
                expires_at=now,
            ),
            AnalysisArtifact(
                id=uuid4(),
                artifact_type=ArtifactType.summary_markdown,
                label='中文摘要',
                mime_type='text/markdown',
                download_url=f'https://ssboard.local/artifacts/{uuid4()}',
                expires_at=now,
            ),
        ]

    def _infer_intent(self, question: str, context: AnalysisContext) -> IntentType:
        if any(token in question for token in ['来源', '按来源', '平台分布', '分布', '组成']):
            return IntentType.source_compare
        if any(token in question for token in ['趋势', '走势', '最近30天', '最近7天', '近30天', '近7天']) and (context.entity_refs or TITLE_PATTERN.findall(question)):
            return IntentType.trend_explain
        if any(token in question for token in ['详情', '深挖', '关系', '合作', '关联', '为什么']):
            return IntentType.entity_deep_dive
        if any(token in question for token in ['波动', '涨幅', '变化最大', '异常']):
            return IntentType.anomaly_detection
        if any(token in question.lower() for token in ['top', '前十', 'top10', '热榜', '排名']) or self._infer_ranking_type(question, context):
            return IntentType.ranking_compare
        return IntentType.overview

    def _infer_ranking_type(self, question: str, context: AnalysisContext) -> RankingType:
        if context.ranking_type is not None:
            return context.ranking_type
        mapping = [('艺人', RankingType.artists), ('角色', RankingType.characters), ('剧集', RankingType.series), ('电视剧', RankingType.series), ('电影', RankingType.movies)]
        for token, ranking_type in mapping:
            if token in question:
                return ranking_type
        if context.entity_refs:
            entity = self.repo.entities.get(context.entity_refs[0].id)
            if entity and entity.ranking_type:
                return RankingType(entity.ranking_type)
        return RankingType.series

    def _resolve_entity_ids(self, question: str, context: AnalysisContext, ranking_type: RankingType, filters: FilterSet) -> list[UUID]:
        entity_ids: list[UUID] = []
        for entity_ref in context.entity_refs:
            if entity_ref.id in self.repo.entities:
                entity_ids.append(entity_ref.id)
        for title in TITLE_PATTERN.findall(question):
            for entity in self.repo.filter_entities(ranking_type=ranking_type, platform_ids=filters.platform_ids, genres=filters.genres):
                if entity.name == title and entity.id not in entity_ids:
                    entity_ids.append(entity.id)
        if entity_ids:
            return entity_ids
        ranked = self.repo.ranked_entities(
            ranking_type=ranking_type,
            as_of=filters.as_of,
            source_ids=filters.source_ids,
            platform_ids=filters.platform_ids,
            genres=filters.genres,
        )
        return [item.entity.id for item in ranked[:2]]

    def _extract_top_n(self, question: str) -> int:
        match = TOP_N_PATTERN.search(question)
        if match:
            return min(int(match.group(1)), 100)
        return 10 if any(token in question.lower() for token in ['前十', 'top10', 'top 10']) else 5

    def _source_label(self, filters: FilterSet) -> str:
        if len(filters.source_ids) == 1:
            return self.repo.sources[filters.source_ids[0]].source_name
        return '综合来源'

    def _utcnow(self) -> datetime:
        return datetime.now(UTC)

    def _seed_jobs(self) -> None:
        examples = [
            AnalysisRequest(question='最近一周电影热榜前十是谁？', context=AnalysisContext(filters=FilterSet(window=Window.d7))),
            AnalysisRequest(question='帮我分析一下整个市场', context=AnalysisContext(filters=FilterSet(window=Window.d30))),
            AnalysisRequest(question='对比《苍穹之城》《雾港迷踪》《星河归途》最近90天走势', context=AnalysisContext(filters=FilterSet(window=Window.d30), ranking_type=RankingType.series)),
        ]
        for payload in examples:
            try:
                self.create_job(payload)
            except ApiException:
                continue


analysis_service = AnalysisService(repository)
