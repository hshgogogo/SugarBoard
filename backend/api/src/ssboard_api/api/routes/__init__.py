from ssboard_api.api.routes.analysis import router as analysis_router
from ssboard_api.api.routes.bootstrap import router as bootstrap_router
from ssboard_api.api.routes.entities import router as entities_router
from ssboard_api.api.routes.home import router as home_router
from ssboard_api.api.routes.rankings import router as rankings_router

__all__ = [
    'analysis_router',
    'bootstrap_router',
    'entities_router',
    'home_router',
    'rankings_router',
]
