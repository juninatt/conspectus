"""Shared request dependencies."""

from typing import Annotated, cast

from fastapi import Depends, Request

from conspectus.catalog import Catalog


def get_catalog(request: Request) -> Catalog:
    return cast(Catalog, request.app.state.catalog)


CatalogDep = Annotated[Catalog, Depends(get_catalog)]
