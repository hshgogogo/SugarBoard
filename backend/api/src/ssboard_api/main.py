from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ssboard_api import __version__
from ssboard_api.api.responses import error_envelope
from ssboard_api.api.routes import analysis_router, bootstrap_router, entities_router, home_router, rankings_router
from ssboard_api.core.errors import ApiException

app = FastAPI(
    title='SSBoard API',
    version=__version__,
    description='Contract-aligned FastAPI prototype backend for SSBoard v1.',
)
app.include_router(bootstrap_router)
app.include_router(home_router)
app.include_router(rankings_router)
app.include_router(entities_router)
app.include_router(analysis_router)


@app.middleware('http')
async def request_context_middleware(request: Request, call_next):
    request.state.request_id = uuid4()
    response = await call_next(request)
    response.headers['X-Request-ID'] = str(request.state.request_id)
    return response


@app.exception_handler(ApiException)
async def api_exception_handler(request: Request, exc: ApiException):
    payload = error_envelope(
        request=request,
        code=exc.code,
        message=exc.message,
        retryable=exc.retryable,
        hint=exc.hint,
        details=exc.details,
    )
    return JSONResponse(status_code=exc.status_code, content=jsonable_encoder(payload.model_dump(mode='json')))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    path_keys = {tuple(item.get('loc', ())) for item in errors}
    if ('path', 'rankingType') in path_keys:
        payload = error_envelope(
            request=request,
            code='RANKING_TYPE_NOT_FOUND',
            message='Requested ranking type is not supported.',
            retryable=False,
            hint='Use one of artists, characters, series, movies.',
            details={'errors': errors},
        )
        return JSONResponse(status_code=404, content=jsonable_encoder(payload.model_dump(mode='json')))
    if ('path', 'entityType') in path_keys:
        payload = error_envelope(
            request=request,
            code='ENTITY_TYPE_NOT_FOUND',
            message='Requested entity type is not supported.',
            retryable=False,
            hint='Use one of work, person, character.',
            details={'errors': errors},
        )
        return JSONResponse(status_code=404, content=jsonable_encoder(payload.model_dump(mode='json')))

    payload = error_envelope(
        request=request,
        code='INVALID_REQUEST',
        message='The request payload or query parameters are invalid.',
        retryable=False,
        hint='Check the API contract for required fields, enum values, and UUID/date formats.',
        details={'errors': errors},
    )
    return JSONResponse(status_code=400, content=jsonable_encoder(payload.model_dump(mode='json')))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    payload = error_envelope(
        request=request,
        code='INTERNAL_ERROR',
        message='An unexpected server-side error occurred.',
        retryable=False,
        details={'exception_type': exc.__class__.__name__},
    )
    return JSONResponse(status_code=500, content=jsonable_encoder(payload.model_dump(mode='json')))


@app.get('/healthz')
def healthcheck():
    return {'status': 'ok', 'service': 'ssboard-api', 'version': __version__}
