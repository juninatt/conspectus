"""Serves the data of a source."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from conspectus.api.dependencies import CatalogDep
from conspectus.catalog import UnknownSourceError
from conspectus.models import Column, Value
from conspectus.readers import ReaderError

router = APIRouter(tags=["datasets"])


class DatasetResponse(BaseModel):
    id: str
    name: str
    columns: list[Column]
    rows: list[dict[str, Value]]
    total_rows: int


@router.get(
    "/datasets/{source_id}",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "No source with this id"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "description": "The source exists but cannot be read"
        },
    },
)
def get_dataset(
    source_id: str,
    catalog: CatalogDep,
    limit: Annotated[
        int | None, Query(ge=0, description="Maximum rows to return; all if omitted")
    ] = None,
    offset: Annotated[int, Query(ge=0, description="Rows to skip")] = 0,
) -> DatasetResponse:
    """Return the columns and rows of a source; `total_rows` counts all rows."""
    try:
        source = catalog.source(source_id)
        dataset = catalog.dataset(source_id)
    except UnknownSourceError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No source with id '{source_id}'. Ids are derived from source "
            "names, so renaming a source changes its id.",
        ) from None
    except ReaderError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from None

    end = None if limit is None else offset + limit
    return DatasetResponse(
        id=source.id,
        name=source.name,
        columns=dataset.columns,
        rows=dataset.rows[offset:end],
        total_rows=len(dataset.rows),
    )
