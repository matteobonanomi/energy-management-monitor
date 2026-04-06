import logging

from fastapi import FastAPI

from app.core.settings import get_settings
from app.api.routes import router


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
    app = FastAPI(
        title="Energy Monitor Forecast Service",
        version="0.1.0",
        description="Bootstrap forecast service for the energy monitor demo",
    )
    app.include_router(router)
    return app


app = create_app()
