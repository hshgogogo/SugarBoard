from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ssboard_api.api.dependencies import CommonFilters, get_home_service, shared_filters
from ssboard_api.api.responses import success_envelope
from ssboard_api.api.schemas import HomeOverviewResponse
from ssboard_api.services.home import HomeService

router = APIRouter(prefix='/api/v1/home', tags=['Home'])


@router.get('/overview', response_model=HomeOverviewResponse)
def get_home_overview(
    request: Request,
    filters: CommonFilters = Depends(shared_filters),
    service: HomeService = Depends(get_home_service),
):
    data, warnings = service.get_overview(filters.to_filter_set())
    return success_envelope(data=data, request=request, warnings=warnings)
