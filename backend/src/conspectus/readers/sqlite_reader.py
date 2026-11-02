"""Reader for SQLite databases: a whole table or the result of a query."""

import sqlite3
from contextlib import closing
from pathlib import Path

from conspectus.models import ColumnType, Dataset
from conspectus.readers.base import ReaderError
from conspectus.readers.builder import build_dataset
from conspectus.readers.inference import Scalar

# Declared column types specific enough to trust. SQLite stores booleans as
# 0/1 and dates as text, so without these hints they would be inferred as
# integers and strings. Other declared types are left to inference, since
# SQLite does not enforce them.
_TYPE_HINTS = {
    "BOOLEAN": ColumnType.BOOLEAN,
    "BOOL": ColumnType.BOOLEAN,
    "DATE": ColumnType.DATE,
    "DATETIME": ColumnType.DATETIME,
    "TIMESTAMP": ColumnType.DATETIME,
}


class SqliteReader:
    def __init__(
        self,
        path: Path,
        *,
        table: str | None = None,
        query: str | None = None,
        column_types: dict[str, ColumnType] | None = None,
    ) -> None:
        """Read `table` or the result of `query` (exactly one) from `path`."""
        if (table is None) == (query is None):
            raise ValueError("exactly one of table and query must be given")
        self._path = path
        self._table = table
        self._query = query
        self._column_types = column_types or {}

    def watched_paths(self) -> list[Path]:
        # In WAL mode new rows land in the -wal file first; the database file
        # itself may not change until much later.
        return [self._path, self._path.with_name(self._path.name + "-wal")]

    def read(self) -> Dataset:
        if not self._path.is_file():
            raise ReaderError(f"Cannot read {self._path}: file not found")

        # Read-only: SQLite itself rejects any statement that would write,
        # whatever the configured query contains.
        uri = f"{self._path.resolve().as_uri()}?mode=ro"
        try:
            with closing(sqlite3.connect(uri, uri=True)) as connection:
                cursor = connection.execute(self._sql())
                if cursor.description is None:
                    raise ReaderError(f"{self._path}: the query returned no columns")
                names = [column[0] for column in cursor.description]
                records = cursor.fetchall()
                hints = self._type_hints(connection)
        except sqlite3.Error as error:
            raise ReaderError(f"Cannot read {self._path}: {error}") from error

        duplicates = sorted({name for name in names if names.count(name) > 1})
        if duplicates:
            raise ReaderError(
                f"{self._path}: duplicate column name(s) "
                + ", ".join(f"'{name}'" for name in duplicates)
            )

        values_by_name: dict[str, list[Scalar]] = {}
        for index, name in enumerate(names):
            values: list[Scalar] = []
            for number, record in enumerate(records, start=1):
                value = record[index]
                if isinstance(value, bytes):
                    raise ReaderError(
                        f"{self._path}, row {number}, column '{name}': "
                        "binary values are not supported"
                    )
                values.append(value)
            values_by_name[name] = values

        return build_dataset(self._path, values_by_name, self._column_types, hints)

    def _sql(self) -> str:
        if self._query is not None:
            return self._query
        assert self._table is not None
        return f"SELECT * FROM {_quote(self._table)}"

    def _type_hints(self, connection: sqlite3.Connection) -> dict[str, ColumnType]:
        if self._table is None:
            return {}
        columns = connection.execute(f"PRAGMA table_info({_quote(self._table)})")
        hints: dict[str, ColumnType] = {}
        for _, name, declared, *_ in columns:
            hint = _TYPE_HINTS.get(str(declared).strip().upper())
            if hint is not None:
                hints[name] = hint
        return hints


def _quote(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'
