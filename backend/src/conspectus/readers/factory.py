"""Creates the right reader for a configured source."""

from typing import assert_never

from conspectus.config import JsonSource, Source, SqliteSource
from conspectus.readers.base import Reader
from conspectus.readers.json_reader import JsonReader
from conspectus.readers.sqlite_reader import SqliteReader


def create_reader(source: Source) -> Reader:
    match source:
        case JsonSource():
            return JsonReader(source.path, source.columns)
        case SqliteSource():
            return SqliteReader(
                source.path,
                table=source.table,
                query=source.query,
                column_types=source.columns,
            )
        case _:
            assert_never(source)
