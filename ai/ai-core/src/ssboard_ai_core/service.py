from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from .charts import build_chart
from .models import (
    AnalysisArtifact,
    AnalysisContext,
    AnalysisJob,
    AnalysisJobError,
    AnalysisPlan,
    AnalysisProgress,
    AnalysisResult,
    AnalysisStep,
    ExecutionMode,
    JobStatus,
    MethodologyRef,
    ProvenanceBlock,
    SourceAttribution,
    StepName,
    StepStatus,
    TablePreview,
)
from .planner import AnalysisPlanner
from .risk import RiskAssessment
from .summary import build_summary


class SSBoardAICore:
    def __init__(self, planner: AnalysisPlanner | None = None) -> None:
        self.planner = planner or AnalysisPlanner()

    def plan(self, question: str, context: AnalysisContext | None = None) -> AnalysisPlan:
        plan, _, _ = self.planner.plan(question, context)
        return plan

    def create_job(
        self,
        question: str,
        context: AnalysisContext | None = None,
        table_rows: list[dict] | TablePreview | None = None,
        provenance: ProvenanceBlock | None = None,
        job_id: str | None = None,
        now: datetime | None = None,
    ) -> AnalysisJob:
        plan, normalized, assessment = self.planner.plan(question, context)
        job_id = job_id or str(uuid4())
        now = now or datetime.now(timezone.utc)
        created_at = now.isoformat()
        provenance = provenance or default_provenance()

        if assessment.risk_level.value == "red":
            return self._build_rejected_job(job_id, question, context, plan, assessment, created_at)

        if assessment.risk_level.value == "yellow":
            return self._build_blocked_job(job_id, question, context, plan, assessment, created_at)

        if table_rows is None:
            return self._build_pending_green_job(job_id, question, context, plan, created_at)

        preview = table_rows if isinstance(table_rows, TablePreview) else TablePreview.from_rows(table_rows)
        if not preview.rows:
            return self._build_no_data_job(job_id, question, context, plan, created_at)

        chart = build_chart(plan.intent, question, preview)
        summary = build_summary(question, plan, preview, provenance)
        result = AnalysisResult(
            summary_markdown=summary,
            chart=chart,
            table_preview=preview,
            artifacts=_build_success_artifacts(),
            provenance=provenance,
        )

        finished_at = datetime.now(timezone.utc).isoformat()
        return AnalysisJob(
            id=job_id,
            question=question,
            status=JobStatus.SUCCEEDED,
            risk_level=plan.risk_level,
            execution_mode=plan.execution_mode,
            created_at=created_at,
            updated_at=finished_at,
            finished_at=finished_at,
            execution_duration_ms=0,
            can_cancel=False,
            context=context,
            plan=plan,
            status_message="分析已完成，可在工作台内查看结果。",
            progress=AnalysisProgress(current_step="summarizing", percent=100, message="已生成图表与摘要"),
            steps=[
                AnalysisStep(StepName.PLANNING, StepStatus.SUCCEEDED, created_at, finished_at),
                AnalysisStep(StepName.SQL_EXECUTION, StepStatus.SUCCEEDED, created_at, finished_at),
                AnalysisStep(StepName.CHART_COMPILATION, StepStatus.SUCCEEDED, created_at, finished_at),
                AnalysisStep(StepName.SUMMARY_GENERATION, StepStatus.SUCCEEDED, created_at, finished_at),
            ],
            result=result,
        )

    def _build_pending_green_job(
        self,
        job_id: str,
        question: str,
        context: AnalysisContext | None,
        plan: AnalysisPlan,
        created_at: str,
    ) -> AnalysisJob:
        status = JobStatus.QUEUED if plan.execution_mode == ExecutionMode.ASYNC_SQL else JobStatus.PLANNING
        progress_step = "queued" if status == JobStatus.QUEUED else "planning"
        progress_percent = 10 if status == JobStatus.QUEUED else 25
        return AnalysisJob(
            id=job_id,
            question=question,
            status=status,
            risk_level=plan.risk_level,
            execution_mode=plan.execution_mode,
            created_at=created_at,
            updated_at=created_at,
            can_cancel=True,
            context=context,
            plan=plan,
            status_message="分析计划已生成，等待 SQL 执行。",
            progress=AnalysisProgress(current_step=progress_step, percent=progress_percent, message="计划完成"),
            steps=[
                AnalysisStep(StepName.PLANNING, StepStatus.SUCCEEDED, created_at, created_at),
                AnalysisStep(StepName.SQL_EXECUTION, StepStatus.PENDING, created_at),
                AnalysisStep(StepName.CHART_COMPILATION, StepStatus.PENDING, created_at),
                AnalysisStep(StepName.SUMMARY_GENERATION, StepStatus.PENDING, created_at),
            ],
            result=None,
        )

    def _build_blocked_job(
        self,
        job_id: str,
        question: str,
        context: AnalysisContext | None,
        plan: AnalysisPlan,
        assessment: RiskAssessment,
        created_at: str,
    ) -> AnalysisJob:
        return AnalysisJob(
            id=job_id,
            question=question,
            status=assessment.terminal_status or JobStatus.NEEDS_REFINE,
            risk_level=plan.risk_level,
            execution_mode=None,
            created_at=created_at,
            updated_at=created_at,
            finished_at=created_at,
            can_cancel=False,
            context=context,
            plan=plan,
            status_message=assessment.reason,
            progress=AnalysisProgress(current_step="planning", percent=100, message="需要缩小问题范围"),
            steps=[
                AnalysisStep(StepName.PLANNING, StepStatus.SUCCEEDED, created_at, created_at),
                AnalysisStep(StepName.SQL_EXECUTION, StepStatus.SKIPPED, created_at, created_at),
                AnalysisStep(StepName.CHART_COMPILATION, StepStatus.SKIPPED, created_at, created_at),
                AnalysisStep(StepName.SUMMARY_GENERATION, StepStatus.SKIPPED, created_at, created_at),
            ],
            result=None,
            last_error=AnalysisJobError(
                code="QUESTION_TOO_BROAD" if assessment.terminal_status == JobStatus.BLOCKED else "AMBIGUOUS_SCOPE",
                message=assessment.reason,
                retryable=False,
                step="planning",
                details={"refine_suggestions": plan.refine_suggestions},
            ),
        )

    def _build_rejected_job(
        self,
        job_id: str,
        question: str,
        context: AnalysisContext | None,
        plan: AnalysisPlan,
        assessment: RiskAssessment,
        created_at: str,
    ) -> AnalysisJob:
        return AnalysisJob(
            id=job_id,
            question=question,
            status=JobStatus.FAILED,
            risk_level=plan.risk_level,
            execution_mode=None,
            created_at=created_at,
            updated_at=created_at,
            finished_at=created_at,
            can_cancel=False,
            context=context,
            plan=plan,
            status_message=assessment.reason,
            progress=AnalysisProgress(current_step="planning", percent=100, message="已拒绝执行"),
            steps=[
                AnalysisStep(StepName.PLANNING, StepStatus.FAILED, created_at, created_at, assessment.error_code),
                AnalysisStep(StepName.SQL_EXECUTION, StepStatus.SKIPPED, created_at, created_at),
                AnalysisStep(StepName.CHART_COMPILATION, StepStatus.SKIPPED, created_at, created_at),
                AnalysisStep(StepName.SUMMARY_GENERATION, StepStatus.SKIPPED, created_at, created_at),
            ],
            result=None,
            last_error=AnalysisJobError(
                code=assessment.error_code or "GUARDRAIL_REJECTED",
                message=assessment.reason,
                retryable=False,
                step="planning",
            ),
        )

    def _build_no_data_job(
        self,
        job_id: str,
        question: str,
        context: AnalysisContext | None,
        plan: AnalysisPlan,
        created_at: str,
    ) -> AnalysisJob:
        return AnalysisJob(
            id=job_id,
            question=question,
            status=JobStatus.FAILED,
            risk_level=plan.risk_level,
            execution_mode=plan.execution_mode,
            created_at=created_at,
            updated_at=created_at,
            finished_at=created_at,
            can_cancel=False,
            context=context,
            plan=plan,
            status_message="当前筛选范围内没有可展示的数据。",
            progress=AnalysisProgress(current_step="running", percent=100, message="查询完成但未命中数据"),
            steps=[
                AnalysisStep(StepName.PLANNING, StepStatus.SUCCEEDED, created_at, created_at),
                AnalysisStep(StepName.SQL_EXECUTION, StepStatus.FAILED, created_at, created_at, "NO_DATA_IN_SCOPE"),
                AnalysisStep(StepName.CHART_COMPILATION, StepStatus.SKIPPED, created_at, created_at),
                AnalysisStep(StepName.SUMMARY_GENERATION, StepStatus.SKIPPED, created_at, created_at),
            ],
            result=None,
            last_error=AnalysisJobError(
                code="NO_DATA_IN_SCOPE",
                message="当前筛选范围内没有可展示的数据。",
                retryable=False,
                step="sql_execution",
            ),
        )


def _build_success_artifacts() -> list[AnalysisArtifact]:
    return [
        AnalysisArtifact(artifact_type="chart", label="图表结果", mime_type="application/json"),
        AnalysisArtifact(artifact_type="table_snapshot", label="表格预览", mime_type="application/json"),
        AnalysisArtifact(artifact_type="sql_text", label="SQL 说明", mime_type="text/plain"),
        AnalysisArtifact(artifact_type="summary_markdown", label="中文摘要", mime_type="text/markdown"),
    ]


def default_provenance() -> ProvenanceBlock:
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()
    return ProvenanceBlock(
        snapshot_id=str(uuid4()),
        snapshot_date=today,
        refreshed_at=now,
        freshness_status="fresh",
        sources=[
            SourceAttribution(
                id=str(uuid4()),
                source_name="SSBoard Published Snapshot",
                source_type="internal_manual",
                authorization_status="internal_manual",
                ingested_at=now,
                updated_at=now,
                caliber_note="开发期默认示例来源。",
            )
        ],
        methodology_refs=[
            MethodologyRef(
                key="default_heat_score",
                label="默认热度口径",
                metric_or_ranking_type="heat_score",
                formula_summary="基于已发布快照中的综合热度分值进行只读分析。",
                caliber_note="仅用于 v1 工作台示例。",
            )
        ],
    )
