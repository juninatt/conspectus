"""Reader for tabular JSON: a list of flat objects, one object per row."""

import json
from pathlib import Path
from typing import cast

from conspectus.models import ColumnType, Dataset
from conspectus.readers.base import ReaderError
from conspectus.readers.builder import build_dataset
from conspectus.readers.inference import Scalar

type Record = dict[str, Scalar]


class JsonReader:
    def __init__(
        self, path: Path, column_types: dict[str, ColumnType] | None = None
    ) -> None:
        """Read `path`; `column_types` overrides the inferred type per column."""
        self._path = path
        self._column_types = column_types or {}

    def watched_paths(self) -> list[Path]:
        return [self._path]

    def read(self) -> Dataset:
        records = self._load()

        # Columns are every key found in any row, in order of first appearance.
        names = dict.fromkeys(key for record in records for key in record)
        values_by_name = {
            name: [record.get(name) for record in records] for name in names
        }
        return build_dataset(self._path, values_by_name, self._column_types)

    def _load(self) -> list[Record]:
        try:
            text = self._path.read_text(encoding="utf-8")
        except OSError as error:
            raise ReaderError(f"Cannot read {self._path}: {error.strerror}") from error

        try:
            data = json.loads(text, parse_constant=_reject_constant)
        except json.JSONDecodeError as error:
            raise ReaderError(
                f"Invalid JSON in {self._path} at line {error.lineno}, "
                f"column {error.colno}: {error.msg}"
            ) from error

        if not isinstance(data, list):
            raise ReaderError(
                f"{self._path}: expected a list of objects, got {type(data).__name__}"
            )
        for number, record in enumerate(data, start=1):
            if not isinstance(record, dict):
                raise ReaderError(
                    f"{self._path}, row {number}: expected an object, "
                    f"got {type(record).__name__}"
                )
            for key, value in record.items():
                if isinstance(value, dict | list):
                    raise ReaderError(
                        f"{self._path}, row {number}, column '{key}': "
                        "nested values are not supported"
                    )
        return cast(list[Record], data)


def _reject_constant(name: str) -> None:
    raise ReaderError(f"{name} is not valid JSON")
