'use client';

import { useEffect, useState } from 'react';
import type {
  AnalysisJob,
  AnalysisJobSummary,
  FilterBootstrapData,
  FilterSet,
} from '@/lib/api-contract';
import {
  cancelAnalysisJob,
  createAnalysisJob,
  getAnalysisJob,
  listAnalysisJobs,
} from '@/lib/mock-api';
import {
  AnalysisPlanCard,
  AnalysisResultCard,
  EmptyState,
  JobStatusList,
  SectionHeading,
  StatusPill,
} from '@/components/ui';

const RUNNING_STATUSES = new Set(['queued', 'planning', 'running', 'summarizing']);

export function AnalysisWorkbench({
  bootstrap,
  filters,
  initialJobs,
}: {
  bootstrap: FilterBootstrapData;
  filters: FilterSet;
  initialJobs: AnalysisJobSummary[];
}) {
  const [question, setQuestion] = useState(bootstrap.recommended_questions[0]?.question ?? '');
  const [jobs, setJobs] = useState<AnalysisJobSummary[]>(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(initialJobs[0]?.id);
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedJobId) return;
    let cancelled = false;
    void getAnalysisJob(selectedJobId).then((response) => {
      if (!cancelled && response) {
        setSelectedJob(response.data.job);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedJobId]);

  useEffect(() => {
    if (!jobs.some((job) => RUNNING_STATUSES.has(job.status))) return;
    const timer = window.setInterval(async () => {
      const response = await listAnalysisJobs({ pageSize: 8 });
      setJobs(response.data.items);
      if (selectedJobId) {
        const detail = await getAnalysisJob(selectedJobId);
        if (detail) setSelectedJob(detail.data.job);
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [jobs, selectedJobId]);

  async function handleSubmit() {
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      const response = await createAnalysisJob({
        question,
        context: { filters },
      });
      setSelectedJob(response.data.job);
      setSelectedJobId(response.data.job.id);
      const refreshed = await listAnalysisJobs({ pageSize: 8 });
      setJobs(refreshed.data.items);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!selectedJob?.can_cancel) return;
    const response = await cancelAnalysisJob(selectedJob.id);
    if (!response) return;
    setSelectedJob(response.data.job);
    const refreshed = await listAnalysisJobs({ pageSize: 8 });
    setJobs(refreshed.data.items);
  }

  return (
    <div className="stack">
      <section className="surface-card stack">
        <SectionHeading
          eyebrow="Prompt"
          title="自然语言提问"
          description="当前版本只支持白名单视图上的只读分析。Yellow 先给限缩建议，Red 直接拒绝。"
          aside={<StatusPill tone="green" label="read-only" />}
        />
        <textarea
          className="textarea"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="例如：最近 7 天电影热榜前十有哪些对象波动最大？"
          value={question}
        />
        <div className="filter-chip-group">
          {bootstrap.recommended_questions.map((item) => (
            <button
              key={item.id}
              className="chip chip--question"
              onClick={() => setQuestion(item.question)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <p className="muted">
            当前上下文会沿用页面筛选：{filters.window ?? '30d'} / 来源 {filters.source_ids.length || '全部'} / 平台{' '}
            {filters.platform_ids.length || '全部'}
          </p>
          <button className="button-solid" disabled={submitting} onClick={handleSubmit} type="button">
            {submitting ? '提交中...' : '发起分析'}
          </button>
        </div>
      </section>
      <section className="job-grid">
        <article className="surface-card stack">
          <SectionHeading
            eyebrow="History"
            title="最近任务"
            description="任务状态必须可观测，便于 QA 核对异步状态流转。"
          />
          <JobStatusList jobs={jobs} onSelect={setSelectedJobId} selectedId={selectedJobId} />
        </article>
        {selectedJob ? (
          <div className="stack">
            <article className="job-card stack">
              <div className="job-card__header">
                <div>
                  <strong>{selectedJob.question}</strong>
                  <p className="card-subtitle">{selectedJob.status_message ?? '任务详情'}</p>
                </div>
                <div className="split-inline">
                  <StatusPill tone={selectedJob.risk_level} label={selectedJob.risk_level} />
                  <StatusPill
                    tone={RUNNING_STATUSES.has(selectedJob.status) ? 'yellow' : selectedJob.status === 'succeeded' ? 'green' : selectedJob.status === 'failed' ? 'red' : 'neutral'}
                    label={selectedJob.status}
                  />
                </div>
              </div>
              {selectedJob.progress ? (
                <div className="stack">
                  <div className="progress-bar">
                    <span style={{ width: `${selectedJob.progress.percent}%` }} />
                  </div>
                  <span className="muted">{selectedJob.progress.message}</span>
                </div>
              ) : null}
              {selectedJob.can_cancel ? (
                <button className="button-ghost" onClick={handleCancel} type="button">
                  取消任务
                </button>
              ) : null}
              {selectedJob.last_error ? (
                <div className="empty-card">
                  <strong>{selectedJob.last_error.code}</strong>
                  <p>{selectedJob.last_error.message}</p>
                </div>
              ) : null}
            </article>
            {selectedJob.plan ? <AnalysisPlanCard plan={selectedJob.plan} /> : null}
            {selectedJob.result ? (
              <AnalysisResultCard result={selectedJob.result} />
            ) : (
              <EmptyState
                title="当前还没有结果产物"
                description="同步路径会直接返回图表和摘要，异步路径会在任务推进后展示结果。"
              />
            )}
          </div>
        ) : (
          <EmptyState
            title="请选择一个任务"
            description="点击左侧历史任务可查看计划、风险等级、图表、摘要和来源追溯信息。"
          />
        )}
      </section>
    </div>
  );
}
