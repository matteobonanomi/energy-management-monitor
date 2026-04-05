from fastapi import APIRouter

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.events import router as events_router
from app.api.routes.forecasts import router as forecasts_router
from app.api.routes.health import router as health_router
from app.api.routes.metadata import router as metadata_router

router = APIRouter()
router.include_router(health_router)
router.include_router(metadata_router)
router.include_router(dashboard_router)
router.include_router(forecasts_router)
router.include_router(events_router)
