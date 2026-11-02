"""Loading and validating the source configuration (sources.yaml).

Each source gets an id derived from its name, used in URLs and – later – in
saved dashboards. Renaming a source therefore changes its id: links and
references to the old id stop working.
"""

import re
import unicodedata
from pathlib import Path
from typing import Annotated, Any, Literal, Self

import yaml
from pydantic import (
    BaseModel,
    ConfigDict,
    Discriminator,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)
from pydantic_core import ErrorDetails

from conspectus.models import ColumnType


class ConfigError(Exception):
    """The source configuration is missing, malformed or invalid."""


def source_id(name: str) -> str:
    """Derive a URL-safe id from a name: 'Weather stations' → 'weather-stations'."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


class _BaseSource(BaseModel):
    """Fields shared by every source; each format adds its own."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str
    description: str | None = None
    path: Path
    columns: dict[str, ColumnType] = Field(default_factory=dict)

    @property
    def id(self) -> str:
        return source_id(self.name)

    @field_validator("name")
    @classmethod
    def _name_gives_id(cls, name: str) -> str:
        if not source_id(name):
            raise ValueError("must contain at least one letter or digit")
        return name


class JsonSource(_BaseSource):
    format: Literal["json"]


class SqliteSource(_BaseSource):
    format: Literal["sqlite"]
    table: str | None = None
    query: str | None = None

    @model_validator(mode="after")
    def _table_or_query(self) -> Self:
        if (self.table is None) == (self.query is None):
            raise ValueError("set exactly one of 'table' and 'query'")
        return self


# `format` decides which model – and so which fields – apply to a source.
type Source = Annotated[JsonSource | SqliteSource, Discriminator("format")]


class _SourcesFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sources: list[Source]

    @model_validator(mode="after")
    def _ids_are_unique(self) -> Self:
        names_by_id: dict[str, str] = {}
        for source in self.sources:
            if source.id in names_by_id:
                raise ValueError(
                    f"sources '{names_by_id[source.id]}' and '{source.name}' "
                    f"both get the id '{source.id}'; rename one of them"
                )
            names_by_id[source.id] = source.name
        return self


def load_sources(path: Path) -> list[Source]:
    """Load sources from `path`; relative data paths are resolved from its folder."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as error:
        raise ConfigError(
            f"Cannot read source configuration {path}: {error.strerror}"
        ) from error

    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as error:
        raise ConfigError(f"Invalid YAML in {path}: {error}") from error
    if not isinstance(data, dict):
        raise ConfigError(f"{path}: expected a mapping with a 'sources' list")

    try:
        parsed = _SourcesFile.model_validate(data)
    except ValidationError as error:
        details = "\n".join(_describe(issue, data) for issue in error.errors())
        raise ConfigError(
            f"Invalid source configuration in {path}:\n{details}"
        ) from None

    folder = path.parent
    return [
        source.model_copy(update={"path": _resolve(source.path, folder)})
        for source in parsed.sources
    ]


def _resolve(path: Path, folder: Path) -> Path:
    path = path.expanduser()
    return path if path.is_absolute() else (folder / path).resolve()


def _describe(issue: ErrorDetails, data: dict[str, Any]) -> str:
    """Describe an issue, e.g. "source 2 ('Weather'), path: Field required"."""
    location = list(issue["loc"])
    message = str(issue["msg"]).removeprefix("Value error, ")
    parts: list[str] = []
    if len(location) > 1 and location[0] == "sources" and isinstance(location[1], int):
        index = location[1]
        entry = data["sources"][index]
        name = entry.get("name") if isinstance(entry, dict) else None
        parts.append(f"source {index + 1}" + (f" ('{name}')" if name else ""))
        location = location[2:]
        # Issues inside a format-specific model start with the format name.
        if location and isinstance(entry, dict) and location[0] == entry.get("format"):
            location = location[1:]
    if location:
        parts.append(".".join(str(part) for part in location))
    return f"  - {', '.join(parts)}: {message}" if parts else f"  - {message}"
