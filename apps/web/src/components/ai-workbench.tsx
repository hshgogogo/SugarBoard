'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  createAnalysisJob,
  cancelAnalysisJob,
  getAnalysisJob,
  listAnalysisJobs,
} from '@/lib/mock-api';
import type {
  AnalysisJob,
  AnalysisJobSummary,
  AnalysisStatus,
  FilterBootstrapData,
} from '@/lib/api-contract';
import {
  getAnalysisStatusLabel,
  getRiskLabel,
  getRiskTone,
  getStatusTone,
} from '@/lib/display';
import { formatDateTime } from '@/lib/query';
import {
  Badge,
  ChartCard,
  PageTitle,
  ProvenanceCard,
  SectionTitle,
  StateCard,
  Surface,
} from '@/components/ui-kit';

const STATUS_FILTERS: Array<{ key: 'all' | AnalysisStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'queued', label: '排队中' },
  { key: 'running', label: '执行中' },
  { key: 'blocked', label: '已阻断' },
  { key: 'needs_refine', label: '需收敛' },
  { key: 'failed', label: '失败' },
  { key: 'cancelled', label: '已取消' },
];

const TERMINAL_STATUSES: AnalysisStatus[] = [
  'succeeded',
  'failed',
  'blocked',
  'needs_refine',
  'cancelled',
];

export function AiWorkbench({
  initialBootstrap,
  initialJobs,
}: {
  initialBootstrap: FilterBootstrapData;
  initialJobs: AnalysisJobSummary[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedId, setSelectedId] = useState<string | null>(initialJobs[0]?.id ?? null);
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);
  const [question, setQuestion] = useState(initialBootstrap.recommended_questions[0]?.question ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | AnalysisStatus>('all');
  const [jobsLoading, setJobsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    return statusFilter === 'all' ? jobs : jobs.filter((job) => job.status === statusFilter);
  }, [jobs, statusFilter]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedId(null);
      setSelectedJob(null);
      return;
    }

    if (!selectedId || !filteredJobs.some((job) => job.id === selectedId)) {
      setSelectedId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      if (!selectedId) {
        setSelectedJob(null);
        return;
      }

      setDetailLoading(true);
      setErrorMessage(null);
      try {
        const response = await getAnalysisJob(selectedId);
        if (!cancelled) {
          setSelectedJob(response?.data.job ?? null);
        }
      } catch {
        if (!cancelled) setErrorMessage('任务详情加载失败，请稍后刷新。');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    void loadJob();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedJob || TERMINAL_STATUSES.includes(selectedJob.status)) return;

    const timer = window.setTimeout(async () => {
      const [listResponse, detailResponse] = await Promise.all([
        listAnalysisJobs({ page: 1, pageSize: 20 }),
        getAnalysisJob(selectedJob.id),
      ]);
      setJobs(listResponse.data.items);
      if (detailResponse?.data.job) {
        setSelectedJob(detailResponse.data.job);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [selectedJob]);

  async function refreshJobs() {
    setJobsLoading(true);
    setErrorMessage(null);
    try {
      const response = await listAnalysisJobs({ page: 1, pageSize: 20 });
      setJobs(response.data.items);
    } catch {
      setErrorMessage('任务列表刷新失败，请稍后重试。');
    } finally {
      setJobsLoading(false);
    }
  }

  async function handleSubmit(nextQuestion?: string) {
    const finalQuestion = (nextQuestion ?? question).trim();
    if (!finalQuestion) return;

    setSubmitting(true);
    setErrorMessage(null);
    setStatusFilter('all');

    try {
      const response = await createAnalysisJob({
        question: finalQuestion,
        context: {
          filters: initialBootstrap.default_filters,
        },
      });
      setQuestion(finalQuestion);
      await refreshJobs();
      setSelectedId(response.data.job.id);
      setSelectedJob(response.data.job);
    } catch {
      setErrorMessage('提交失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(jobId: string) {
    setErrorMessage(null);
    try {
      const response = await cancelAnalysisJob(jobId);
      await refreshJobs();
      if (response?.data.job) {
        setSelectedJob(response.data.job);
      }
    } catch {
      setErrorMessage('取消失败，请稍后重试。');
    }
  }

  function jumpToExample(status: AnalysisStatus) {
    const target = jobs.find((job) => job.status === status);
    if (!target) return;
    setStatusFilter('all');
    setSelectedId(target.id);
  }

  return (
    <section className="page-stack">
      <PageTitle
        eyebrow="AI Workbench"
        title="AI 查询工作台"
        description="围绕白名单视图、SQL 解释、风险分级和任务状态流，先把执行与阻断状态都可视化。"
        actions={
          <button type="button" className="button ghost" onClick={() => void refreshJobs()} disabled={jobsLoading}>
            {jobsLoading ? '刷新中…' : '刷新任务'}
          </button>
        }
      />

      {errorMessage ? <StateCard title="操作提示" description={errorMessage} tone="warning" /> : null}

      <div className="split-layout ai-layout">
        <div className="left-rail stack-gap">
          <Surface>
            <SectionTitle title="提问输入与推荐模板" subtitle="默认附带首页共享筛选上下文；v1 仅执行只读分析。" />
            <div className="stack-gap compact-gap">
              <textarea
                className="question-input"
                rows={5}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：比较两部剧过去 30 天的热度走势，并总结差异原因。"
              />
              <div className="button-row wrap">
                <button type="button" className="button primary" onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting ? '提交中…' : '发起分析'}
                </button>
                <button type="button" className="button ghost" onClick={() => jumpToExample('blocked')}>
                  查看阻断样例
                </button>
                <button type="button" className="button ghost" onClick={() => jumpToExample('needs_refine')}>
                  查看限缩样例
                </button>
                <button type="button" className="button ghost" onClick={() => jumpToExample('failed')}>
                  查看失败样例
                </button>
              </div>
            </div>

            <div className="recommended-grid">
              {initialBootstrap.recommended_questions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="question-chip"
                  onClick={() => {
                    setQuestion(item.question);
                    void handleSubmit(item.question);
                  }}
                >
                  <strong>{item.label}</strong>
                  <span>{item.question}</span>
                </button>
              ))}
            </div>
          </Surface>

          <Surface>
            <SectionTitle title="任务列表" subtitle="通过状态筛选可快速验证 empty / blocked / failed / cancelled 视图。" />
            <div className="filter-chip-row">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={['filter-chip', statusFilter === filter.key ? 'active' : ''].join(' ')}
                  onClick={() => setStatusFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {!filteredJobs.length ? (
              <StateCard
                title="当前筛选下暂无任务"
                description="这个空态用于尽早验证 AI 工作台的 empty 反馈。你可以切回“全部”，或先取消一条运行中任务再查看“已取消”。"
                tone="neutral"
              />
            ) : (
              <div className="stack-list compact-list">
                {filteredJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className={['job-row', selectedId === job.id ? 'active' : ''].join(' ')}
                    onClick={() => setSelectedId(job.id)}
                  >
                    <div>
                      <div className="inline-meta wrap">
                        <Badge tone={getStatusTone(job.status)}>{getAnalysisStatusLabel(job.status)}</Badge>
                        <Badge tone={getRiskTone(job.risk_level)}>{getRiskLabel(job.risk_level)}</Badge>
                      </div>
                      <strong>{job.question}</strong>
                      <p className="muted-copy">{job.status_message ?? '查看任务详情、步骤和结果产物。'}</p>
                    </div>
                    <span className="tiny-meta">{formatDateTime(job.updated_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </Surface>
        </div>

        <div className="content-column stack-gap">
          {detailLoading ? <StateCard title="加载中" description="正在拉取任务执行详情与结果产物。" tone="info" /> : null}

          {!selectedJob && !detailLoading ? (
            <StateCard title="选择一条任务" description="左侧任务列表会展示成功、失败、blocked 与 needs_refine 的代表状态。" tone="neutral" />
          ) : null}

          {selectedJob ? (
            <>
              <Surface>
                <SectionTitle
                  title="执行逻辑与风险分级"
                  subtitle="问题理解、SQL 说明、风险等级与数据范围都在同一个任务详情中返回。"
                  action={
                    selectedJob.can_cancel ? (
                      <button type="button" className="button ghost" onClick={() => void handleCancel(selectedJob.id)}>
                        取消任务
                      </button>
                    ) : null
                  }
                />
                <div className="inline-meta wrap">
                  <Badge tone={getStatusTone(selectedJob.status)}>{getAnalysisStatusLabel(selectedJob.status)}</Badge>
                  <Badge tone={getRiskTone(selectedJob.risk_level)}>{getRiskLabel(selectedJob.risk_level)}</Badge>
                  <Badge tone="neutral">{selectedJob.execution_mode ?? 'no-run'}</Badge>
                </div>
                <div className="detail-grid two-up narrow-gap">
                  <div className="detail-card">
                    <p className="muted-label">SQL / 查询解释</p>
                    <p>{selectedJob.plan?.sql_explanation ?? '待规划阶段完成后生成。'}</p>
                  </div>
                  <div className="detail-card">
                    <p className="muted-label">风险原因</p>
                    <p>{selectedJob.plan?.risk_reason ?? '尚未返回风险解释。'}</p>
                  </div>
                  <div className="detail-card">
                    <p className="muted-label">数据范围</p>
                    <p>
                      快照 {selectedJob.plan?.data_scope.as_of ?? 'latest'} / 窗口 {selectedJob.plan?.data_scope.window ?? '30d'} /
                      来源 {selectedJob.plan?.data_scope.source_ids.length ?? 0} / 平台 {selectedJob.plan?.data_scope.platform_ids.length ?? 0}
                    </p>
                  </div>
                  <div className="detail-card">
                    <p className="muted-label">最近更新</p>
                    <p>{formatDateTime(selectedJob.updated_at)}</p>
                  </div>
                </div>

                {selectedJob.progress ? (
                  <div className="progress-card">
                    <div className="inline-meta space-between">
                      <strong>{selectedJob.progress.message ?? '正在执行任务'}</strong>
                      <span>{selectedJob.progress.percent}%</span>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${selectedJob.progress.percent}%` }} />
                    </div>
                  </div>
                ) : null}

                {selectedJob.status === 'blocked' || selectedJob.status === 'needs_refine' ? (
                  <StateCard
                    title={selectedJob.status === 'blocked' ? '请求已阻断' : '问题需要收敛'}
                    description={selectedJob.status_message ?? '当前问题不满足 v1 白名单执行条件。'}
                    tone={selectedJob.status === 'blocked' ? 'danger' : 'warning'}
                    actions={
                      selectedJob.plan?.refine_suggestions?.length ? (
                        <ul className="tiny-list">
                          {selectedJob.plan.refine_suggestions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null
                    }
                  />
                ) : null}

                {selectedJob.last_error ? (
                  <StateCard
                    title={`执行失败：${selectedJob.last_error.code}`}
                    description={selectedJob.last_error.message}
                    tone="danger"
                    actions={
                      <p className="tiny-meta">
                        retryable: {selectedJob.last_error.retryable ? 'yes' : 'no'} / step:{' '}
                        {selectedJob.last_error.step ?? 'unknown'}
                      </p>
                    }
                  />
                ) : null}
              </Surface>

              {selectedJob.result ? (
                <>
                  <ChartCard chart={selectedJob.result.chart} />

                  <Surface>
                    <SectionTitle title="结果表格预览" subtitle="表格预览与图表都来自归一化 contract，不在前端拼 SQL。" />
                    <div className="result-table-wrapper">
                      <table className="result-table">
                        <thead>
                          <tr>
                            {selectedJob.result.table_preview.columns.map((column) => (
                              <th key={column.key}>{column.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedJob.result.table_preview.rows.map((row, index) => (
                            <tr key={`${selectedJob.id}-${index}`}>
                              {selectedJob.result?.table_preview.columns.map((column) => (
                                <td key={column.key}>{String(row[column.key] ?? '—')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Surface>

                  <Surface>
                    <SectionTitle title="中文摘要" subtitle="工作台内直接返回结论、洞察与下一步建议。" />
                    <ul className="summary-list">
                      {selectedJob.result.summary_markdown
                        .split('\n')
                        .map((line) => line.replace(/^[-*]\s*/, '').trim())
                        .filter(Boolean)
                        .map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                    </ul>
                  </Surface>

                  <ProvenanceCard provenance={selectedJob.result.provenance} compact />
                </>
              ) : selectedJob.plan?.recommended_visualization ? (
                <ChartCard chart={selectedJob.plan.recommended_visualization} />
              ) : null}

              <Surface>
                <SectionTitle title="执行步骤" subtitle="便于尽早验证 planning / running / summarizing / failed 的状态切换。" />
                <div className="stack-list compact-list">
                  {selectedJob.steps.map((step) => (
                    <div key={step.name} className="list-row separated">
                      <div>
                        <div className="inline-meta wrap">
                          <Badge tone={step.status === 'succeeded' ? 'success' : step.status === 'failed' ? 'danger' : step.status === 'running' ? 'info' : 'neutral'}>
                            {step.status}
                          </Badge>
                          <strong>{step.name}</strong>
                        </div>
                        <p className="tiny-meta">
                          started {formatDateTime(step.started_at)} / finished{' '}
                          {step.finished_at ? formatDateTime(step.finished_at) : '—'}
                        </p>
                      </div>
                      {step.error_code ? <span className="tiny-meta">{step.error_code}</span> : null}
                    </div>
                  ))}
                </div>
              </Surface>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
