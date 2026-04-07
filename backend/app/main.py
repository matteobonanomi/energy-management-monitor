"""Application bootstrap for the FastAPI backend.

This module keeps app wiring in one place so runtime concerns such as
logging, middleware, CORS, and route registration stay consistent across
local runs and tests.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.api.routes import router
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.settings import get_settings

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Emit lifecycle events from a single hook for consistent observability."""
    settings = get_settings()
    logger.info(
        "application_starting",
        app_name=settings.app_name,
        app_env=settings.app_env,
        mongo_enabled=settings.mongo_enabled,
    )
    yield
    logger.info("application_stopping", app_name=settings.app_name)


def create_app() -> FastAPI:
    """Build the FastAPI application with shared runtime configuration."""
    settings = get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(
        title="Energy Monitor API",
        version="0.1.0",
        description="Bootstrap API for the energy monitor demo",
        lifespan=lifespan,
    )
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list(),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
