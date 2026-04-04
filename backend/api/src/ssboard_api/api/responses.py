from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import Request

from ssboard_api.api.schemas import ApiError, ApiWarning, ErrorResponse, PaginationMeta, ResponseMeta


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def build_meta(
    request_id: UUID,
    warnings: list[ApiWarning] | None = None,
    pagination: PaginationMeta | None = None,
) -> ResponseMeta:
    return ResponseMeta(
        request_id=request_id,
        generated_at=utcnow(),
        warnings=warnings or [],
        pagination=pagination,
    )


def success_envelope(
    *,
    data: Any,
    request: Request,
    warnings: list[ApiWarning] | None = None,
    pagination: PaginationMeta | None = None,
) -> dict[str, Any]:
    return {
        "data": data,
        "meta": build_meta(request.state.request_id, warnings=warnings, pagination=pagination),
    }


def error_envelope(
    *,
    request: Request,
    code: str,
    message: str,
    retryable: bool,
    hint: str | None = None,
    details: dict[str, Any] | None = None,
    warnings: list[ApiWarning] | None = None,
) -> ErrorResponse:
    return ErrorResponse(
        error=ApiError(
            code=code,
            message=message,
            retryable=retryable,
            hint=hint,
            details=details or {},
        ),
        meta=build_meta(request.state.request_id, warnings=warnings),
    )
