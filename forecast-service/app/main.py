from fastapi import FastAPI

from app.api.routes import router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Energy Monitor Forecast Service",
        version="0.1.0",
        description="Bootstrap forecast service for the energy monitor demo",
    )
    app.include_router(router)
    return app


app = create_app()
