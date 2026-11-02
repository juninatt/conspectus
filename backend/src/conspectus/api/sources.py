"""Lists the configured sources."""

from fastapi import APIRouter
from pydantic import BaseModel

from conspectus.api.dependencies import CatalogDep

router = APIRouter(tags=["sources"])


class SourceSummary(BaseModel):
    id: str
    name: str
    description: str | None
    format: str


@router.get("/sources")
def list_sources(catalog: CatalogDep) -> list[SourceSummary]:
    """List all configured sources, including ones that currently fail to read."""
    return [
        SourceSummary(
            id=source.id,
            name=source.name,
            description=source.description,
            format=source.format,
        )
        for source in catalog.sources
    ]
