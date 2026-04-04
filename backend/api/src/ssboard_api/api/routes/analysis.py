from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response

from ssboard_api.api.dependencies import get_analysis_service
from ssboard_api.api.responses import success_envelope
from ssboard_api.api.schemas import AnalysisJobData, AnalysisJobListData, AnalysisJobListResponse, AnalysisJobResponse, AnalysisRequest, AnalysisStatus
from ssboard_api.services.analysis import AnalysisService
from ssboard_api.services.common import pagination

router = APIRouter(prefix='/api/v1/analysis', tags=['Analysis'])


@router.get('/jobs', response_model=AnalysisJobListResponse)
def list_analysis_jobs(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: AnalysisStatus | None = Query(default=None),
    service: AnalysisService = Depends(get_analysis_service),
):
    items, total = service.list_jobs(page=page, page_size=page_size, status=status.value if status else None)
    return success_envelope(
        data=AnalysisJobListData(items=items),
        request=request,
        pagination=pagination(page, page_size, total),
    )


@router.post('/jobs', response_model=AnalysisJobResponse)
def create_analysis_job(
    payload: AnalysisRequest,
    request: Request,
    response: Response,
    service: AnalysisService = Depends(get_analysis_service),
):
    status_code, job = service.create_job(payload)
    response.status_code = status_code
    return success_envelope(data=AnalysisJobData(job=job), request=request)


@router.get('/jobs/{jobId}', response_model=AnalysisJobResponse)
def get_analysis_job(
    request: Request,
    jobId: UUID,
    service: AnalysisService = Depends(get_analysis_service),
):
    job = service.get_job(jobId)
    return success_envelope(data=AnalysisJobData(job=job), request=request)


@router.post('/jobs/{jobId}/cancel', response_model=AnalysisJobResponse)
def cancel_analysis_job(
    request: Request,
    response: Response,
    jobId: UUID,
    service: AnalysisService = Depends(get_analysis_service),
):
    response.status_code = 202
    job = service.cancel_job(jobId)
    return success_envelope(data=AnalysisJobData(job=job), request=request)
