from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, Request

from ssboard_api.api.dependencies import get_bootstrap_service
from ssboard_api.api.responses import success_envelope
from ssboard_api.api.schemas import FilterBootstrapResponse
from ssboard_api.services.bootstrap import BootstrapService

router = APIRouter(prefix='/api/v1/bootstrap', tags=['Bootstrap'])


@router.get('/filters', response_model=FilterBootstrapResponse)
def get_bootstrap_filters(
    request: Request,
    as_of: date | None = Query(default=None),
    service: BootstrapService = Depends(get_bootstrap_service),
):
    data, warnings = service.get_filters(as_of=as_of)
    return success_envelope(data=data, request=request, warnings=warnings)
