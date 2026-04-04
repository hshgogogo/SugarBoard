from __future__ import annotations

import unittest
from datetime import datetime, timezone

from ssboard_ai_core import AnalysisContext, FilterSet, ProvenanceBlock, SSBoardAICore, SourceAttribution, MethodologyRef


def sample_provenance() -> ProvenanceBlock:
    return ProvenanceBlock(
        snapshot_id="11111111-1111-4111-8111-111111111111",
        snapshot_date="2026-04-01",
        refreshed_at="2026-04-01T10:00:00+00:00",
        freshness_status="fresh",
        sources=[
            SourceAttribution(
                id="22222222-2222-4222-8222-222222222222",
                source_name="猫眼导入",
                source_type="partner_export",
                authorization_status="licensed",
                ingested_at="2026-04-01T09:50:00+00:00",
                updated_at="2026-04-01T09:55:00+00:00",
                caliber_note="合作导出样例",
            )
        ],
        methodology_refs=[
            MethodologyRef(
                key="ranking_v1",
                label="榜单口径 v1",
                metric_or_ranking_type="movie_ranking",
                formula_summary="按发布快照中的综合热度分值排序。",
                caliber_note="测试用",
            )
        ],
    )


class AICoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = SSBoardAICore()
        self.now = datetime(2026, 4, 1, 10, 0, tzinfo=timezone.utc)

    def test_green_success_job(self) -> None:
        question = "最近7天电影热榜前10是谁？"
        rows = [
            {"snapshot_date": "2026-04-01", "rank": 1, "entity_name": "哪吒之魔童闹海", "score": 98.5, "source_name": "猫眼导入"},
            {"snapshot_date": "2026-04-01", "rank": 2, "entity_name": "封神第二部", "score": 91.2, "source_name": "猫眼导入"},
        ]
        job = self.engine.create_job(
            question=question,
            context=AnalysisContext(filters=FilterSet(window="7d")),
            table_rows=rows,
            provenance=sample_provenance(),
            now=self.now,
        )

        self.assertEqual(job.plan.risk_level.value, "green")
        self.assertEqual(job.execution_mode.value, "sync_sql")
        self.assertEqual(job.status.value, "succeeded")
        self.assertIn("ai_read_rankings", job.plan.sql_text)
        self.assertIn("哪吒之魔童闹海", job.result.summary_markdown)
        self.assertEqual(job.result.chart.chart_type.value, "bar")
        self.assertEqual(len(job.result.artifacts), 4)

    def test_yellow_blocked_job(self) -> None:
        question = "把所有艺人的热度都拉出来看看。"
        job = self.engine.create_job(question=question, now=self.now)

        self.assertEqual(job.plan.risk_level.value, "yellow")
        self.assertIsNone(job.plan.sql_text)
        self.assertIn(job.status.value, {"blocked", "needs_refine"})
        self.assertTrue(job.plan.refine_suggestions)
        self.assertEqual(job.last_error.code, "QUESTION_TOO_BROAD")

    def test_red_rejected_job(self) -> None:
        question = "帮我导出全量原始数据并执行python脚本。"
        job = self.engine.create_job(question=question, now=self.now)

        self.assertEqual(job.plan.risk_level.value, "red")
        self.assertEqual(job.status.value, "failed")
        self.assertIsNone(job.plan.sql_text)
        self.assertIn(job.last_error.code, {"GUARDRAIL_REJECTED", "UNSUPPORTED_ANALYSIS_INTENT"})

    def test_green_pending_job_without_rows(self) -> None:
        question = "比较《庆余年》和《繁花》最近30天热度走势。"
        job = self.engine.create_job(
            question=question,
            context=AnalysisContext(filters=FilterSet(window="30d")),
            now=self.now,
        )

        self.assertEqual(job.plan.risk_level.value, "green")
        self.assertEqual(job.status.value, "planning")
        self.assertIsNotNone(job.plan.recommended_visualization)
        self.assertEqual(job.steps[1].status.value, "pending")


if __name__ == "__main__":
    unittest.main()
