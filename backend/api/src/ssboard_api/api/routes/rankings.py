from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from ssboard_api.api.dependencies import CommonFilters, get_ranking_service, ranking_filters
from ssboard_api.api.responses import success_envelope
from ssboard_api.api.schemas import RankingListResponse, RankingType
from ssboard_api.services.common import RankingSortBy, SortOrder
from ssboard_api.services.rankings import RankingService

router = APIRouter(prefix='/api/v1/rankings', tags=['Rankings'])


@router.get('/{rankingType}', response_model=RankingListResponse)
def get_ranking_page(
    request: Request,
    rankingType: RankingType,
    filters: CommonFilters = Depends(ranking_filters),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: RankingSortBy = Query(default=RankingSortBy.rank),
    sort_order: SortOrder = Query(default=SortOrder.asc),
    service: RankingService = Depends(get_ranking_service),
):
    data, warnings, pagination = service.get_ranking_page(
        ranking_type=rankingType,
        filters=filters.to_filter_set(),
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return success_envelope(data=data, request=request, warnings=warnings, pagination=pagination)
