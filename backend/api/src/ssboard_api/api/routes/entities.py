from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from ssboard_api.api.dependencies import get_entity_detail_service
from ssboard_api.api.responses import success_envelope
from ssboard_api.api.schemas import EntityDetailResponse, EntityType, Window
from ssboard_api.services.entities import EntityDetailService

router = APIRouter(prefix='/api/v1/entities', tags=['Entities'])


@router.get('/{entityType}/{entityId}', response_model=EntityDetailResponse)
def get_entity_detail(
    request: Request,
    entityType: EntityType,
    entityId: UUID,
    as_of: date | None = Query(default=None),
    trend_window: Window = Query(default=Window.d30),
    service: EntityDetailService = Depends(get_entity_detail_service),
):
    data, warnings = service.get_entity_detail(
        entity_type=entityType,
        entity_id=entityId,
        as_of=as_of,
        trend_window=trend_window,
    )
    return success_envelope(data=data, request=request, warnings=warnings)
