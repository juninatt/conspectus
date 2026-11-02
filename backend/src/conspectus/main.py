"""Application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version

from fastapi import FastAPI

from conspectus.api import datasets, health, sources
from conspectus.catalog import Catalog
from conspectus.config import ConfigError, Settings, load_sources


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the FastAPI application with all routers registered.

    Sources are loaded when the application starts, so an invalid
    configuration stops it with an error instead of failing later.
    """

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        config_path = (settings or Settings()).sources
        if not config_path.is_file():
            raise ConfigError(
                f"Source configuration not found: {config_path}. Copy "
                "sources.example.yaml to sources.yaml or set CONSPECTUS_SOURCES."
            )
        app.state.catalog = Catalog(load_sources(config_path))
        yield

    app = FastAPI(
        title="Conspectus",
        summary="Tabular data from configurable sources, served over HTTP.",
        version=version("conspectus"),
        lifespan=lifespan,
    )
    app.include_router(health.router)
    app.include_router(sources.router)
    app.include_router(datasets.router)
    return app


app = create_app()
